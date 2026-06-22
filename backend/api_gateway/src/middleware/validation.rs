use actix_web::{
    dev::{ServiceRequest, ServiceResponse, Transform, Service},
    Error, HttpResponse,
    body::EitherBody,
};
use futures_util::future::LocalBoxFuture;
use std::{
    future::{ready, Ready},
    rc::Rc,
};
use serde_json::Value;

pub struct ValidationGuard;

impl ValidationGuard {
    pub fn new() -> Self {
        Self
    }
}

impl<S, B> Transform<S, ServiceRequest> for ValidationGuard
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Transform = ValidationMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(ValidationMiddleware {
            service: Rc::new(service),
        }))
    }
}

pub struct ValidationMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for ValidationMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Transform = ValidationMiddleware<S>;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&self, ctx: &mut S::Context) -> std::task::Poll<Result<(), Self::Error>> {
        self.service.poll_ready(ctx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let content_type = req
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();

        let method = req.method().clone();
        let is_json_body = (method == actix_web::http::Method::POST
            || method == actix_web::http::Method::PUT
            || method == actix_web::http::Method::PATCH)
            && (content_type.contains("application/json"));

        let fut = self.service.call(req);

        Box::pin(async move {
            fut.await.map(|r| r.map_into_left_body())
        })
    }
}
