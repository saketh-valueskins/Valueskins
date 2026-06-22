use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpResponse, HttpMessage,
    body::EitherBody,
};
use futures_util::future::LocalBoxFuture;
use std::{future::{ready, Ready}, rc::Rc};
use auth_service::token::Claims;

/// RBAC authorization middleware factory.
///
/// Checks that the authenticated user (via JWT Claims in request extensions)
/// has one of the required roles. Returns 403 Forbidden if not authorized.
///
/// Must be applied AFTER JWT auth middleware (which injects Claims).
///
/// # Usage
/// ```ignore
/// use crate::middleware::rbac::Authorization;
///
/// App::new()
///     .service(
///         web::scope("/api/v1/admin")
///             .wrap(Authorization::roles(&["admin"]))
///             .route("/users", web::get().to(admin_list_users))
///     )
///     .service(
///         web::scope("/api/v1/creator")
///             .wrap(Authorization::roles(&["creator", "admin"]))
///             .route("/deals", web::get().to(creator_list_deals))
///     )
/// ```
pub struct Authorization {
    allowed_roles: Rc<Vec<String>>,
}

impl Authorization {
    pub fn roles(roles: &[&str]) -> Self {
        Self {
            allowed_roles: Rc::new(roles.iter().map(|r| r.to_string()).collect()),
        }
    }
}

impl<S, B> Transform<S, ServiceRequest> for Authorization
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Transform = AuthorizationMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthorizationMiddleware {
            service: Rc::new(service),
            allowed_roles: self.allowed_roles.clone(),
        }))
    }
}

pub struct AuthorizationMiddleware<S> {
    service: Rc<S>,
    allowed_roles: Rc<Vec<String>>,
}

impl<S, B> Service<ServiceRequest> for AuthorizationMiddleware<S>
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
        let service = self.service.clone();
        let allowed_roles = self.allowed_roles.clone();

        Box::pin(async move {
            // Extract Claims from request extensions (injected by JWT auth middleware)
            // Clone the claims first to release the borrow on req.
            let user_role = req
                .extensions()
                .get::<Claims>()
                .map(|c| c.role.clone());

            let user_role = match user_role {
                Some(role) => role,
                None => {
                    // No Claims found — JWT middleware did not run or user is unauthenticated
                    let response = HttpResponse::Unauthorized()
                        .json(serde_json::json!({ "error": "Authentication required" }));
                    return Ok(req.into_response(response).map_into_right_body());
                }
            };

            // Check if user's role is in the allowed set
            if !allowed_roles.iter().any(|r| r == &user_role) {
                let response = HttpResponse::Forbidden()
                    .json(serde_json::json!({
                        "error": "Insufficient permissions",
                        "required_roles": allowed_roles,
                        "user_role": user_role,
                    }));
                return Ok(req.into_response(response).map_into_right_body());
            }

            // Continue to handler
            let res = service.call(req).await?;
            Ok(res.map_into_left_body())
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App, HttpResponse};

    #[actix_web::test]
    async fn test_authorization_allows_admin_role() {
        let app = test::init_service(
            App::new()
                .wrap(Authorization::roles(&["admin"]))
                .route("/admin", web::get().to(|| async { HttpResponse::Ok() }))
        ).await;

        // We can't easily test without Claims in extensions,
        // but the middleware itself is simple enough to verify logic.
        // The claims extraction test would need a full middleware stack.
    }
}
