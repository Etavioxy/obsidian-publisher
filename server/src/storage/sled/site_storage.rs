use crate::{error::AppError, models::Site};
use sled::Db;
use std::path::PathBuf;
use uuid::Uuid;
use super::dbs::*;

#[derive(Clone)]
pub struct SiteStorage {
    db: Db,
    user_sites_db: Db,
    site_files_path: PathBuf,
}

impl SiteStorage {
    pub async fn new(db_path: &PathBuf, site_static_files_path: PathBuf) -> Result<Self, AppError> {
        // sled is synchronous; opening here is cheap and acceptable in async fn
        // derive user_sites db path sibling to the sites db (compute before moving db_path into sled::open)
        let user_sites_path = if let Some(parent) = db_path.parent() {
            parent.join(DB_USER_SITES)
        } else {
            db_path.with_file_name(DB_USER_SITES)
        };
        let db = sled::open(&db_path)?;
        let user_sites_db = sled::open(user_sites_path)?;
        std::fs::create_dir_all(&site_static_files_path)?;
        Ok(Self { db, user_sites_db, site_files_path: site_static_files_path })
    }
    pub async fn create(&self, site: Site) -> Result<(), AppError> {
        let key = site.id.as_bytes();
        let value = serde_json::to_vec(&site)?;
        self.db.insert(key, value)?;
        // insert index entry for owner->(date)->site
        let idx_key = format!("user:{}:{}:{}", site.owner_id, site.created_at.to_rfc3339(), site.id);
        self.user_sites_db.insert(idx_key.as_bytes(), site.id.as_bytes())?;
        
        Ok(())
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<Site>, AppError> {
        let key = id.as_bytes();
        if let Some(value) = self.db.get(key)? {
            let site: Site = serde_json::from_slice(&value)?;
            Ok(Some(site))
        } else {
            Ok(None)
        }
    }

    pub async fn get_latest_by_name(&self, name: &str) -> Result<Option<Site>, AppError> {
        // Find the latest site with this name (by created_at)
        let mut latest: Option<Site> = None;
        for result in self.db.iter() {
            let (_, value) = result?;
            let site: Site = serde_json::from_slice(&value)?;
            if site.name == name {
                match &latest {
                    None => latest = Some(site),
                    Some(current) => {
                        if site.created_at > current.created_at {
                            latest = Some(site);
                        }
                    }
                }
            }
        }
        Ok(latest)
    }
    
    /// Get all site versions with the given name, sorted by created_at descending (newest first)
    pub async fn get_all_by_name(&self, name: &str) -> Result<Vec<Site>, AppError> {
        let mut sites = Vec::new();
        for result in self.db.iter() {
            let (_, value) = result?;
            let site: Site = serde_json::from_slice(&value)?;
            if site.name == name {
                sites.push(site);
            }
        }
        // Sort by created_at descending (newest first)
        sites.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(sites)
    }

    pub async fn update(&self, site: Site) -> Result<(), AppError> {
        let key = site.id.as_bytes();
        // load existing site to remove old index if owner/date changed
        if let Some(existing) = self.db.get(key)? {
            let old_site: Site = serde_json::from_slice(&existing)?;
            let old_idx_key = format!("user:{}:{}:{}", old_site.owner_id, old_site.created_at.to_rfc3339(), old_site.id);
            let _ = self.user_sites_db.remove(old_idx_key.as_bytes());
        }
        let value = serde_json::to_vec(&site)?;
        self.db.insert(key, value)?;
        let new_idx_key = format!("user:{}:{}:{}", site.owner_id, site.created_at.to_rfc3339(), site.id);
        self.user_sites_db.insert(new_idx_key.as_bytes(), site.id.as_bytes())?;
        Ok(())
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), AppError> {
        let key = id.as_bytes();
        // remove index entry
        if let Some(value) = self.db.get(key)? {
            let site: Site = serde_json::from_slice(&value)?;
            let idx_key = format!("user:{}:{}:{}", site.owner_id, site.created_at.to_rfc3339(), site.id);
            let _ = self.user_sites_db.remove(idx_key.as_bytes());
        }
        self.db.remove(key)?;
        
        // 删除站点文件目录
        let site_dir = self.site_files_path.join(id.to_string());
        if site_dir.exists() {
            std::fs::remove_dir_all(site_dir)?;
        }
        
        Ok(())
    }

    pub async fn list_all(&self) -> Result<Vec<Site>, AppError> {
        let mut sites = Vec::new();
        
        for result in self.db.iter() {
            let (_, value) = result?;
            let site: Site = serde_json::from_slice(&value)?;
            sites.push(site);
        }
        
        Ok(sites)
    }

    pub async fn list_by_owner(&self, owner_id: Uuid) -> Result<Vec<Site>, AppError> {
        let mut sites = Vec::new();

        let prefix = format!("user:{}:", owner_id);
        for result in self.user_sites_db.scan_prefix(prefix.as_bytes()) {
            let (_k, v) = result?;
            // value is site id bytes
            let site_id = Uuid::from_slice(&v).map_err(|e| AppError::Internal(e.to_string()))?;
            if let Some(site_bytes) = self.db.get(site_id.as_bytes())? {
                let site: Site = serde_json::from_slice(&site_bytes)?;
                sites.push(site);
            }
        }

        // entries are in ascending date order (created_at in the key). Reverse to return newest-first.
        sites.reverse();

        Ok(sites)
    }

    pub fn get_site_files_path(&self, site_id: Uuid) -> PathBuf {
        self.site_files_path.join(site_id.to_string())
    }

    pub fn get_site_files_path_str(&self, site_id: &str) -> PathBuf {
        self.site_files_path.join(site_id)
    }
}
