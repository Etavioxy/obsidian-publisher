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
use futures_util::TryStreamExt;
use std::sync::Arc;
use std::path::PathBuf;
use uuid::Uuid;

use tracing::debug;

/// Parameters for site upload
#[derive(Debug)]
pub struct SiteUploadParams {
    pub site_id: Uuid,
    pub site_name: String,
    pub user_id: Uuid,
    pub archive_filename: String,
    pub archive_path: PathBuf,
}

/// Validate siteName format
pub fn validate_site_name(name: &str) -> Result<(), AppError> {
    if !name.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
        return Err(AppError::InvalidInput(
            "siteName must contain only alphanumeric characters, hyphens, and underscores".to_string()
        ));
    }
    if name.is_empty() || name.len() > 64 {
        return Err(AppError::InvalidInput(
            "siteName must be between 1 and 64 characters".to_string()
        ));
    }
    Ok(())
}

/// Process site archive extraction - creates both UUID and siteName directories
/// - UUID directory: original content (no replacement)
/// - siteName directory: with path replacement (/sites/{uuid}/ -> /sites/{siteName}/)
/// Returns paths to both directories
pub async fn process_site_archive(
    storage: &Storage,
    params: &SiteUploadParams,
) -> Result<(PathBuf, PathBuf), AppError> {
    let site_id = params.site_id;
    let site_name = &params.site_name;
    let archive_path = &params.archive_path;
    
    // === 1. Create UUID directory with ORIGINAL content (no replacement) ===
    let uuid_dir = storage.sites.get_site_files_path_str(&site_id.to_string());
    
    // Clear existing UUID directory if present
    if uuid_dir.exists() {
        debug!("Removing existing site directory for UUID '{}' at {:?}", site_id, uuid_dir);
        std::fs::remove_dir_all(&uuid_dir)?;
    }
    std::fs::create_dir_all(&uuid_dir)?;
    
    // Extract archive to UUID directory without any replacement
    archive::extract_archive(archive_path, &uuid_dir).await?;
    debug!("Extracted original archive to UUID directory at {:?}", uuid_dir);

    // === 2. Create siteName directory with REPLACED content ===
    let name_dir = storage.sites.get_site_files_path_str(site_name);
    
    // Clear existing siteName directory if present
    if name_dir.exists() {
        debug!("Removing existing site directory for siteName '{}' at {:?}", site_name, name_dir);
        std::fs::remove_dir_all(&name_dir)?;
    }
    
    // Extract with replacement to a temp directory
    // extract_archive_with_replace creates 'original' and 'replaced' subdirs
    let temp_extract_dir = storage.sites.get_site_files_path_str(&format!(".extract_temp_{}", site_id));
    std::fs::create_dir_all(&temp_extract_dir)?;
    
    let pattern = format!("/sites/{}/", site_id);
    let replacement = format!("/sites/{}/", site_name);
    
    archive::extract_archive_with_replace(
        archive_path,
        &temp_extract_dir,
        Some((pattern, replacement)),
    ).await?;
    
    // Move 'replaced' content to name_dir
    let replaced_dir = temp_extract_dir.join("replaced");
    if replaced_dir.exists() {
        std::fs::rename(&replaced_dir, &name_dir)?;
    }
    debug!("Moved replaced content to siteName directory at {:?}", name_dir);
    
    // Cleanup temp extraction directory
    tokio::fs::remove_dir_all(&temp_extract_dir).await.ok();

    // Cleanup archive file
    tokio::fs::remove_file(archive_path).await.ok();

    Ok((uuid_dir, name_dir))
}

/// Recursively copy a directory
fn copy_dir_recursive(src: &PathBuf, dst: &PathBuf) -> Result<(), AppError> {
    std::fs::create_dir_all(dst)?;
    
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        
        if file_type.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    
    Ok(())
}

/// Create or update site record in storage
/// If a site with the same name exists, update it; otherwise create new
pub async fn save_site_record(
    storage: &Storage,
    site_id: Uuid,
    site_name: &str,
    user_id: Uuid,
) -> Result<Site, AppError> {
    let site = {
        // Create new site record
        let site = Site::new(
            site_id,
            user_id,
            site_name.to_string(),
            "Site uploaded from CLI".to_string(),
        );
        storage.sites.create(site.clone()).await?;
        site
    };
    
    Ok(site)
}

