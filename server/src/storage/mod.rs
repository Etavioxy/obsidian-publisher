#![cfg_attr(debug_assertions, allow(dead_code))]

use crate::config::StorageConfig;
use anyhow::Result;

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
        std::fs::create_dir_all(&config.path)?;

        let users_db_path = config.path.join("users.db");
        let sites_db_path = config.path.join("sites.db");
        let sites_files_path = config.path.join("sites");

        std::fs::create_dir_all(&sites_files_path)?;

        // Each underlying implementation exposes the same public async constructors.
        let users = UserStorage::new(users_db_path).await?;
        let sites = SiteStorage::new(sites_db_path, sites_files_path).await?;

        Ok(Self { users, sites })
    }
}