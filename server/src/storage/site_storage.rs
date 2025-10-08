use crate::{error::AppError, models::Site};
use sled::Db;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Clone)]
pub struct SiteStorage {
    db: Db,
    files_path: PathBuf,
}

impl SiteStorage {
    pub fn new(db_path: PathBuf, files_path: PathBuf) -> Result<Self, AppError> {
        let db = sled::open(db_path)?;
        std::fs::create_dir_all(&files_path)?;
        Ok(Self { db, files_path })
    }

    pub fn create(&self, site: Site) -> Result<(), AppError> {
        let key = site.id.as_bytes();
        let value = serde_json::to_vec(&site)?;
        self.db.insert(key, value)?;
        
        // 创建站点文件目录
        let site_dir = self.files_path.join(site.id.to_string());
        std::fs::create_dir_all(site_dir)?;
        
        Ok(())
    }

    pub fn get(&self, id: Uuid) -> Result<Option<Site>, AppError> {
        let key = id.as_bytes();
        if let Some(value) = self.db.get(key)? {
            let site: Site = serde_json::from_slice(&value)?;
            Ok(Some(site))
        } else {
            Ok(None)
        }
    }

    pub fn update(&self, site: Site) -> Result<(), AppError> {
        let key = site.id.as_bytes();
        let value = serde_json::to_vec(&site)?;
        self.db.insert(key, value)?;
        Ok(())
    }

    pub fn delete(&self, id: Uuid) -> Result<(), AppError> {
        let key = id.as_bytes();
        self.db.remove(key)?;
        
        // 删除站点文件目录
        let site_dir = self.files_path.join(id.to_string());
        if site_dir.exists() {
            std::fs::remove_dir_all(site_dir)?;
        }
        
        Ok(())
    }

    pub fn list_all(&self) -> Result<Vec<Site>, AppError> {
        let mut sites = Vec::new();
        
        for result in self.db.iter() {
            let (_, value) = result?;
            let site: Site = serde_json::from_slice(&value)?;
            sites.push(site);
        }
        
        Ok(sites)
    }

    pub fn list_by_owner(&self, owner_id: Uuid) -> Result<Vec<Site>, AppError> {
        let mut sites = Vec::new();
        
        for result in self.db.iter() {
            let (_, value) = result?;
            let site: Site = serde_json::from_slice(&value)?;
            if site.owner_id == owner_id {
                sites.push(site);
            }
        }
        
        Ok(sites)
    }

    pub fn get_site_files_path(&self, site_id: Uuid) -> PathBuf {
        self.files_path.join(site_id.to_string())
    }
}