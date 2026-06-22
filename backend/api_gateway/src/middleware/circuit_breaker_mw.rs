use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpResponse,
    body::EitherBody,
};
use futures_util::future::LocalBoxFuture;
use shared::circuit_breaker::{CircuitBreaker, CircuitState};
use std::{
    future::{ready, Ready},
    rc::Rc,
    sync::Arc,
};

pub struct CircuitGuard {
    breaker: Arc<CircuitBreaker>,
}

impl CircuitGuard {
    pub fn new(breaker: CircuitBreaker) -> Self {
        Self {
            breaker: Arc::new(breaker),
        }
    }
}

impl<S, B> Transform<S, ServiceRequest> for CircuitGuard
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Transform = CircuitMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(CircuitMiddleware {
            service: Rc::new(service),
            breaker: self.breaker.clone(),
        }))
    }
}

pub struct CircuitMiddleware<S> {
    service: Rc<S>,
    breaker: Arc<CircuitBreaker>,
}

impl<S, B> Service<ServiceRequest> for CircuitMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let state = self.breaker.state();

        if state == CircuitState::Open {
            let metrics = self.breaker.metrics();
            tracing::warn!(
                circuit = "database",
                failures = metrics.failures,
                state = "open",
                "Circuit breaker open — rejecting request"
            );

            let (req, _payload) = req.into_parts();
            let response = HttpResponse::ServiceUnavailable()
                .insert_header(("X-Circuit-Status", "open"))
                .json(serde_json::json!({
                    "error": "Service temporarily unavailable",
                    "circuit": "database",
                    "retry_after_seconds": 60,
                }));
            return Box::pin(async move {
                Ok(ServiceResponse::new(req, response).map_into_right_body())
            });
        }

        let breaker = self.breaker.clone();
        let fut = self.service.call(req);

        Box::pin(async move {
            let result = fut.await;

            match &result {
                Ok(res) => {
                    if res.status().is_server_error() {
                        breaker.record_failure().await;
                    } else {
                        breaker.record_success().await;
                    }
                }
                Err(_) => {
                    breaker.record_failure().await;
                }
            }

            result.map(|r| r.map_into_left_body())
        })
    }
}

pub fn create_database_breaker() -> CircuitBreaker {
    CircuitBreaker::new("database")
}
