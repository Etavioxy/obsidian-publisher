use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use std::fs;
use crate::utils::secrets::generate_secret;
use regex::Regex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub storage: StorageConfig,
    pub auth: AuthConfig,
}

/// 简洁的校验 trait，返回警告列表（不作为致命错误）
pub trait Validate {
    fn validate(&self) -> Vec<String>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub url: String,
    pub host: String,
    pub port: u16,
    pub jwt_secret: String,
}

impl ServerConfig {
    pub fn bind_url(&self) -> String { format!("{}:{}", self.host, self.port) }
}

impl Validate for ServerConfig {
    fn validate(&self) -> Vec<String> {
        let mut warnings = Vec::new();

        if self.url.trim().is_empty() {
            warnings.push("server.url is empty".to_string());
        } else {
            let re = Regex::new(r"^(https?)://\S+$").unwrap();
            if !re.is_match(self.url.as_str()) {
                warnings.push(format!("server.url '{}' does not look like a valid http(s) URL", self.url));
            }
        }

        warnings
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    // Static file storage configuration
    pub sites: StaticStorageConfig,
    // Multiple storage backends supported. Order defines preference when applicable.
    pub db: Vec<StorageEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaticStorageConfig {
    /// Path to the static files directory
    pub path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageEntry {
    /// Optional logical name for this storage (useful for diagnostics)
    pub name: Option<String>,
    /// Backend identifier, e.g. "sled", "sqlite", "postgres", etc.
    pub backend: String,
    /// Optional path (for file-backed storages)
    #[serde(default)]
    pub path: Option<PathBuf>,
}

impl Validate for StorageConfig {
    fn validate(&self) -> Vec<String> {
        let mut warns = Vec::new();
        if self.db.is_empty() {
            warns.push("storage.db is empty; no storage configured".to_string());
        }
        for (i, s) in self.db.iter().enumerate() {
            if !matches!(s.backend.as_ref(), "sled" | "sqlite" | "postgres") {
                warns.push(format!(
                    "storage.storages[{}].backend '{}' is not supported; must be one of: sled, sqlite, postgres",
                    i, s.backend
                ));
            }
            // if backend is file-based, ensure path is present
            if matches!(s.backend.as_ref(), "sled" | "sqlite") && s.path.is_none() {
                warns.push(format!(
                    "storage.storages[{}] with backend '{}' requires a 'path' field",
                    i, s.backend
                ));
            }
        }
        warns
    }
}

impl StorageConfig {
    /// 获取第一个匹配指定后端的存储路径（如果有）
    pub fn first_db_with_backend(&self, backends: &[&str]) -> Option<&StorageEntry> {
        self.db.iter().find(|entry| {
            backends.contains(&entry.backend.as_str())
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    pub allow_plaintext_password: bool,
    /// Token expiration in hours
    pub token_expiration_hours: i64,
}

impl Validate for AuthConfig {
    fn validate(&self) -> Vec<String> {
        let mut warns = Vec::new();
        if self.token_expiration_hours <= 0 {
            warns.push("auth.token_expiration_hours must be > 0".to_string());
        }
        warns
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                url: "".to_string(),
                host: "0.0.0.0".to_string(),
                port: 8080,
                jwt_secret: generate_secret(),
            },
            storage: StorageConfig {
                sites: StaticStorageConfig { path: PathBuf::from("./data/sites") },
                db: vec![StorageEntry { name: Some("default".to_string()), backend: "sled".to_string(), path: Some(PathBuf::from("./data/sled")) }],
            },
            auth: AuthConfig {
                allow_plaintext_password: true,
                token_expiration_hours: 24,
            },
        }
    }
}

impl Config {
    /// 从指定路径加载配置
    pub fn load_from(path: &str) -> anyhow::Result<Self> {
        // 读取已有配置（如果存在）
        let user_val = read_config_file(path)?;
        // 归一化配置（在默认配置上 overlay 用户配置并确保必要字段存在）
        // 先检查未知字段（将用户配置与默认配置比较）
        // 只生成一次默认配置的 Value 并复用
        let default_val = serde_json::to_value(&Config::default())?;
        if let Some(ref u) = user_val {
            for w in check_unknown_keys(&default_val, u) {
                tracing::warn!("Config unknown key: {}", w);
            }
        }

        // 将默认值传入 normalize_config，避免重复生成默认 Value
        let merged = normalize_config(user_val, default_val)?;
        // 反序列化为 Config
        let config: Config = serde_json::from_value(merged.clone())?;

        validate_config(&config);

        // 写回（持久化已补齐的配置）
        write_config_file(path, &merged)?;


        Ok(config)
    }
}

// ---------------- helper functions ----------------

/// 读取配置文件为 serde_json::Value，如果文件不存在返回 None
fn read_config_file(path: &str) -> anyhow::Result<Option<Value>> {
    if std::path::Path::new(path).exists() {
        let content = fs::read_to_string(path)?;
        let v: Value = serde_json::from_str(&content).unwrap_or(Value::Null);
        Ok(Some(v))
    } else {
        Ok(None)
    }
}

/// 在默认配置上合并用户配置并确保 jwt_secret
///
/// 现在接收一个已经生成好的默认 `Value`，以避免重复调用 `Config::default()`。
fn normalize_config(user_val: Option<Value>, mut merged: Value) -> anyhow::Result<Value> {
    if let Some(u) = user_val {
        overlay(&mut merged, &u);
    }

    // 确保 server.jwt_secret 存在且非空
    if let Some(server_obj) = merged.get_mut("server").and_then(|s| s.as_object_mut()) {
        let need = match server_obj.get("jwt_secret") {
            Some(v) => v.as_str().map(|s| s.is_empty()).unwrap_or(true),
            None => true,
        };
        if need {
            server_obj.insert("jwt_secret".to_string(), Value::String(generate_secret()));
        }
    }

    Ok(merged)
}

/// 对子配置分别进行校验
fn validate_config(config: &Config) {
    for w in config.server.validate() {
        tracing::warn!("Config validation: {}", w);
    }
    for w in config.storage.validate() {
        tracing::warn!("Config validation: {}", w);
    }
    for w in config.auth.validate() {
        tracing::warn!("Config validation: {}", w);
    }
}

/// 将 Value 写回到文件（漂亮格式）
fn write_config_file(path: &str, v: &Value) -> anyhow::Result<()> {
    let pretty = serde_json::to_string_pretty(v)?;
    // 如果文件已存在且内容相同，则避免写回
    if std::path::Path::new(path).exists() {
        let existing = fs::read_to_string(path)?;
        if existing == pretty {
            tracing::info!("Config file {} unchanged; skip write", path);
            return Ok(());
        }
    }

    fs::write(path, pretty)?;
    tracing::info!("Wrote normalized config to {}", path);
    Ok(())
}

#[cfg(test)]
mod jwt_tests {
    use super::*;
    use serde_json::json;

    // userconfig = None
    // 如果没有用户配置，应该生成 jwt 并使用默认的 storage.path
    #[test]
    fn generates_jwt_and_default_storage_path() {
        let default_val = serde_json::to_value(&Config::default()).unwrap();
        let v = normalize_config(None, default_val).expect("normalize");
        // 直接用索引和 unwrap，断言更直观
        let jwt = v["server"]["jwt_secret"].as_str().unwrap();
        assert!(!jwt.is_empty(), "jwt should be generated");

        let path = v["storage"]["sites"]["path"].as_str().unwrap();
        assert_eq!(path, "./data/sites");
    }

    // userconfig = {jwt_secret: ""}
    // 如果用户给了空的 jwt，应当被替换为非空值
    #[test]
    fn empty_jwt_is_replaced() {
        let user = json!({"server": {"jwt_secret": ""}});
        let default_val = serde_json::to_value(&Config::default()).unwrap();
        let v = normalize_config(Some(user), default_val).expect("normalize");
        assert!(v["server"]["jwt_secret"].as_str().unwrap().len() > 0);
    }
}

/// 通用的未知字段检查：返回警告字符串列表
fn check_unknown_keys(a: &Value, b: &Value) -> Vec<String> {
    // a = default, b = user
    let mut warns = Vec::new();

    fn recurse(def: &Value, usr: &Value, path: &str, warns: &mut Vec<String>) {
        match (def, usr) {
            (Value::Object(map_def), Value::Object(map_usr)) => {
                for (k, v_usr) in map_usr {
                    let new_path = if path.is_empty() { k.clone() } else { format!("{}.{}", path, k) };
                    if let Some(v_def) = map_def.get(k) {
                        recurse(v_def, v_usr, &new_path, warns);
                    } else {
                        warns.push(new_path);
                    }
                }
            }
            (Value::Array(arr_def), Value::Array(arr_usr)) => {
                // default is an array - recurse into first element
                if let Some(first_element) = arr_def.get(0) {
                    for (i, v_usr) in arr_usr.iter().enumerate() {
                        let new_path = format!("{}[{}]", path, i);
                        recurse(first_element, v_usr, &new_path, warns);
                    }
                }

            }
            (_, Value::Object(map_usr)) => {
                // default isn't an object but user provided an object - treat all user keys as unknown
                for k in map_usr.keys() {
                    let new_path = if path.is_empty() { k.clone() } else { format!("{}.{}", path, k) };
                    warns.push(new_path);
                }
            }
            _ => {}
        }
    }

    recurse(a, b, "", &mut warns);

    warns
}

// Overlay b onto a (recursively). For objects, keys in b replace or merge into a.
fn overlay(a: &mut Value, b: &Value) {
    match (a, b) {
        (Value::Object(map_a), Value::Object(map_b)) => {
            for (k, v_b) in map_b {
                match map_a.get_mut(k) {
                    Some(v_a) => overlay(v_a, v_b),
                    None => {
                        map_a.insert(k.clone(), v_b.clone());
                    }
                }
            }
        }
        (Value::Array(a_arr), Value::Array(b_arr)) => {
            *a_arr = b_arr.clone();
        }
        (a_slot, b_val) => {
            *a_slot = b_val.clone();
        }
    }
}