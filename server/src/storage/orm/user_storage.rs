use crate::{error::AppError, models::User};
use sqlx::any::AnyPool;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Clone)]
pub struct UserStorage {
    pool: AnyPool,
}

impl UserStorage {
    pub async fn new(db_path: PathBuf) -> Result<Self, AppError> {
        // Prefer DATABASE_URL env var; otherwise use a file-based sqlite at db_path
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            // Ensure parent exists
            if let Some(parent) = db_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            format!("sqlite://{}", db_path.display())
        });

        let pool = AnyPool::connect(&database_url).await.map_err(|e| AppError::Database(e.to_string()))?;

        // Create tables if not exist
        sqlx::query(
            r#"CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TEXT NOT NULL,
                sites TEXT
            )"#,
        )
        .execute(&pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(Self { pool })
    }

    pub async fn create(&self, user: User) -> Result<(), AppError> {
        let sites = serde_json::to_string(&user.sites)?;
        sqlx::query("INSERT INTO users (id, username, password, created_at, sites) VALUES (?, ?, ?, ?, ?)")
            .bind(user.id.to_string())
            .bind(user.username)
            .bind(user.password)
            .bind(user.created_at.to_rfc3339())
            .bind(sites)
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(())
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<User>, AppError> {
        let rec = sqlx::query("SELECT id, username, password, created_at, sites FROM users WHERE id = ?")
            .bind(id.to_string())
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        if let Some(row) = rec {
            let id_str: String = row.try_get("id").map_err(|e| AppError::Database(e.to_string()))?;
            let username: String = row.try_get("username").map_err(|e| AppError::Database(e.to_string()))?;
            let password: String = row.try_get("password").map_err(|e| AppError::Database(e.to_string()))?;
            let created_at_str: String = row.try_get("created_at").map_err(|e| AppError::Database(e.to_string()))?;
            let sites_str: Option<String> = row.try_get("sites").ok();
            let sites: Vec<Uuid> = serde_json::from_str(&sites_str.unwrap_or_else(|| "[]".to_string()))?;
            let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)?.with_timezone(&chrono::Utc);
            Ok(Some(User { id: Uuid::parse_str(&id_str)?, username, password, created_at, sites }))
        } else {
            Ok(None)
        }
    }

    pub async fn get_by_username(&self, username: &str) -> Result<Option<User>, AppError> {
        let rec = sqlx::query("SELECT id, username, password, created_at, sites FROM users WHERE username = ?")
            .bind(username)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        if let Some(row) = rec {
            let id_str: String = row.try_get("id").map_err(|e| AppError::Database(e.to_string()))?;
            let username: String = row.try_get("username").map_err(|e| AppError::Database(e.to_string()))?;
            let password: String = row.try_get("password").map_err(|e| AppError::Database(e.to_string()))?;
            let created_at_str: String = row.try_get("created_at").map_err(|e| AppError::Database(e.to_string()))?;
            let sites_str: Option<String> = row.try_get("sites").ok();
            let sites: Vec<Uuid> = serde_json::from_str(&sites_str.unwrap_or_else(|| "[]".to_string()))?;
            let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)?.with_timezone(&chrono::Utc);
            Ok(Some(User { id: Uuid::parse_str(&id_str)?, username, password, created_at, sites }))
        } else {
            Ok(None)
        }
    }

    pub async fn update(&self, user: User) -> Result<(), AppError> {
        let sites = serde_json::to_string(&user.sites)?;
        sqlx::query("UPDATE users SET username = ?, password = ?, created_at = ?, sites = ? WHERE id = ?")
            .bind(user.username)
            .bind(user.password)
            .bind(user.created_at.to_rfc3339())
            .bind(sites)
            .bind(user.id.to_string())
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(())
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM users WHERE id = ?")
            .bind(id.to_string())
            .execute(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    pub async fn list_all(&self) -> Result<Vec<User>, AppError> {
        let rows = sqlx::query("SELECT id, username, password, created_at, sites FROM users ORDER BY created_at DESC")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut users = Vec::new();
        for row in rows {
            let id_str: String = row.try_get("id").map_err(|e| AppError::Database(e.to_string()))?;
            let username: String = row.try_get("username").map_err(|e| AppError::Database(e.to_string()))?;
            let password: String = row.try_get("password").map_err(|e| AppError::Database(e.to_string()))?;
            let created_at_str: String = row.try_get("created_at").map_err(|e| AppError::Database(e.to_string()))?;
            let sites_str: Option<String> = row.try_get("sites").ok();
            let sites: Vec<Uuid> = serde_json::from_str(&sites_str.unwrap_or_else(|| "[]".to_string()))?;
            let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)?.with_timezone(&chrono::Utc);
            users.push(User { id: Uuid::parse_str(&id_str)?, username, password, created_at, sites });
        }

        Ok(users)
    }

    pub async fn count(&self) -> Result<usize, AppError> {
        let row = sqlx::query("SELECT COUNT(1) as count FROM users")
            .fetch_one(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;
        let count: i64 = row.try_get("count").map_err(|e| AppError::Database(e.to_string()))?;
        Ok(count as usize)
    }
}
