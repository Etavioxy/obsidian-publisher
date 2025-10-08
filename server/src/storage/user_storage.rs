use crate::{error::AppError, models::User};
use sled::Db;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Clone)]
pub struct UserStorage {
    db: Db,
}

impl UserStorage {
    pub fn new(path: PathBuf) -> Result<Self, AppError> {
        let db = sled::open(path)?;
        Ok(Self { db })
    }

    pub fn create(&self, user: User) -> Result<(), AppError> {
        let key = user.id.as_bytes();
        let value = serde_json::to_vec(&user)?;
        self.db.insert(key, value)?;
        
        // 创建用户名索引
        let username_key = format!("username:{}", user.username);
        self.db.insert(username_key.as_bytes(), user.id.as_bytes())?;
        
        Ok(())
    }

    pub fn get(&self, id: Uuid) -> Result<Option<User>, AppError> {
        let key = id.as_bytes();
        if let Some(value) = self.db.get(key)? {
            let user: User = serde_json::from_slice(&value)?;
            Ok(Some(user))
        } else {
            Ok(None)
        }
    }

    pub fn get_by_username(&self, username: &str) -> Result<Option<User>, AppError> {
        let username_key = format!("username:{}", username);
        if let Some(user_id_bytes) = self.db.get(username_key.as_bytes())? {
            let user_id = Uuid::from_slice(&user_id_bytes)
                .map_err(|e| AppError::Internal(e.to_string()))?;
            self.get(user_id)
        } else {
            Ok(None)
        }
    }

    pub fn update(&self, user: User) -> Result<(), AppError> {
        let key = user.id.as_bytes();
        let value = serde_json::to_vec(&user)?;
        self.db.insert(key, value)?;
        Ok(())
    }

    pub fn delete(&self, id: Uuid) -> Result<(), AppError> {
        // 先获取用户信息以删除用户名索引
        if let Some(user) = self.get(id)? {
            let username_key = format!("username:{}", user.username);
            self.db.remove(username_key.as_bytes())?;
        }
        
        let key = id.as_bytes();
        self.db.remove(key)?;
        Ok(())
    }
    
    pub fn list_all(&self) -> Result<Vec<User>, AppError> {
        let mut users = Vec::new();
        
        for result in self.db.iter() {
            let (key, value) = result?;
            
            // 跳过用户名索引键
            if std::str::from_utf8(&key).unwrap_or("").starts_with("username:") {
                continue;
            }
            
            let user: User = serde_json::from_slice(&value)?;
            users.push(user);
        }
        
        // 按创建时间排序
        users.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        
        Ok(users)
    }

    pub fn count(&self) -> Result<usize, AppError> {
        let mut count = 0;
        
        for result in self.db.iter() {
            let (key, _) = result?;
            
            // 跳过用户名索引键
            if std::str::from_utf8(&key).unwrap_or("").starts_with("username:") {
                continue;
            }
            
            count += 1;
        }
        
        Ok(count)
    }
}