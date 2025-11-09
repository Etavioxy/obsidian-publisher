use crate::{error::AppError, models::Site};
use sea_orm::{Database, DatabaseConnection, EntityTrait, Set, ConnectionTrait, QueryFilter, ColumnTrait};
use std::path::PathBuf;
use uuid::Uuid;
use crate::storage::orm::entities::sites as sites_entity;

#[derive(Clone)]
pub struct SiteStorage {
    conn: DatabaseConnection,
    files_path: PathBuf,
}

impl SiteStorage {
    pub async fn new(db_path: PathBuf, files_path: PathBuf) -> Result<Self, AppError> {
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            if let Some(parent) = db_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            let p = db_path
                .canonicalize()
                .unwrap_or(db_path.clone())
                .to_string_lossy()
                .replace('\\', "/");
            if p.starts_with('/') {
                format!("sqlite://{}", p)
            } else {
                format!("sqlite:///{}", p)
            }
        });

        // Debug: ensure parent exists and try to create the DB file so sqlite can open it
        if let Some(parent) = db_path.parent() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                eprintln!("Failed to create parent dir {}: {}", parent.display(), e);
            }
        }
        match std::fs::OpenOptions::new().create(true).write(true).open(&db_path) {
            Ok(_) => {
                eprintln!("Touched DB file: {}", db_path.display());
            }
            Err(e) => {
                eprintln!("Could not create/touch DB file {}: {}", db_path.display(), e);
            }
        }

        eprintln!("Connecting to DB; db_path='{}' database_url='{}'", db_path.display(), database_url);

        let conn = Database::connect(&database_url).await.map_err(|e| AppError::Database(e.to_string()))?;

        // Create table if not exists
        if database_url.starts_with("sqlite") {
            let sql = r#"CREATE TABLE IF NOT EXISTS sites (
                id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                name TEXT NOT NULL,
                domain TEXT,
                description TEXT NOT NULL,
                created_at TEXT NOT NULL
            );"#;
            conn.execute(sea_orm::Statement::from_string(sea_orm::DbBackend::Sqlite, sql.to_owned())).await.map_err(|e| AppError::Database(e.to_string()))?;
        } else {
            let sql = r#"CREATE TABLE IF NOT EXISTS sites (
                id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                name TEXT NOT NULL,
                domain TEXT,
                description TEXT NOT NULL,
                created_at TEXT NOT NULL
            );"#;
            conn.execute(sea_orm::Statement::from_string(sea_orm::DbBackend::Postgres, sql.to_owned())).await.map_err(|e| AppError::Database(e.to_string()))?;
        }

        std::fs::create_dir_all(&files_path)?;

        Ok(Self { conn, files_path })
    }

    pub async fn create(&self, site: Site) -> Result<(), AppError> {
        let am = sites_entity::ActiveModel {
            id: Set(site.id.to_string()),
            owner_id: Set(site.owner_id.to_string()),
            name: Set(site.name),
            domain: Set(site.domain),
            description: Set(site.description),
            created_at: Set(site.created_at.to_rfc3339()),
            ..Default::default()
        };

        sites_entity::Entity::insert(am).exec(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<Site>, AppError> {
        let key = id.to_string();
        if let Some(m) = sites_entity::Entity::find_by_id(key).one(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))? {
            let created_at = chrono::DateTime::parse_from_rfc3339(&m.created_at)?.with_timezone(&chrono::Utc);
            Ok(Some(Site { id: Uuid::parse_str(&m.id)?, owner_id: Uuid::parse_str(&m.owner_id)?, name: m.name, domain: m.domain, description: m.description, created_at }))
        } else {
            Ok(None)
        }
    }

    pub async fn update(&self, site: Site) -> Result<(), AppError> {
        let key = site.id.to_string();
        if let Some(m) = sites_entity::Entity::find_by_id(key.clone()).one(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))? {
            let mut am: sites_entity::ActiveModel = m.into();
            am.owner_id = Set(site.owner_id.to_string());
            am.name = Set(site.name);
            am.domain = Set(site.domain);
            am.description = Set(site.description);
            am.created_at = Set(site.created_at.to_rfc3339());
            sites_entity::Entity::update(am).exec(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))?;
            Ok(())
        } else {
            Err(AppError::SiteNotFound)
        }
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), AppError> {
        let key = id.to_string();
        sites_entity::Entity::delete_by_id(key.clone()).exec(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))?;

        // delete files
        let site_dir = self.files_path.join(key);
        if site_dir.exists() {
            std::fs::remove_dir_all(site_dir)?;
        }

        Ok(())
    }

    pub async fn list_all(&self) -> Result<Vec<Site>, AppError> {
        let models = sites_entity::Entity::find().all(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))?;
        let mut sites = Vec::new();
        for m in models {
            let created_at = chrono::DateTime::parse_from_rfc3339(&m.created_at)?.with_timezone(&chrono::Utc);
            sites.push(Site { id: Uuid::parse_str(&m.id)?, owner_id: Uuid::parse_str(&m.owner_id)?, name: m.name, domain: m.domain, description: m.description, created_at });
        }
        Ok(sites)
    }

    pub async fn list_by_owner(&self, owner_id: Uuid) -> Result<Vec<Site>, AppError> {
        let models = sites_entity::Entity::find().filter(sites_entity::Column::OwnerId.eq(owner_id.to_string())).all(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))?;
        let mut sites = Vec::new();
        for m in models {
            let created_at = chrono::DateTime::parse_from_rfc3339(&m.created_at)?.with_timezone(&chrono::Utc);
            sites.push(Site { id: Uuid::parse_str(&m.id)?, owner_id: Uuid::parse_str(&m.owner_id)?, name: m.name, domain: m.domain, description: m.description, created_at });
        }
        Ok(sites)
    }

    pub fn get_site_files_path(&self, site_id: Uuid) -> PathBuf {
        self.files_path.join(site_id.to_string())
    }

    pub fn get_site_files_path_str(&self, site_id: &str) -> PathBuf {
        self.files_path.join(site_id)
    }
}
