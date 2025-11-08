use crate::{
    auth::{AuthenticatedUser},
    error::AppError,
    models::{Site, SiteResponse, UpdateSiteRequest},
    storage::Storage,
    config::Config,
    utils::archive,
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

    // 处理上传的文件
    let mut site_id = None;
    
    while let Some(field) = multipart.next_field().await
        .map_err(|e| AppError::Internal(e.to_string()))? 
    {
        let name = field.name().unwrap_or("unknown").to_string();
        
        match (name.as_ref(), site_id) {
            ("uuid", _) => {
                let id = field.text().await
                    .map_err(|e| AppError::Internal(e.to_string()))?;

                site_id = Some(Uuid::parse_str(&id)
                    .map_err(|e| AppError::InvalidInput(e.to_string()))?);
            },
            ("site", None) => {
                return Err(AppError::InvalidInput("reading site archive without uuid ?????".to_string()));
            },
            ("site", Some(site_id)) => {
                let site_dir = storage.sites.get_site_files_path(site_id);
                // 创建站点文件目录
                std::fs::create_dir_all(&site_dir)?;

                let file_name = field.file_name().ok_or_else(
                    || AppError::InvalidInput("Uploaded file must have a filename".to_string())
                )?.to_string();

                let archive_path = site_dir.join(&file_name);
                // 流式写入文件，避免将整个文件读入内存
                archive::save_archive_field(field, &archive_path).await?;
                debug!("Saved archive to {:?}", archive_path);

                // 解压并清理
                archive::extract_archive(&archive_path, &site_dir).await?;
                tokio::fs::remove_file(&archive_path).await?;
            },
            _ => ()
        }
    }

    let site_id = match site_id {
        Some(id) => id,
        None => { return Err(AppError::InvalidInput("Missing site uuid".to_string())); },
    };

    // 创建站点记录
    let site = Site::new(
        site_id,
        user_id,
        "Uploaded Site".to_string(),
        "Site uploaded from CLI".to_string(),
    );

    storage.sites.create(site.clone()).await?;

    // 更新用户的站点列表
    if let Some(mut user) = storage.users.get(user_id).await? {
        user.add_site(site_id);
        storage.users.update(user).await?;
    }

    let response = SiteResponse::from_site(site, config.server.url.as_ref());
    Ok(Json(response))
}

pub async fn list_all(
    State((storage, config)): State<(Arc<Storage>, Arc<Config>)>,
) -> Result<Json<Vec<SiteResponse>>, AppError> {
    let sites = storage.sites.list_all().await?;
    let responses: Vec<SiteResponse> = sites
        .into_iter()
        .map(|site| SiteResponse::from_site(site, config.server.url.as_ref()))
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

    let mut site = storage.sites.get(site_id).await?.ok_or(AppError::SiteNotFound)?;

    // 检查权限
    if site.owner_id != user_id {
        return Err(AppError::AuthorizationFailed);
    }

    site.description = req.description;
    storage.sites.update(site.clone()).await?;

    let response = SiteResponse::from_site(site, config.server.url.as_ref());
    Ok(Json(response))
}

pub async fn delete_site(
    State((storage, _config)): State<(Arc<Storage>, Arc<Config>)>,
    Path(site_id): Path<Uuid>,
    AuthenticatedUser(user): AuthenticatedUser,
) -> Result<Json<serde_json::Value>, AppError> {
    let user_id = user.id;

    let site = storage.sites.get(site_id).await?.ok_or(AppError::SiteNotFound)?;

    // 检查权限
    if site.owner_id != user_id {
        return Err(AppError::AuthorizationFailed);
    }

    storage.sites.delete(site_id).await?;

    // 从用户的站点列表中移除
    if let Some(mut user) = storage.users.get(user_id).await? {
        user.remove_site(site_id);
        storage.users.update(user).await?;
    }

    Ok(Json(serde_json::json!({
        "message": "Site deleted successfully"
    })))
}