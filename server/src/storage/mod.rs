#![cfg_attr(debug_assertions, allow(dead_code))]
pub mod site_storage;
pub mod user_storage;

pub use site_storage::*;
pub use user_storage::*;

use crate::config::StorageConfig;
use anyhow::Result;

pub struct Storage {
    pub users: UserStorage,
    pub sites: SiteStorage,
}

impl Storage {
    pub fn new(config: &StorageConfig) -> Result<Self> {
        std::fs::create_dir_all(&config.path)?;
        
        let users_db_path = config.path.join("users.db");
        let sites_db_path = config.path.join("sites.db");
        let sites_files_path = config.path.join("sites");
        
        std::fs::create_dir_all(&sites_files_path)?;
        
        let users = UserStorage::new(users_db_path)?;
        let sites = SiteStorage::new(sites_db_path, sites_files_path)?;
        
        Ok(Self { users, sites })
    }
}