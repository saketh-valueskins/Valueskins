use actix::prelude::*;
use actix_web::{web, HttpRequest, HttpResponse, Error};
use actix_web_actors::ws;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;

/// Real-time WebSocket for deal/campaign/message sync across devices
#[derive(Clone)]
pub struct RealTimeServer {
    tx: broadcast::Sender<RealtimeMessage>,
}

impl RealTimeServer {
    pub fn new(capacity: usize) -> Self {
        let (tx, _) = broadcast::channel(capacity);
        Self { tx }
    }

    pub async fn broadcast(&self, msg: RealtimeMessage) {
        let _ = self.tx.send(msg);
    }

    pub fn subscribe(&self) -> broadcast::Receiver<RealtimeMessage> {
        self.tx.subscribe()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealtimeMessage {
    pub event_type: EventType,
    pub user_id: i32,
    pub data: serde_json::Value,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventType {
    #[serde(rename = "deal_created")]
    DealCreated,
    #[serde(rename = "deal_updated")]
    DealUpdated,
    #[serde(rename = "campaign_created")]
    CampaignCreated,
    #[serde(rename = "campaign_updated")]
    CampaignUpdated,
    #[serde(rename = "message_sent")]
    MessageSent,
    #[serde(rename = "notification")]
    Notification,
    #[serde(rename = "application_received")]
    ApplicationReceived,
    #[serde(rename = "offer_received")]
    OfferReceived,
}

// ── Internal actor messages ──────────────────────────────────────────

/// Forward a serialized broadcast message to the WebSocket client.
struct ForwardBroadcast(String);

impl Message for ForwardBroadcast {
    type Result = ();
}

// ── WebSocket actor ──────────────────────────────────────────────────

/// WebSocket actor for individual connections
pub struct WsClient {
    user_id: i32,
    #[allow(dead_code)]
    server: Arc<RealTimeServer>,
    rx: Option<broadcast::Receiver<RealtimeMessage>>,
}

impl Actor for WsClient {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        tracing::info!(user_id = self.user_id, "WebSocket connection started");

        // Take ownership of the receiver (broadcast::Receiver is not Clone)
        let mut rx = match self.rx.take() {
            Some(rx) => rx,
            None => return,
        };

        let user_id = self.user_id;
        let addr = ctx.address();

        async move {
            while let Ok(msg) = rx.recv().await {
                if msg.user_id == user_id || msg.user_id == 0 {
                    if let Ok(json_msg) = serde_json::to_string(&msg) {
                        let _ = addr.send(ForwardBroadcast(json_msg)).await;
                    }
                }
            }
        }
        .into_actor(self)
        .wait(ctx);
    }
}

impl Handler<ForwardBroadcast> for WsClient {
    type Result = ();

    fn handle(&mut self, msg: ForwardBroadcast, ctx: &mut Self::Context) {
        ctx.text(msg.0);
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct WsSubscribe {
    pub action: String,
    pub user_id: i32,
    pub room_id: Option<String>,
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsClient {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Text(text)) => {
                tracing::debug!(user_id = self.user_id, text = %text, "WebSocket message received");

                match serde_json::from_str::<WsSubscribe>(&text) {
                    Ok(sub) => {
                        match sub.action.as_str() {
                            "subscribe" => {
                                ctx.text(format!(
                                    r#"{{"status":"subscribed","user_id":{},"room_id":"{}"}}"#,
                                    sub.user_id,
                                    sub.room_id.unwrap_or_default()
                                ));
                            }
                            "ping" => {
                                ctx.text(r#"{"status":"pong"}"#);
                            }
                            _ => {
                                ctx.text(r#"{"error":"unknown_action"}"#);
                            }
                        }
                    }
                    Err(e) => {
                        tracing::warn!(error = %e, "Failed to parse WebSocket message");
                        ctx.text(r#"{"error":"invalid_json"}"#);
                    }
                }
            }
            Ok(ws::Message::Binary(_)) => {
                tracing::warn!("Binary WebSocket message not supported");
                ctx.text(r#"{"error":"binary_not_supported"}"#);
            }
            Ok(ws::Message::Close(_)) => {
                tracing::info!(user_id = self.user_id, "WebSocket connection closed");
                ctx.stop();
            }
            _ => {}
        }
    }
}

/// HTTP handler for WebSocket upgrade
pub async fn ws_handler(
    req: HttpRequest,
    stream: web::Payload,
    server: web::Data<Arc<RealTimeServer>>,
) -> Result<HttpResponse, Error> {
    let user_id = req
        .headers()
        .get("X-User-ID")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or(0);

    let rx = server.subscribe();
    let client = WsClient {
        user_id,
        server: Arc::clone(server.get_ref()),
        rx: Some(rx),
    };

    ws::start(client, &req, stream)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_realtime_server_broadcast() {
        let server = RealTimeServer::new(100);
        let msg = RealtimeMessage {
            event_type: EventType::DealCreated,
            user_id: 1,
            data: serde_json::json!({ "deal_id": 123 }),
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        server.broadcast(msg.clone()).await;

        let mut rx = server.subscribe();
        let received = rx.recv().await.unwrap();
        assert_eq!(received.user_id, msg.user_id);
    }
}
