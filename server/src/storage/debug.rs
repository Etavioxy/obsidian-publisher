use crate::error::AppError;
use crate::models::{User, Site};
use uuid::Uuid;
use tracing::warn;

// Wrap both sled and orm implementations and compare results for debugging.
#[derive(Clone)]
pub struct UserStorage {
    sled: crate::storage::sled::UserStorage,
    orm: crate::storage::orm::UserStorage,
}

#[derive(Clone)]
pub struct SiteStorage {
    sled: crate::storage::sled::SiteStorage,
    orm: crate::storage::orm::SiteStorage,
}

macro_rules! read_compare {
    // read method returning Option<T>
    ($vis:vis fn $name:ident(&self $(, $arg:ident : $argty:ty)*) -> Result<Option<$ret:ty>, AppError>) => {
        $vis async fn $name(&self $(, $arg : $argty)*) -> Result<Option<$ret>, AppError> {
            let a = self.sled.$name($($arg),*).await?;
            let b = self.orm.$name($($arg),*).await?;
            match (&a, &b) {
                (Some(va), Some(vb)) => {
                    let sa = serde_json::to_string(va)?;
                    let sb = serde_json::to_string(vb)?;
                    if sa != sb {
                        warn!(concat!(stringify!($name), " mismatch: sled={}, orm={}"), sa, sb);
                    }
                }
                (None, Some(_)) | (Some(_), None) => {
                    warn!(concat!(stringify!($name), " presence mismatch: sled={:?}, orm={:?}"), a, b);
                }
                _ => {}
            }
            Ok(a)
        }
    };
}

macro_rules! read_list_compare {
    ($vis:vis fn $name:ident(&self $(, $arg:ident : $argty:ty)*) -> Result<Vec<$ret:ty>, AppError>) => {
        $vis async fn $name(&self $(, $arg : $argty)*) -> Result<Vec<$ret>, AppError> {
            let a = self.sled.$name($($arg),*).await?;
            let b = self.orm.$name($($arg),*).await?;
            let sa = serde_json::to_string(&a)?;
            let sb = serde_json::to_string(&b)?;
            if sa != sb {
                warn!(concat!(stringify!($name), " mismatch: sled={}, orm={}"), sa, sb);
            }
            Ok(a)
        }
    };
}

macro_rules! write_both {
    ($vis:vis fn $name:ident(&self $(, $arg:ident : $argty:ty)*) -> Result<(), AppError>) => {
        $vis async fn $name(&self $(, $arg : $argty)*) -> Result<(), AppError> {
            let res_sled = self.sled.$name($($arg.clone()),*).await;
            let res_orm = self.orm.$name($($arg.clone()),*).await;
            if res_sled.is_err() || res_orm.is_err() {
                warn!(concat!(stringify!($name), " mismatch: sled={:?} orm={:?}"), res_sled, res_orm);
            }
            res_sled.and(res_orm)
        }
    };
}

impl UserStorage {
    pub async fn new(sled: crate::storage::sled::UserStorage, orm: crate::storage::orm::UserStorage) -> Result<Self, AppError> {
        Ok(Self { sled, orm })
    }

    // Macros will generate the repetitive wrappers below
    read_compare!{ pub fn get(&self, id: Uuid) -> Result<Option<User>, AppError> }
    read_compare!{ pub fn get_by_username(&self, username: &str) -> Result<Option<User>, AppError> }
    read_list_compare!{ pub fn list_all(&self) -> Result<Vec<User>, AppError> }
    write_both!{ pub fn create(&self, user: User) -> Result<(), AppError> }
    write_both!{ pub fn update(&self, user: User) -> Result<(), AppError> }
    write_both!{ pub fn delete(&self, id: Uuid) -> Result<(), AppError> }
    // count is special: compare numbers then return sled's count
    pub async fn count(&self) -> Result<usize, AppError> {
        let a = self.sled.count().await?;
        let b = self.orm.count().await?;
        if a != b {
            warn!("count mismatch: sled={} orm={}", a, b);
        }
        Ok(a)
    }
}

// Generate SiteStorage methods
impl SiteStorage {
    pub async fn new(sled: crate::storage::sled::SiteStorage, orm: crate::storage::orm::SiteStorage) -> Result<Self, AppError> {
        Ok(Self { sled, orm })
    }

    read_compare!{ pub fn get(&self, id: Uuid) -> Result<Option<Site>, AppError> }
    read_list_compare!{ pub fn list_all(&self) -> Result<Vec<Site>, AppError> }
    read_list_compare!{ pub fn list_by_owner(&self, owner_id: Uuid) -> Result<Vec<Site>, AppError> }
    write_both!{ pub fn create(&self, site: Site) -> Result<(), AppError> }
    write_both!{ pub fn update(&self, site: Site) -> Result<(), AppError> }
    write_both!{ pub fn delete(&self, id: Uuid) -> Result<(), AppError> }

    // Delegate helpers used by handlers
    pub fn get_site_files_path(&self, site_id: Uuid) -> std::path::PathBuf {
        self.sled.get_site_files_path(site_id)
    }

    pub fn get_site_files_path_str(&self, site_id: &str) -> std::path::PathBuf {
        self.sled.get_site_files_path_str(site_id)
    }
}