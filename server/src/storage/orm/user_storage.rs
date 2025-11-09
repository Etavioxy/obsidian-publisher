use crate::{error::AppError, models::User};
use sea_orm::{Database, DatabaseConnection, EntityTrait, Set, ConnectionTrait, QueryFilter, ColumnTrait, QueryOrder, PaginatorTrait};
use std::path::PathBuf;
use uuid::Uuid;
use crate::storage::orm::entities::users as users_entity;

#[derive(Clone)]
pub struct UserStorage {
    conn: DatabaseConnection,
}

impl UserStorage {
    pub async fn new(db_path: PathBuf) -> Result<Self, AppError> {
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            if let Some(parent) = db_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            // For sqlite file paths ensure an absolute-style URL: sqlite:///C:/path/to/db or sqlite:////unix/path
            let p = db_path
                .canonicalize()
                .unwrap_or(db_path.clone())
                .to_string_lossy()
                .replace('\\', "/");
            if p.starts_with('/') {
                format!("sqlite://{}", p)
            } else {
                // Windows absolute paths (e.g. C:/...) need three slashes
                format!("sqlite:///{}", p)
            }
        });

        // Ensure parent directory exists and try to touch the DB file so sqlite can open it
        if let Some(parent) = db_path.parent() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                eprintln!("Failed to create parent dir {}: {}", parent.display(), e);
            }
        }
        match std::fs::OpenOptions::new().create(true).write(true).open(&db_path) {
            Ok(_) => eprintln!("Touched DB file: {}", db_path.display()),
            Err(e) => eprintln!("Could not create/touch DB file {}: {}", db_path.display(), e),
        }

        eprintln!("Connecting to DB; db_path='{}' database_url='{}'", db_path.display(), database_url);

        let conn = Database::connect(&database_url).await.map_err(|e| AppError::Database(e.to_string()))?;

        // Create table if not exists (simple portable SQL)
        if database_url.starts_with("sqlite") {
            let sql = r#"CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TEXT NOT NULL,
                sites TEXT
            );"#;
            conn.execute(sea_orm::Statement::from_string(sea_orm::DbBackend::Sqlite, sql.to_owned())).await.map_err(|e| AppError::Database(e.to_string()))?;
        } else {
            let sql = r#"CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TEXT NOT NULL,
                sites TEXT
            );"#;
            conn.execute(sea_orm::Statement::from_string(sea_orm::DbBackend::Postgres, sql.to_owned())).await.map_err(|e| AppError::Database(e.to_string()))?;
        }

        Ok(Self { conn })
    }

    pub async fn create(&self, user: User) -> Result<(), AppError> {
        let am = users_entity::ActiveModel {
            id: Set(user.id.to_string()),
            username: Set(user.username),
            password: Set(user.password),
            created_at: Set(user.created_at.to_rfc3339()),
            sites: Set(Some(serde_json::to_string(&user.sites)?)),
            ..Default::default()
        };

        users_entity::Entity::insert(am).exec(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<User>, AppError> {
        let key = id.to_string();
        if let Some(m) = users_entity::Entity::find_by_id(key).one(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))? {
            let sites: Vec<Uuid> = serde_json::from_str(&m.sites.unwrap_or_else(|| "[]".to_string()))?;
            let created_at = chrono::DateTime::parse_from_rfc3339(&m.created_at)?.with_timezone(&chrono::Utc);
            Ok(Some(User { id: Uuid::parse_str(&m.id)?, username: m.username, password: m.password, created_at, sites }))
        } else {
            Ok(None)
        }
    }

    pub async fn get_by_username(&self, username: &str) -> Result<Option<User>, AppError> {
        if let Some(m) = users_entity::Entity::find().filter(users_entity::Column::Username.eq(username.to_string())).one(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))? {
            let sites: Vec<Uuid> = serde_json::from_str(&m.sites.unwrap_or_else(|| "[]".to_string()))?;
            let created_at = chrono::DateTime::parse_from_rfc3339(&m.created_at)?.with_timezone(&chrono::Utc);
            Ok(Some(User { id: Uuid::parse_str(&m.id)?, username: m.username, password: m.password, created_at, sites }))
        } else {
            Ok(None)
        }
    }

    pub async fn update(&self, user: User) -> Result<(), AppError> {
        let key = user.id.to_string();
        if let Some(m) = users_entity::Entity::find_by_id(key.clone()).one(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))? {
            let mut am: users_entity::ActiveModel = m.into();
            am.username = Set(user.username);
            am.password = Set(user.password);
            am.created_at = Set(user.created_at.to_rfc3339());
            am.sites = Set(Some(serde_json::to_string(&user.sites)?));
            users_entity::Entity::update(am).exec(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))?;
            Ok(())
        } else {
            Err(AppError::UserNotFound)
        }
    }

    pub async fn delete(&self, id: Uuid) -> Result<(), AppError> {
        let key = id.to_string();
        users_entity::Entity::delete_by_id(key).exec(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    pub async fn list_all(&self) -> Result<Vec<User>, AppError> {
        let models = users_entity::Entity::find().order_by_desc(users_entity::Column::CreatedAt).all(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))?;
        let mut users = Vec::new();
        for m in models {
            let sites: Vec<Uuid> = serde_json::from_str(&m.sites.unwrap_or_else(|| "[]".to_string()))?;
            let created_at = chrono::DateTime::parse_from_rfc3339(&m.created_at)?.with_timezone(&chrono::Utc);
            users.push(User { id: Uuid::parse_str(&m.id)?, username: m.username, password: m.password, created_at, sites });
        }
        Ok(users)
    }

    pub async fn count(&self) -> Result<usize, AppError> {
        let cnt = users_entity::Entity::find().count(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))?;
        Ok(cnt as usize)
    }
}
