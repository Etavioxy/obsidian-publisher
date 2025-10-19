use crate::{auth::token::TokenService, error::AppError};
use axum::{
    extract::{Request, State},
    http::{header::AUTHORIZATION},
    middleware::Next,
    response::Response,
};
use serde::Serialize;
use std::sync::Arc;
use uuid::Uuid;

// 用于在扩展中传递的用户信息
#[derive(Debug, Clone, Serialize)]
pub struct AuthUser {
    pub id: Uuid,
    pub username: String,
}

pub async fn auth_middleware(
    State(token_service): State<Arc<TokenService>>,
    mut request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|header| header.to_str().ok())
        .ok_or(AppError::AuthenticationFailed)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::AuthenticationFailed)?;

    let claims = token_service.verify_token(token)?;
    
    // 解析用户ID
    let user_id = claims.sub.parse::<Uuid>()
        .map_err(|_| AppError::InvalidInput("Invalid user ID in token".to_string()))?;
    
    // 将用户信息添加到请求扩展中
    let auth_user = AuthUser {
        id: user_id,
        username: claims.username,
    };
    request.extensions_mut().insert(auth_user);
    
    Ok(next.run(request).await)
}

// 辅助函数，从请求中提取用户信息
#[allow(dead_code)]
pub fn extract_auth_user(request: &Request) -> Result<&AuthUser, AppError> {
    request
        .extensions()
        .get::<AuthUser>()
        .ok_or(AppError::AuthorizationFailed)
}