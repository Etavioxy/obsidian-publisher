use crate::{auth::middleware::AuthUser, error::AppError};
use axum::{
    extract::{FromRequestParts},
    http::request::Parts,
};

// 自定义提取器，用于从请求中获取认证用户信息
#[derive(Debug, Clone)]
pub struct AuthenticatedUser(pub AuthUser);

impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_user = parts
            .extensions
            .get::<AuthUser>()
            .ok_or(AppError::AuthorizationFailed)?;
        
        Ok(AuthenticatedUser(auth_user.clone()))
    }
}