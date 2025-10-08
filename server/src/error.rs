use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sled::Error),
    
    #[error("JWT error: {0}")]
    Jwt(#[from] jsonwebtoken::errors::Error),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("Authentication failed")]
    AuthenticationFailed,
    
    #[error("Authorization failed")]
    AuthorizationFailed,
    
    #[error("User not found")]
    UserNotFound,
    
    #[error("Site not found")]
    SiteNotFound,
    
    #[error("User already exists")]
    UserAlreadyExists,
    
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    
    #[error("Internal server error: {0}")]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::AuthenticationFailed => (StatusCode::UNAUTHORIZED, "Authentication failed"),
            AppError::AuthorizationFailed => (StatusCode::FORBIDDEN, "Authorization failed"),
            AppError::UserNotFound => (StatusCode::NOT_FOUND, "User not found"),
            AppError::SiteNotFound => (StatusCode::NOT_FOUND, "Site not found"),
            AppError::UserAlreadyExists => (StatusCode::CONFLICT, "User already exists"),
            AppError::InvalidInput(_) => (StatusCode::BAD_REQUEST, "Invalid input"),
            _ => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error"),
        };

        let body = Json(json!({
            "error": error_message,
            "details": self.to_string()
        }));

        (status, body).into_response()
    }
}