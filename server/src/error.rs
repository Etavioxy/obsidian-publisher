use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;
use tracing::error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),
    
    #[error("Configuration error: {0}")]
    Config(String),
    
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
    
    #[error("User has active sites, cannot delete account")]
    UserDeletionBlocked,
    
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
            AppError::Jwt(_) => (StatusCode::UNAUTHORIZED, "Token expired or invalid"),
            AppError::UserNotFound => (StatusCode::NOT_FOUND, "User not found"),
            AppError::SiteNotFound => (StatusCode::NOT_FOUND, "Site not found"),
            AppError::UserAlreadyExists => (StatusCode::CONFLICT, "User already exists"),
            AppError::UserDeletionBlocked => (StatusCode::BAD_REQUEST, "User has active sites, cannot delete account"),
            AppError::InvalidInput(_) => (StatusCode::BAD_REQUEST, "Invalid input"),
            AppError::Config(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Configuration error"),
            _ => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error"),
        };

        // Log errors for debugging (especially 500 errors)
        if status == StatusCode::INTERNAL_SERVER_ERROR {
            error!("Internal server error: {:?}", self);
        }

        let body = Json(json!({
            "error": error_message,
            "details": self.to_string()
        }));

        (status, body).into_response()
    }
}

// Conversion helpers for underlying DB errors
impl From<sled::Error> for AppError {
    fn from(e: sled::Error) -> Self {
        AppError::Database(e.to_string())
    }
}

#[cfg(feature = "orm")]
impl From<sea_orm::DbErr> for AppError {
    fn from(e: sea_orm::DbErr) -> Self {
        AppError::Database(e.to_string())
    }
}

// Convert some parsing / uuid errors into AppError::Database for convenience in storage layer
impl From<chrono::ParseError> for AppError {
    fn from(e: chrono::ParseError) -> Self {
        AppError::Database(e.to_string())
    }
}

impl From<uuid::Error> for AppError {
    fn from(e: uuid::Error) -> Self {
        AppError::Database(e.to_string())
    }
}