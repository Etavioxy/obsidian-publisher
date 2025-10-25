use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub password: String, // 生产环境应该hash
    pub created_at: DateTime<Utc>,
    pub sites: Vec<Uuid>,
}

impl User {
    pub fn new(username: String, password: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            username,
            password,
            created_at: Utc::now(),
            sites: Vec::new(),
        }
    }
    
    pub fn add_site(&mut self, site_id: Uuid) {
        if !self.sites.contains(&site_id) {
            self.sites.push(site_id);
        }
    }
    
    pub fn remove_site(&mut self, site_id: Uuid) {
        self.sites.retain(|&id| id != site_id);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Site {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub name: String,
    pub domain: Option<String>,
    pub description: String,
    pub created_at: DateTime<Utc>,
}

impl Site {
    pub fn new(id: Uuid, owner_id: Uuid, name: String, description: String) -> Self {
        Self {
            id,
            owner_id,
            name,
            domain: None,
            description,
            created_at: Utc::now(),
        }
    }
}

// API 请求/响应模型
#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub username: String,
    pub created_at: DateTime<Utc>,
    pub sites: Vec<Uuid>,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            username: user.username,
            created_at: user.created_at,
            sites: user.sites,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateSiteRequest {
    pub description: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct SiteResponse {
    pub id: Uuid,
    pub name: String,
    pub domain: Option<String>,
    pub description: String,
    pub created_at: DateTime<Utc>,
    pub url: String,
}

impl SiteResponse {
    pub fn from_site(site: Site, base_url: &str) -> Self {
        Self {
            id: site.id,
            name: site.name,
            domain: site.domain,
            description: site.description,
            created_at: site.created_at,
            url: format!("{}/sites/{}/", base_url, site.id),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user_id
    pub username: String,
    pub exp: usize,
}