pub async fn upload_site(
    State((storage, config)): State<(Arc<Storage>, Arc<Config>)>,
    AuthenticatedUser(user): AuthenticatedUser,
    mut multipart: Multipart,
) -> Result<Json<SiteResponse>, AppError> {
    let user_id = user.id;

    // First pass: collect metadata fields and stream archive to temp location
    let mut site_id: Option<Uuid> = None;
    let mut site_name: Option<String> = None;
    let mut temp_archive_path: Option<PathBuf> = None;
    let mut archive_filename: Option<String> = None;
    
    // Use a temp directory for initial archive storage
    let temp_dir = storage.sites.get_site_files_path_str(".upload_temp");
    std::fs::create_dir_all(&temp_dir)?;
    
    while let Some(field) = multipart.next_field().await
        .map_err(|e| AppError::Internal(e.to_string()))? 
    {
        let name = field.name().unwrap_or("unknown").to_string();
        
        match name.as_ref() {
            "uuid" => {
                let id = field.text().await
                    .map_err(|e| AppError::Internal(e.to_string()))?;
                site_id = Some(Uuid::parse_str(&id)
                    .map_err(|e| AppError::InvalidInput(e.to_string()))?);
            },
            "siteName" => {
                let name_str = field.text().await
                    .map_err(|e| AppError::Internal(e.to_string()))?;
                // Validate siteName
                validate_site_name(&name_str)?;
                site_name = Some(name_str);
            },
            "site" => {
                let file_name = field.file_name().ok_or_else(
                    || AppError::InvalidInput("Uploaded file must have a filename".to_string())
                )?.to_string();
                
                // Stream to temp file instead of reading into memory
                let temp_path = temp_dir.join(&file_name);
                archive::save_archive_field(
                    field.map_err(|e| std::io::Error::other(e.to_string())),
                    &temp_path
                ).await?;
                debug!("Streamed archive to temp path {:?}", temp_path);
                
                temp_archive_path = Some(temp_path);
                archive_filename = Some(file_name);
            },
            _ => ()
        }
    }

    // Validate required fields
    let site_id = site_id.ok_or_else(|| AppError::InvalidInput("Missing site uuid".to_string()))?;
    let site_name = site_name.ok_or_else(|| AppError::InvalidInput("Missing siteName".to_string()))?;
    let temp_archive = temp_archive_path.ok_or_else(|| AppError::InvalidInput("Missing site archive".to_string()))?;
    let filename = archive_filename.ok_or_else(|| AppError::InvalidInput("Missing archive filename".to_string()))?;

    // Check for siteName conflict
    if let Some(existing_site) = storage.sites.get_latest_by_name(&site_name).await? {
        // Allow overwrite if same owner, otherwise conflict
        if existing_site.owner_id != user_id {
            // Cleanup temp file before returning error
            tokio::fs::remove_file(&temp_archive).await.ok();
            return Err(AppError::SiteNameConflict(site_name));
        }
    }

    // Keep archive in temp location - process_site_archive will clean it up
    // Don't move to name_dir because process_site_archive will clear that directory
    debug!("Archive at temp path {:?}", temp_archive);

    // Clean up temp directory if empty (but keep the archive file)
    // temp_dir cleanup will happen after archive is processed

    // Prepare upload parameters
    let params = SiteUploadParams {
        site_id,
        site_name: site_name.clone(),
        user_id,
        archive_filename: filename,
        archive_path: temp_archive.clone(),
    };

    // Process archive and create both directories
    let (uuid_dir, name_dir) = process_site_archive(&storage, &params).await?;
    debug!("Site files created: UUID path {:?}, Name path {:?}", uuid_dir, name_dir);

    // Clean up temp directory
    tokio::fs::remove_dir_all(&temp_dir).await.ok();

    // Save site record
    let site = save_site_record(&storage, site_id, &site_name, user_id).await?;

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

    // 站点索引由 sites 存储维护（不再维护用户记录中的 sites 列表）

    Ok(Json(serde_json::json!({
        "message": "Site deleted successfully"
    })))
}