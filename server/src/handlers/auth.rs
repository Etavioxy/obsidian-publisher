use crate::{
    auth::{AuthenticatedUser, AuthService},
    error::AppError,
    models::{LoginRequest, RegisterRequest},
};
use axum::{
    extract::State,
    Json,
};
use std::sync::Arc;

pub async fn register(
    State(auth_service): State<Arc<AuthService>>,
    Json(req): Json<RegisterRequest>,
) -> Result<Json<crate::models::UserResponse>, AppError> {
    let user = auth_service.register(req).await?;
    Ok(Json(user))
}

pub async fn login(
    State(auth_service): State<Arc<AuthService>>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<crate::models::LoginResponse>, AppError> {
    let response = auth_service.login(req).await?;
    Ok(Json(response))
}

pub async fn me(
    State(auth_service): State<Arc<AuthService>>,
    AuthenticatedUser(auth_user): AuthenticatedUser,
) -> Result<Json<crate::models::UserResponse>, AppError> {
    let user = auth_service.user_storage.get(auth_user.id).await?.ok_or(AppError::UserNotFound)?;
    Ok(Json(user.into()))
}