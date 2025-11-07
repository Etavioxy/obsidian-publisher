use uuid::Uuid;

/// 生成 jwt secret（使用 UUID v4，简洁且可读）
pub fn generate_secret() -> String {
    Uuid::new_v4().to_string()
}