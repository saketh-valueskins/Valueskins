use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpResponse,
    body::{EitherBody, MessageBody},
};
use futures_util::future::LocalBoxFuture;
use std::{
    future::{ready, Ready},
    rc::Rc,
    sync::atomic::{AtomicUsize, Ordering},
    sync::Arc,
    time::Instant,
};

const MAX_CONCURRENT_REQUESTS: usize = 5000;
const REQUEST_TIMEOUT_MS: u64 = 30_000;

pub struct LoadShed {
    active: Arc<AtomicUsize>,
    shedding: Arc<AtomicUsize>,
    start_time: Instant,
}

impl LoadShed {
    fn new() -> Self {
        Self {
            active: Arc::new(AtomicUsize::new(0)),
            shedding: Arc::new(AtomicUsize::new(0)),
            start_time: Instant::now(),
        }
    }

    fn try_acquire(&self) -> bool {
        let current = self.active.load(Ordering::Relaxed);
        if current >= MAX_CONCURRENT_REQUESTS {
            let shed_count = self.shedding.fetch_add(1, Ordering::Relaxed) + 1;
            if shed_count == 1 || shed_count % 1000 == 0 {
                tracing::warn!(
                    active = current,
                    shed_count = shed_count,
                    uptime_ms = self.start_time.elapsed().as_millis(),
                    "Load shedding activated"
                );
            }
            return false;
        }
        self.active.fetch_add(1, Ordering::Relaxed);
        true
    }

    fn release(&self) {
        self.active.fetch_sub(1, Ordering::Relaxed);
    }

    fn active(&self) -> usize {
        self.active.load(Ordering::Relaxed)
    }

    fn shed_count(&self) -> usize {
        self.shedding.load(Ordering::Relaxed)
    }
}

pub struct LoadShedGuard {
    shedder: Arc<LoadShed>,
}

impl LoadShedGuard {
    pub fn new() -> Self {
        Self {
            shedder: Arc::new(LoadShed::new()),
        }
    }

    pub fn shedder(&self) -> Arc<LoadShed> {
        self.shedder.clone()
    }
}

impl<S, B> Transform<S, ServiceRequest> for LoadShedGuard
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Transform = LoadShedMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(LoadShedMiddleware {
            service: Rc::new(service),
            shedder: self.shedder.clone(),
        }))
    }
}

pub struct LoadShedMiddleware<S> {
    service: Rc<S>,
    shedder: Arc<LoadShed>,
}

impl<S, B> Service<ServiceRequest> for LoadShedMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        if !self.shedder.try_acquire() {
            let (req_parts, _payload) = req.into_parts();
            let response = HttpResponse::ServiceUnavailable()
                .insert_header(("Retry-After", "5"))
                .json(serde_json::json!({
                    "error": "Server at capacity — try again shortly",
                    "retry_after_seconds": 5,
                }));
            return Box::pin(async move {
                Ok(ServiceResponse::new(req_parts, response).map_into_right_body())
            });
        }

        let shedder = self.shedder.clone();
        let fut = self.service.call(req);

        Box::pin(async move {
            let result = tokio::time::timeout(
                std::time::Duration::from_millis(REQUEST_TIMEOUT_MS),
                fut,
            )
            .await;

            shedder.release();

            match result {
                Ok(res) => res.map(|r| r.map_into_left_body()),
                Err(_timeout) => {
                    tracing::warn!("Request timed out after {}ms", REQUEST_TIMEOUT_MS);
                    Err(actix_web::error::InternalError::new(
                        "Request timed out",
                        actix_web::http::StatusCode::SERVICE_UNAVAILABLE,
                    )
                    .into())
                }
            }
        })
    }
}
