use obsidian_publisher_server::{
    config::{StorageConfig, StaticStorageConfig, StorageEntry},
    storage::Storage,
};
use tempfile::TempDir;
use uuid::Uuid;
use std::path::PathBuf;
use std::io::Write;
use flate2::write::GzEncoder;
use flate2::Compression;

/// Helper to create an isolated storage instance for testing
pub async fn create_test_storage() -> (Storage, TempDir) {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let sites_dir = temp_dir.path().join("sites");
    let db_sled_dir = temp_dir.path().join("sled");
    let db_sqlite_file = temp_dir.path().join("db.sqlite");

    let config = StorageConfig {
        sites: StaticStorageConfig {
            path: sites_dir
        },
        db: vec![
            StorageEntry { name: Some("default".to_string()), backend: "sled".to_string(), path: Some(db_sled_dir) },
            StorageEntry { name: Some("default".to_string()), backend: "sqlite".to_string(), path: Some(db_sqlite_file) },
        ],
    };
    
    let storage = Storage::new(&config).await.expect("Failed to create storage");
    (storage, temp_dir)
}

/// Create a simple tar.gz archive file for testing
/// Returns the path to the created archive
pub fn create_test_archive_file(dir: &std::path::Path, site_id: &Uuid) -> PathBuf {
    let mut builder = tar::Builder::new(Vec::new());
    
    // Create a simple HTML file with site_id reference
    let html_content = format!(r#"<!DOCTYPE html>
<html>
<head><title>Test Site</title></head>
<body>
<a href="/sites/{}/page.html">Link</a>
</body>
</html>"#, site_id);
    
    let html_bytes = html_content.as_bytes();
    let mut header = tar::Header::new_gnu();
    header.set_path("index.html").unwrap();
    header.set_size(html_bytes.len() as u64);
    header.set_mode(0o644);
    header.set_cksum();
    builder.append(&header, html_bytes).unwrap();
    
    let tar_data = builder.into_inner().unwrap();
    
    // Gzip compress
    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(&tar_data).unwrap();
    let archive_data = encoder.finish().unwrap();
    
    // Write to file
    let archive_path = dir.join("site.tar.gz");
    std::fs::write(&archive_path, archive_data).unwrap();
    archive_path
}
