use crate::{error::AppError, models::Site};
use sqlx::any::AnyPool;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Clone)]
pub struct SiteStorage {
    pool: AnyPool,
    files_path: PathBuf,
}

impl SiteStorage {
    pub async fn new(db_path: PathBuf, files_path: PathBuf) -> Result<Self, AppError> {
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            if let Some(parent) = db_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            format!("sqlite://{}", db_path.display())
        });

        let pool = AnyPool::connect(&database_url).await.map_err(|e| AppError::Database(e.to_string()))?;

        // Create table
        sqlx::query(
            r#"CREATE TABLE IF NOT EXISTS sites (
                id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                name TEXT NOT NULL,
                domain TEXT,
                description TEXT NOT NULL,
                created_at TEXT NOT NULL
            )"#,
        )
        .execute(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        std::fs::create_dir_all(&files_path)?;

        Ok(Self { pool, files_path })
    }

    pub async fn create(&self, site: Site) -> Result<(), AppError> {
        sqlx::query("INSERT INTO sites (id, owner_id, name, domain, description, created_at) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(site.id.to_string())
            .bind(site.owner_id.to_string())
            .bind(site.name)
            .bind(site.domain)
            .bind(site.description)
            .bind(site.created_at.to_rfc3339())
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(())
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<Site>, AppError> {
        let rec = sqlx::query("SELECT id, owner_id, name, domain, description, created_at FROM sites WHERE id = ?")
            .bind(id.to_string())
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        if let Some(row) = rec {
            let id_str: String = row.try_get("id").map_err(|e| AppError::Database(e.to_string()))?;
            let owner_id_str: String = row.try_get("owner_id").map_err(|e| AppError::Database(e.to_string()))?;
            let name: String = row.try_get("name").map_err(|e| AppError::Database(e.to_string()))?;
            let domain: Option<String> = row.try_get("domain").ok();
            let description: String = row.try_get("description").map_err(|e| AppError::Database(e.to_string()))?;
            let created_at_str: String = row.try_get("created_at").map_err(|e| AppError::Database(e.to_string()))?;
            let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)?.with_timezone(&chrono::Utc);
            Ok(Some(Site { id: Uuid::parse_str(&id_str)?, owner_id: Uuid::parse_str(&owner_id_str)?, name, domain, description, created_at }))
        } else {
            Ok(None)
        }
    }

    pub async fn update(&self, site: Site) -> Result<(), AppError> {
        sqlx::query("UPDATE sites SET owner_id = ?, name = ?, domain = ?, description = ?, created_at = ? WHERE id = ?")
            .bind(site.owner_id.to_string())
            .bind(site.name)
            .bind(site.domain)
            .bind(site.description)
            .bind(site.created_at.to_rfc3339())
            .bind(site.id.to_string())
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(())
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM sites WHERE id = ?")
            .bind(id.to_string())
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        // Delete files on disk
        let site_dir = self.files_path.join(id.to_string());
        if site_dir.exists() {
            std::fs::remove_dir_all(site_dir)?;
        }

        Ok(())
    }

    pub async fn list_all(&self) -> Result<Vec<Site>, AppError> {
        let rows = sqlx::query("SELECT id, owner_id, name, domain, description, created_at FROM sites")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut sites = Vec::new();
        for row in rows {
            let id_str: String = row.try_get("id").map_err(|e| AppError::Database(e.to_string()))?;
            let owner_id_str: String = row.try_get("owner_id").map_err(|e| AppError::Database(e.to_string()))?;
            let name: String = row.try_get("name").map_err(|e| AppError::Database(e.to_string()))?;
            let domain: Option<String> = row.try_get("domain").ok();
            let description: String = row.try_get("description").map_err(|e| AppError::Database(e.to_string()))?;
            let created_at_str: String = row.try_get("created_at").map_err(|e| AppError::Database(e.to_string()))?;
            let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)?.with_timezone(&chrono::Utc);
            sites.push(Site { id: Uuid::parse_str(&id_str)?, owner_id: Uuid::parse_str(&owner_id_str)?, name, domain, description, created_at });
        }

        Ok(sites)
    }

    pub async fn list_by_owner(&self, owner_id: Uuid) -> Result<Vec<Site>, AppError> {
        let rows = sqlx::query("SELECT id, owner_id, name, domain, description, created_at FROM sites WHERE owner_id = ?")
            .bind(owner_id.to_string())
            .fetch_all(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut sites = Vec::new();
        for row in rows {
            let id_str: String = row.try_get("id").map_err(|e| AppError::Database(e.to_string()))?;
            let owner_id_str: String = row.try_get("owner_id").map_err(|e| AppError::Database(e.to_string()))?;
            let name: String = row.try_get("name").map_err(|e| AppError::Database(e.to_string()))?;
            let domain: Option<String> = row.try_get("domain").ok();
            let description: String = row.try_get("description").map_err(|e| AppError::Database(e.to_string()))?;
            let created_at_str: String = row.try_get("created_at").map_err(|e| AppError::Database(e.to_string()))?;
            let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)?.with_timezone(&chrono::Utc);
            sites.push(Site { id: Uuid::parse_str(&id_str)?, owner_id: Uuid::parse_str(&owner_id_str)?, name, domain, description, created_at });
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
