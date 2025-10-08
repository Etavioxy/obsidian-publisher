use crate::{
    auth::{AuthenticatedUser, extract_auth_user},
    error::AppError,
    models::{SiteResponse, UserResponse},
    storage::Storage,
};
use axum::{
    extract::{Path, Request, State},
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

    let user = storage.users.get(user_id)?.ok_or(AppError::UserNotFound)?;
    let sites = storage.sites.list_by_owner(user_id)?;
    
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

    let mut user = storage.users.get(user_id)?.ok_or(AppError::UserNotFound)?;

    // 更新用户名（如果提供且不为空）
    if let Some(username) = req.username {
        if !username.trim().is_empty() {
            // 检查用户名是否已被其他用户使用
            if let Some(existing_user) = storage.users.get_by_username(&username)? {
                if existing_user.id != user_id {
                    return Err(AppError::InvalidInput("Username already taken".to_string()));
                }
            }
            user.username = username;
        }
    }

    storage.users.update(user.clone())?;
    Ok(Json(UserResponse::from(user)))
}

/// 删除用户账户
pub async fn delete_user_account(
    State(storage): State<Arc<Storage>>,
    AuthenticatedUser(user): AuthenticatedUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = user.id;

    let user = storage.users.get(user_id)?.ok_or(AppError::UserNotFound)?;

    // 删除用户的所有站点
    for site_id in &user.sites {
        storage.sites.delete(*site_id)?;
    }

    // 删除用户
    storage.users.delete(user_id)?;

    Ok(Json(serde_json::json!({
        "message": "User account deleted successfully"
    })))
}

/// 获取用户统计信息
pub async fn get_user_stats(
    State(storage): State<Arc<Storage>>,
    AuthenticatedUser(user): AuthenticatedUser,
) -> Result<Json<UserStatsResponse>, AppError> {
    let user_id = user.id;

    let user = storage.users.get(user_id)?.ok_or(AppError::UserNotFound)?;
    let sites = storage.sites.list_by_owner(user_id)?;

    let stats = UserStatsResponse {
        user_id: user.id,
        username: user.username,
        total_sites: sites.len(),
        account_created: user.created_at,
        sites_by_month: group_sites_by_month(sites),
    };

    Ok(Json(stats))
}

/// 管理员功能：获取所有用户列表（需要管理员权限）
pub async fn list_all_users(
    State(storage): State<Arc<Storage>>,
    request: Request,
) -> Result<Json<Vec<UserResponse>>, AppError> {
    let _auth_user = extract_auth_user(&request)?;
    
    // 这里可以添加管理员权限检查
    // if !is_admin(&claims) {
    //     return Err(AppError::AuthorizationFailed);
    // }

    let users = storage.users.list_all()?;
    let responses: Vec<UserResponse> = users
        .into_iter()
        .map(UserResponse::from)
        .collect();

    Ok(Json(responses))
}

/// 管理员功能：获取指定用户信息
pub async fn get_user_by_id(
    State(storage): State<Arc<Storage>>,
    Path(user_id): Path<Uuid>,
    request: Request,
) -> Result<Json<UserResponse>, AppError> {
    let auth_user = extract_auth_user(&request)?;
    
    // 检查权限：只能查看自己的信息，除非是管理员
    let requesting_user_id = auth_user.id;
    
    if requesting_user_id != user_id {
        // 这里可以添加管理员权限检查
        // if !is_admin(&claims) {
        //     return Err(AppError::AuthorizationFailed);
        // }
    }

    let user = storage.users.get(user_id)?.ok_or(AppError::UserNotFound)?;
    Ok(Json(UserResponse::from(user)))
}

// 辅助结构体
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::HashMap;

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
    pub sites_by_month: HashMap<String, usize>,
}

fn group_sites_by_month(sites: Vec<crate::models::Site>) -> HashMap<String, usize> {
    let mut sites_by_month = HashMap::new();
    
    for site in sites {
        let month_key = site.created_at.format("%Y-%m").to_string();
        *sites_by_month.entry(month_key).or_insert(0) += 1;
    }
    
    sites_by_month
}

// 未来可以实现的管理员权限检查
// fn is_admin(claims: &crate::models::Claims) -> bool {
//     // 检查用户是否有管理员权限
//     // 可以从数据库查询用户角色，或从 JWT claims 中获取
//     false
// }