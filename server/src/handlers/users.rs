use crate::{
    auth::AuthenticatedUser,
    error::AppError,
    models::{SiteResponse, UserResponse},
    storage::Storage,
    config::Config,
};
use axum::{
    extract::State,
    Json,
};
use std::sync::Arc;
use uuid::Uuid;

/// 获取当前用户信息 (已在 auth.rs 中实现了 /auth/me)
/// 这里提供额外的用户管理功能

/// 获取用户的详细信息（包括站点列表）
pub async fn get_user_profile(
    State(storage): State<Arc<Storage>>,
    AuthenticatedUser(user): AuthenticatedUser,
) -> Result<Json<UserProfileResponse>, AppError> {
    let user_id = user.id;

    let user = storage.users.get(user_id).await?.ok_or(AppError::UserNotFound)?;
    let sites = storage.sites.list_by_owner(user_id).await?;
    
    let site_responses: Vec<SiteResponse> = sites
        .into_iter()
        .map(|site| SiteResponse::from_site(site, "http://localhost:8080"))
        .collect();

    let profile = UserProfileResponse {
        user: UserResponse::from(user),
        sites: site_responses.clone(),
        total_sites: site_responses.len(),
    };

    Ok(Json(profile))
}

/// 更新用户信息
pub async fn update_user_profile(
    State(storage): State<Arc<Storage>>,
    AuthenticatedUser(user): AuthenticatedUser,
    Json(req): Json<UpdateUserRequest>,
) -> Result<Json<UserResponse>, AppError> {
    let user_id = user.id;

    let mut user = storage.users.get(user_id).await?.ok_or(AppError::UserNotFound)?;

    // 更新用户名（如果提供且不为空）
    if let Some(username) = req.username {
        if !username.trim().is_empty() {
            // 检查用户名是否已被其他用户使用
            if let Some(existing_user) = storage.users.get_by_username(&username).await? {
                if existing_user.id != user_id {
                    return Err(AppError::InvalidInput("Username already taken".to_string()));
                }
            }
            user.username = username;
        }
    }

    storage.users.update(user.clone()).await?;
    Ok(Json(UserResponse::from(user)))
}

/// 删除用户账户
pub async fn delete_user_account(
    State(storage): State<Arc<Storage>>,
    AuthenticatedUser(user): AuthenticatedUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = user.id;

    let user = storage.users.get(user_id).await?.ok_or(AppError::UserNotFound)?;

    // 用户有站点
    if user.sites.len() > 0 {
        return Err(AppError::UserDeletionBlocked);
    }

    // 删除用户
    storage.users.delete(user_id).await?;

    Ok(Json(serde_json::json!({
        "message": "User account deleted successfully"
    })))
}

/// 获取用户统计信息
pub async fn get_user_stats(
    State((storage, config)): State<(Arc<Storage>, Arc<Config>)>,
    AuthenticatedUser(user): AuthenticatedUser,
) -> Result<Json<UserStatsResponse>, AppError> {
    let user_id = user.id;

    let user = storage.users.get(user_id).await?.ok_or(AppError::UserNotFound)?;
    let sites = storage.sites.list_by_owner(user_id).await?;

    let site_responses: Vec<SiteResponse> = sites
        .into_iter()
        .map(|site| SiteResponse::from_site(site, config.server.url.as_ref()))
        .collect();

    let stats = UserStatsResponse {
        user_id: user.id,
        username: user.username,
        total_sites: site_responses.len(),
        account_created: user.created_at,
        sites: site_responses,
    };

    Ok(Json(stats))
}

// 辅助结构体
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize)]
pub struct UserProfileResponse {
    pub user: UserResponse,
    pub sites: Vec<SiteResponse>,
    pub total_sites: usize,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub username: Option<String>,
    // 可以添加其他可更新的字段
    // pub email: Option<String>,
    // pub display_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UserStatsResponse {
    pub user_id: Uuid,
    pub username: String,
    pub total_sites: usize,
    pub account_created: DateTime<Utc>,
    pub sites: Vec<SiteResponse>,
}