use crate::{
    auth::{AuthenticatedUser},
    error::AppError,
    models::{Site, SiteResponse, UpdateSiteRequest},
    storage::Storage,
};
use axum::{
    extract::{Multipart, Path, State},
    Json,
};
use crate::config::Config;
use std::sync::Arc;
use uuid::Uuid;

pub async fn upload_site(
    State((storage, config)): State<(Arc<Storage>, Arc<Config>)>,
    AuthenticatedUser(user): AuthenticatedUser,
    mut multipart: Multipart,
) -> Result<Json<SiteResponse>, AppError> {
    let user_id = user.id;

    // 创建站点记录
    let site = Site::new(
        user_id,
        "Uploaded Site".to_string(),
        "Site uploaded from CLI".to_string(),
    );
    let site_id = site.id;

    storage.sites.create(site.clone())?;

    // 更新用户的站点列表
    if let Some(mut user) = storage.users.get(user_id)? {
        user.add_site(site_id);
        storage.users.update(user)?;
    }

    // 处理上传的文件
    let site_dir = storage.sites.get_site_files_path(site_id);
    
    while let Some(field) = multipart.next_field().await
        .map_err(|e| AppError::Internal(e.to_string()))? 
    {
        let name = field.name().unwrap_or("unknown").to_string();
        
        if name == "site" {
            let file_name = field.file_name().unwrap_or("upload").to_string();
            let data = field.bytes().await
                .map_err(|e| AppError::Internal(e.to_string()))?;

            // 保存并解压文件
            let archive_path = site_dir.join(&file_name);
            tokio::fs::write(&archive_path, &data).await?;

            extract_archive(&archive_path, &site_dir).await?;
            tokio::fs::remove_file(&archive_path).await?;
        }
    }

    let response = SiteResponse::from_site(site, config.server.url().as_ref());
    Ok(Json(response))
}

pub async fn list_sites(
    State((storage, config)): State<(Arc<Storage>, Arc<Config>)>,
    AuthenticatedUser(user): AuthenticatedUser,
) -> Result<Json<Vec<SiteResponse>>, AppError> {
    let user_id = user.id;

    let sites = storage.sites.list_by_owner(user_id)?;
    let responses: Vec<SiteResponse> = sites
        .into_iter()
        .map(|site| SiteResponse::from_site(site, config.server.url().as_ref()))
        .collect();

    Ok(Json(responses))
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
    State((storage, config)): State<(Arc<Storage>, Arc<Config>)>,
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

async fn extract_archive(archive_path: &std::path::Path, extract_to: &std::path::Path) -> Result<(), AppError> {
    let file_name = archive_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    if file_name.ends_with(".tar.gz") || file_name.ends_with(".tgz") {
        extract_tar_gz(archive_path, extract_to).await
    } else if file_name.ends_with(".zip") {
        extract_zip(archive_path, extract_to).await
    } else {
        Err(AppError::InvalidInput("Unsupported archive format".to_string()))
    }
}

async fn extract_tar_gz(archive_path: &std::path::Path, extract_to: &std::path::Path) -> Result<(), AppError> {
    use flate2::read::GzDecoder;
    use std::fs::File;
    use tar::Archive;

    let file = File::open(archive_path)?;
    let gz = GzDecoder::new(file);
    let mut archive = Archive::new(gz);
    
    archive.unpack(extract_to)
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

async fn extract_zip(archive_path: &std::path::Path, extract_to: &std::path::Path) -> Result<(), AppError> {
    use std::fs::File;
    use zip::ZipArchive;

    let file = File::open(archive_path)?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| AppError::Internal(e.to_string()))?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let outpath = extract_to.join(file.name());

        if file.name().ends_with('/') {
            tokio::fs::create_dir_all(&outpath).await?;
        } else {
            if let Some(parent) = outpath.parent() {
                tokio::fs::create_dir_all(parent).await?;
            }
            let mut outfile = std::fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| AppError::Internal(e.to_string()))?;
        }
    }
    Ok(())
}


use crate::models::{User, UserResponse};

// __yixuan_note__ debug
pub async fn admin_all(
    State((storage, config)): State<(Arc<Storage>, Arc<Config>)>,
) -> Result<Json<(Vec<SiteResponse>, Vec<User>, Config)>, AppError> {
    let sites = storage.sites.list_all()?;
    let users = storage.users.list_all()?;

    Ok(Json((
    sites
        .into_iter()
        .map(|site| SiteResponse::from_site(site, config.server.url().as_ref()))
        .collect(),
    users
//        .into_iter()
//        .map(|user| user.into())
//        .collect()
        ,
    (*config).clone()
    )))
}