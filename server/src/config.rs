use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub storage: StorageConfig,
    pub auth: AuthConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub jwt_secret: String,
}

impl ServerConfig {
    pub fn url(&self) -> String { format!("{}:{}", self.host, self.port) }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    pub path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    pub allow_plaintext_password: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                host: "localhost".to_string(),
                port: 8080,
                jwt_secret: "your_jwt_secret_key".to_string(),
            },
            storage: StorageConfig {
                path: PathBuf::from("./data"),
            },
            auth: AuthConfig {
                allow_plaintext_password: true,
            },
        }
    }
}

impl Config {
    pub fn load() -> anyhow::Result<Self> {
        let config_path = "config.json";
        
        if std::path::Path::new(config_path).exists() {
            let content = std::fs::read_to_string(config_path)?;
            let config: Config = serde_json::from_str(&content)?;
            Ok(config)
        } else {
            let config = Config::default();
            let json = serde_json::to_string(&config)?;
            std::fs::write(config_path, json)?;
            tracing::info!("Created default config file: {}", config_path);
            Ok(config)
        }
    }
}