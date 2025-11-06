use crate::{
    auth::{AuthenticatedUser},
    error::AppError,
    models::{Site, SiteResponse, UpdateSiteRequest},
    storage::Storage,
    config::Config,
    utils::archive,
    services::site_service::SiteService,
};
use axum::{
    extract::{Multipart, Path, State},
    Json,
};
use std::sync::Arc;
use uuid::Uuid;

use tracing::debug;

pub async fn upload_site(
    State((storage, config)): State<(Arc<Storage>, Arc<Config>)>,
    AuthenticatedUser(user): AuthenticatedUser,
    mut multipart: Multipart,
) -> Result<Json<SiteResponse>, AppError> {
    let user_id = user.id;

    // delegate business logic to service layer
    let service = SiteService::new(storage.clone());
    let site = service.process_upload(user_id, multipart).await?;

    let response = SiteResponse::from_site(site, config.server.url().as_ref());
    Ok(Json(response))
}

pub async fn list_all(
    State((storage, config)): State<(Arc<Storage>, Arc<Config>)>,
) -> Result<Json<Vec<SiteResponse>>, AppError> {
    let sites = storage.sites.list_all()?;
    let responses: Vec<SiteResponse> = sites
        .into_iter()
        .map(|site| SiteResponse::from_site(site, config.server.url().as_ref()))
        .collect();

    Ok(Json(responses))
}

pub async fn update_site(
    State((storage, config)): State<(Arc<Storage>, Arc<Config>)>,
    Path(site_id): Path<Uuid>,
    AuthenticatedUser(user): AuthenticatedUser,
    Json(req): Json<UpdateSiteRequest>,
) -> Result<Json<SiteResponse>, AppError> {
    let user_id = user.id;

    let mut site = storage.sites.get(site_id)?.ok_or(AppError::SiteNotFound)?;

    // 检查权限
    if site.owner_id != user_id {
        return Err(AppError::AuthorizationFailed);
    }

    site.description = req.description;
    storage.sites.update(site.clone())?;

    let response = SiteResponse::from_site(site, config.server.url().as_ref());
    Ok(Json(response))
}

pub async fn delete_site(
    State((storage, _config)): State<(Arc<Storage>, Arc<Config>)>,
    Path(site_id): Path<Uuid>,
    AuthenticatedUser(user): AuthenticatedUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = user.id;

    let site = storage.sites.get(site_id)?.ok_or(AppError::SiteNotFound)?;

    // 检查权限
    if site.owner_id != user_id {
        return Err(AppError::AuthorizationFailed);
    }

    storage.sites.delete(site_id)?;

    // 从用户的站点列表中移除
    if let Some(mut user) = storage.users.get(user_id)? {
        user.remove_site(site_id);
        storage.users.update(user)?;
    }

    Ok(Json(serde_json::json!({
        "message": "Site deleted successfully"
    })))
}