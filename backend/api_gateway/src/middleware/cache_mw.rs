use actix_web::{
    body::{EitherBody, MessageBody},
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error,
};
use futures_util::future::LocalBoxFuture;
use shared::cache::RedisCache;
use std::{
    future::{ready, Ready},
    rc::Rc,
    sync::Arc,
    time::Duration,
};

const CACHE_TTL: Duration = Duration::from_secs(60);
const CACHE_CONTENT_TYPES: &[&str] = &["application/json", "application/json; charset=utf-8"];

pub struct CacheGuard {
    cache: Arc<RedisCache>,
}

impl CacheGuard {
    pub fn new(cache: RedisCache) -> Self {
        Self {
            cache: Arc::new(cache),
        }
    }
}

impl<S, B> Transform<S, ServiceRequest> for CacheGuard
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Transform = CacheMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(CacheMiddleware {
            service: Rc::new(service),
            cache: self.cache.clone(),
        }))
    }
}

pub struct CacheMiddleware<S> {
    service: Rc<S>,
    cache: Arc<RedisCache>,
}

impl<S, B> Service<ServiceRequest> for CacheMiddleware<S>
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
        if req.method() != actix_web::http::Method::GET {
            let fut = self.service.call(req);
            return Box::pin(async move {
                fut.await.map(|r| r.map_into_left_body())
            });
        }

        let cache_key = format!("get:{}", req.path());
        let cache = self.cache.clone();
        let fut = self.service.call(req);

        Box::pin(async move {
            let result = fut.await;

            if let Ok(ref res) = result {
                let status = res.status();
                if status.is_success() {
                    if let Some(content_type) = res.headers().get("content-type") {
                        if let Ok(ct) = content_type.to_str() {
                            if CACHE_CONTENT_TYPES.iter().any(|t| ct.eq_ignore_ascii_case(t)) {
                                let _ = cache.set(&cache_key, &format!("cached:{}", status.as_u16()), CACHE_TTL).await;
                            }
                        }
                    }
                }
            }

            result.map(|r| r.map_into_left_body())
        })
    }
}
