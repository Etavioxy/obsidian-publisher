#![cfg_attr(debug_assertions, allow(dead_code))]

use crate::config::{StorageConfig, StorageEntry};
use anyhow::Result;
use crate::error::AppError;

// Two implementations live side-by-side. Default feature is `sled` so existing behavior
// is preserved. When compiled with `--features orm` the ORM implementation will be used.

#[cfg(feature = "sled")]
pub mod sled;

#[cfg(feature = "orm")]
pub mod orm;

// Debug wrapper: when enabled build both sled and orm implementations and compare results
#[cfg(feature = "debug_sled_and_orm")]
pub mod debug;

#[cfg(all(feature = "sled", not(feature = "debug_sled_and_orm")))]
pub use sled::*;

#[cfg(all(feature = "orm", not(feature = "debug_sled_and_orm")))]
pub use orm::*;

#[cfg(feature = "debug_sled_and_orm")]
pub use debug::*;

pub struct Storage {
    pub users: UserStorage,
    pub sites: SiteStorage,
}

impl Storage {
    pub async fn new(config: &StorageConfig) -> Result<Self> {
        std::fs::create_dir_all(&config.sites.path)?;

        for entry in &config.db {
            if let Some(p) = &entry.path {
                std::fs::create_dir_all(p)?;
            }
        }

        let site_files_path = config.sites.path.clone();

        #[cfg(all(feature = "sled", not(feature = "debug_sled_and_orm")))]
        {
            let sled_entry = config.first_db_with_backend(&["sled"])
                .ok_or_else(|| AppError::Config("Missing 'sled' backend in storage.db config".to_string()))?;
            let sled_db_path = sled_entry.path.as_ref().unwrap();
            let sled_users = sled::UserStorage::new(sled_db_path).await?;
            let sled_sites = sled::SiteStorage::new(sled_db_path, site_files_path.clone()).await?;
            Ok(Self { users: sled_users, sites: sled_sites })
        }

        #[cfg(all(feature = "orm", not(feature = "debug_sled_and_orm")))]
        {
            let orm_entry = config.first_db_with_backend(&["postgres", "sqlite"])
                .ok_or_else(|| AppError::Config("Missing ORM-compatible backend (postgres or sqlite) in storage.db config".to_string()))?;
            let orm_database_url = &get_database_url(orm_entry);
            let orm_users = orm::UserStorage::new(orm_database_url).await?;
            let orm_sites = orm::SiteStorage::new(orm_database_url, site_files_path.clone()).await?;
            Ok(Self { users: orm_users, sites: orm_sites })
        }


        #[cfg(feature = "debug_sled_and_orm")]
        {
            let sled_entry = config.first_db_with_backend(&["sled"])
                .ok_or_else(|| AppError::Config("Missing 'sled' backend in storage.db config".to_string()))?;
            let sled_db_path = sled_entry.path.as_ref().unwrap();
            let sled_users = sled::UserStorage::new(sled_db_path).await?;
            let sled_sites = sled::SiteStorage::new(sled_db_path, site_files_path.clone()).await?;
            let orm_entry = config.first_db_with_backend(&["postgres", "sqlite"])
                .ok_or_else(|| AppError::Config("Missing ORM-compatible backend (postgres or sqlite) in storage.db config".to_string()))?;
            let orm_database_url = &get_database_url(orm_entry);
            let orm_users = orm::UserStorage::new(orm_database_url).await?;
            let orm_sites = orm::SiteStorage::new(orm_database_url, site_files_path.clone()).await?;
            // Each underlying implementation exposes the same public async constructors.
            let users = UserStorage::new(sled_users, orm_users).await?;
            let sites = SiteStorage::new(sled_sites, orm_sites).await?;
            Ok(Self { users, sites })
        }

    }
}

pub fn get_database_url(db_entry: &StorageEntry) -> String {
    match db_entry.backend.as_str() {
        "postgres" => {
            // For postgres we expect a connection string in PG_DATABASE_URL
            let url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
                // Fallback to empty string if not set; caller should handle this appropriately
                String::new()
            });
            if url.starts_with("postgres") {
                tracing::warn!("DATABASE_URL environment variable not set for postgres backend. {}", url);
            }
            url
        }
        "sqlite" => {
            let path = db_entry.path.as_ref().expect("sqlite backend requires a path");
            let p = path.to_string_lossy().replace('\\', "/");
            format!("sqlite:{}/db.sqlite?mode=rwc", p)
        }
        "sled" => {
            // sled is not a DB URL; return the filesystem path as a string
            let path = db_entry.path.as_ref().expect("sled backend requires a path");
            path.to_string_lossy().to_string()
        }
        other => {
            // Unknown backend: return empty string
            tracing::warn!("get_database_url: unknown backend '{}', returning empty string", other);
            String::new()
        }
    }
}