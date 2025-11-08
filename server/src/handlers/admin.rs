use crate::{
    error::AppError,
    models::{SiteResponse, User},
    storage::Storage,
    config::Config,
};
use axum::{
    extract::{State, Query},
    Json,
};
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Debug, Serialize)]
pub struct StorageUsage {
    site_id: String,
    path: String,
    size_bytes: u64,
    file_count: u64,
}

#[derive(Debug, Serialize)]
pub struct StorageSummary {
    total_bytes: u64,
    total_sites: usize,
    per_site: Vec<StorageUsage>,
}

#[derive(Debug, Serialize)]
pub struct AdminReport {
    sites: Vec<SiteResponse>,
    users: Vec<User>,
    config: Config,
}

pub async fn admin_all(
    State((storage, config)): State<(Arc<Storage>, Arc<Config>)>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<AdminReport>, AppError> {
    // require ?key=<jwt_secret> on the request URL for admin access
    match params.get("key") {
        Some(k) if k == &config.server.jwt_secret => {}
        _ => return Err(AppError::AuthorizationFailed),
    }

    let sites = storage.sites.list_all().await?;
    let users = storage.users.list_all().await?;

    let report = AdminReport {
        sites: sites
            .into_iter()
            .map(|site| SiteResponse::from_site(site, config.server.url.as_ref()))
            .collect(),
        users,
        config: (*config).clone(),
    };

    Ok(Json(report))
}

#[derive(Debug, Serialize)]
pub struct SitesMismatchReport {
    // directories present on disk but missing from DB
    pub orphan_site_dirs: Vec<String>,
    // DB records whose site directory is missing
    pub missing_site_dirs: Vec<String>,
    // all DB site ids
    pub db_site_ids: Vec<String>,
    // all site dir names on disk
    pub disk_site_dirs: Vec<String>,
}

// GET /api/admin/sites - returns mismatch report between DB and site folders
pub async fn admin_sites(
    State((storage, config)): State<(Arc<Storage>, Arc<Config>)>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<SitesMismatchReport>, AppError> {
    match params.get("key") {
        Some(k) if k == &config.server.jwt_secret => {}
        _ => return Err(AppError::AuthorizationFailed),
    }

    let sites = storage.sites.list_all().await?;
    let db_site_ids: Vec<String> = sites.iter().map(|s| s.id.to_string()).collect();

    let sites_base: PathBuf = config.storage.path.join("sites");

    let mut dir_names_on_disk: Vec<String> = Vec::new();
    if sites_base.exists() {
        for entry in std::fs::read_dir(&sites_base)? {
            let entry = entry?;
            if entry.file_type()?.is_dir() {
                let name = entry.file_name().to_string_lossy().to_string();
                dir_names_on_disk.push(name);
            }
        }
    }

    let orphan_site_dirs: Vec<String> = dir_names_on_disk
        .iter()
        .filter(|d| !db_site_ids.contains(d))
        .cloned()
        .collect();

    let missing_site_dirs: Vec<String> = db_site_ids
        .iter()
        .filter(|id| !dir_names_on_disk.contains(id))
        .cloned()
        .collect();

    let report = SitesMismatchReport {
        orphan_site_dirs,
        missing_site_dirs,
        db_site_ids,
        disk_site_dirs: dir_names_on_disk,
    };

    Ok(Json(report))
}

// GET /api/admin/storage - returns storage usage summary
pub async fn admin_storage(
    State((_storage, config)): State<(Arc<Storage>, Arc<Config>)>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<StorageSummary>, AppError> {
    match params.get("key") {
        Some(k) if k == &config.server.jwt_secret => {}
        _ => return Err(AppError::AuthorizationFailed),
    }

    let sites_base: PathBuf = config.storage.path.join("sites");

    let mut per_site: Vec<StorageUsage> = Vec::new();
    let mut total_bytes: u64 = 0;

    if sites_base.exists() {
        for entry in std::fs::read_dir(&sites_base)? {
            let entry = entry?;
            if entry.file_type()?.is_dir() {
                let name = entry.file_name().to_string_lossy().to_string();
                let path = sites_base.join(&name);
                let (size, count) = dir_size_and_count(&path)?;
                total_bytes += size;
                per_site.push(StorageUsage {
                    site_id: name,
                    path: path.to_string_lossy().to_string(),
                    size_bytes: size,
                    file_count: count,
                });
            }
        }
    }

    let storage_summary = StorageSummary {
        total_bytes,
        total_sites: per_site.len(),
        per_site,
    };

    Ok(Json(storage_summary))
}

// recursively compute directory size and file count
fn dir_size_and_count(path: &PathBuf) -> Result<(u64, u64), AppError> {
    let mut total: u64 = 0;
    let mut count: u64 = 0;

    let mut stack = vec![path.clone()];
    while let Some(p) = stack.pop() {
        for entry in std::fs::read_dir(&p)? {
            let entry = entry?;
            let ft = entry.file_type()?;
            let p = entry.path();
            if ft.is_dir() {
                stack.push(p);
            } else if ft.is_file() {
                let meta = entry.metadata()?;
                total += meta.len();
                count += 1;
            }
        }
    }

    Ok((total, count))
}