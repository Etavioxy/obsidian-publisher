use crate::{error::AppError, models::User};
use sea_orm::{Database, DatabaseConnection, EntityTrait, Set, ConnectionTrait, QueryFilter, ColumnTrait, QueryOrder, PaginatorTrait};
use uuid::Uuid;
use crate::storage::orm::entities::users as users_entity;

#[derive(Clone)]
pub struct UserStorage {
    conn: DatabaseConnection,
}

impl UserStorage {
    pub async fn new(database_url: &str) -> Result<Self, AppError> {
        eprintln!("Connecting to DB; database_url='{}'", database_url);
        let conn = Database::connect(database_url).await.map_err(|e| AppError::Database(e.to_string()))?;

        // Create table if not exists (simple portable SQL)
        if database_url.starts_with("sqlite") {
            let sql = r#"CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TEXT NOT NULL
            );"#;
            conn.execute(sea_orm::Statement::from_string(sea_orm::DbBackend::Sqlite, sql.to_owned())).await.map_err(|e| AppError::Database(e.to_string()))?;
        } else {
            let sql = r#"CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TEXT NOT NULL
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
            ..Default::default()
        };

        users_entity::Entity::insert(am).exec(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<User>, AppError> {
        let key = id.to_string();
        if let Some(m) = users_entity::Entity::find_by_id(key).one(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))? {
            let created_at = chrono::DateTime::parse_from_rfc3339(&m.created_at)?.with_timezone(&chrono::Utc);
            Ok(Some(User { id: Uuid::parse_str(&m.id)?, username: m.username, password: m.password, created_at }))
        } else {
            Ok(None)
        }
    }

    pub async fn get_by_username(&self, username: &str) -> Result<Option<User>, AppError> {
        if let Some(m) = users_entity::Entity::find().filter(users_entity::Column::Username.eq(username.to_string())).one(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))? {
            let created_at = chrono::DateTime::parse_from_rfc3339(&m.created_at)?.with_timezone(&chrono::Utc);
            Ok(Some(User { id: Uuid::parse_str(&m.id)?, username: m.username, password: m.password, created_at }))
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
            let created_at = chrono::DateTime::parse_from_rfc3339(&m.created_at)?.with_timezone(&chrono::Utc);
            users.push(User { id: Uuid::parse_str(&m.id)?, username: m.username, password: m.password, created_at });
        }
        Ok(users)
    }

    pub async fn count(&self) -> Result<usize, AppError> {
        let cnt = users_entity::Entity::find().count(&self.conn).await.map_err(|e| AppError::Database(e.to_string()))?;
        Ok(cnt as usize)
    }
}
