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
        std::fs::create_dir_all(&config.sites.path)?;

        #[cfg(feature = "debug_sled_and_orm")]
        {
            for entry in &config.db {
                if let Some(p) = &entry.path {
                    std::fs::create_dir_all(p)?;
                }
            }

            // Each underlying implementation exposes the same public async constructors.
            let users = UserStorage::new(config).await?;
            let sites = SiteStorage::new(config).await?;
            Ok(Self { users, sites })
        }
        #[cfg(not(feature = "debug_sled_and_orm"))]
        {
            use crate::User;

            #[cfg(feature = "orm")]
            let backend = "sqlite";
            #[cfg(feature = "sled")]
            let backend = "sled";

            let db_path = config.db_path(backend).ok_or_else(|| anyhow::anyhow!("No database path configured for backend {}", backend))?;
            std::fs::create_dir_all(&db_path)?;
            let users_db_path = db_path.join("users.db");
            let sites_db_path = db_path.join("sites.db");

            let users = UserStorage::new(users_db_path).await?;
            let sites = SiteStorage::new(sites_db_path, files_path).await?;
            Ok(Self { users, sites })
        }
        
    }
}