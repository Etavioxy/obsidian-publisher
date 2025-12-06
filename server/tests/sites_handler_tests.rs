/// Sites handler function tests
/// 
/// These tests validate the sites handler functions without HTTP.
/// Key principles:
/// - Test pure functions directly (validate_site_name)
/// - Test archive processing with real storage
/// - Test site record creation/update logic

mod utils;

use obsidian_publisher_server::{
    models::{User, Site, SiteResponse},
    handlers::sites::{
        validate_site_name, 
        process_site_archive, 
        save_site_record,
        SiteUploadParams,
    },
};
use uuid::Uuid;
use utils::storage::{create_test_storage, create_test_archive_file};

// ===== validate_site_name Tests =====

#[test]
fn test_validate_site_name_valid() {
    // Valid names
    assert!(validate_site_name("my-site").is_ok());
    assert!(validate_site_name("my_site").is_ok());
    assert!(validate_site_name("MySite123").is_ok());
    assert!(validate_site_name("a").is_ok());
    assert!(validate_site_name("site-name-with-dashes").is_ok());
}

#[test]
fn test_validate_site_name_invalid() {
    // Empty
    assert!(validate_site_name("").is_err());
    
    // Too long (65 chars)
    let long_name = "a".repeat(65);
    assert!(validate_site_name(&long_name).is_err());
    
    // Invalid characters
    assert!(validate_site_name("my site").is_err()); // space
    assert!(validate_site_name("my.site").is_err()); // dot
    assert!(validate_site_name("my/site").is_err()); // slash
    assert!(validate_site_name("my@site").is_err()); // at
}

// ===== process_site_archive Tests =====

#[tokio::test]
async fn test_process_site_archive_creates_both_directories() {
    let (storage, temp) = create_test_storage().await;
    
    let site_id = Uuid::new_v4();
    let site_name = "test-site".to_string();
    let user_id = Uuid::new_v4();
    
    // Create test archive file
    let archive_path = create_test_archive_file(temp.path(), &site_id);
    
    let params = SiteUploadParams {
        site_id,
        site_name: site_name.clone(),
        user_id,
        archive_filename: "site.tar.gz".to_string(),
        archive_path,
    };
    
    // Process archive
    let (uuid_dir, name_dir) = process_site_archive(&storage, &params).await
        .expect("process_site_archive failed");
    
    // Verify both directories exist
    assert!(uuid_dir.exists(), "UUID directory should exist");
    assert!(name_dir.exists(), "Name directory should exist");
    
    // Verify index.html exists in both
    assert!(uuid_dir.join("index.html").exists(), "UUID dir should have index.html");
    assert!(name_dir.join("index.html").exists(), "Name dir should have index.html");
    
    // === Verify UUID directory has ORIGINAL content (no replacement) ===
    let uuid_html = std::fs::read_to_string(uuid_dir.join("index.html")).unwrap();
    assert!(
        uuid_html.contains(&format!("/sites/{}/", site_id)),
        "UUID dir HTML should have original UUID in links"
    );
    assert!(
        !uuid_html.contains(&format!("/sites/{}/", site_name)),
        "UUID dir HTML should NOT have siteName in links"
    );
    
    // === Verify siteName directory has REPLACED content ===
    let name_html = std::fs::read_to_string(name_dir.join("index.html")).unwrap();
    assert!(
        name_html.contains(&format!("/sites/{}/", site_name)),
        "Name dir HTML should have siteName in links"
    );
    assert!(
        !name_html.contains(&format!("/sites/{}/", site_id)),
        "Name dir HTML should NOT have UUID in links"
    );
}

// ===== save_site_record Tests =====

#[tokio::test]
async fn test_save_site_record_create_new() {
    let (storage, _temp) = create_test_storage().await;
    
    // Create owner user first
    let user = User::new("testowner".to_string(), "pass".to_string());
    let user_id = user.id;
    storage.users.create(user).await.expect("Failed to create user");
    
    let site_id = Uuid::new_v4();
    let site_name = "new-site".to_string();
    
    // Save record using the actual function signature
    let site = save_site_record(&storage, site_id, &site_name, user_id).await
        .expect("save_site_record failed");
    
    assert_eq!(site.id, site_id);
    assert_eq!(site.name, site_name);
    assert_eq!(site.owner_id, user_id);
    
    // Verify it's in storage
    let found = storage.sites.get(site_id).await.expect("get failed");
    assert!(found.is_some());
}

#[tokio::test]
async fn test_save_site_record_creates_new_version() {
    let (storage, _temp) = create_test_storage().await;
    
    // Create owner user
    let user = User::new("owner".to_string(), "pass".to_string());
    let user_id = user.id;
    storage.users.create(user).await.expect("Failed to create user");
    
    // Create initial site (version 1)
    let site1_id = Uuid::new_v4();
    let site_name = "existing-site".to_string();
    let mut site1 = Site::new(site1_id, user_id, site_name.clone(), "Version 1".to_string());
    site1.created_at = chrono::Utc::now() - chrono::Duration::hours(1);
    storage.sites.create(site1).await.expect("Failed to create site v1");
    
    // Create new version via save_site_record (simulating re-upload)
    let site2_id = Uuid::new_v4();
    
    let new_site = save_site_record(&storage, site2_id, &site_name, user_id).await
        .expect("save_site_record failed");
    
    // Should have the NEW site_id (new version)
    assert_eq!(new_site.id, site2_id);
    assert_eq!(new_site.name, site_name);
    assert_eq!(new_site.description, "Site uploaded from CLI");
    
    // get_latest_by_name should return the LATEST version (site2)
    let latest = storage.sites.get_latest_by_name(&site_name).await.expect("get_latest_by_name failed");
    assert!(latest.is_some());
    assert_eq!(latest.unwrap().id, site2_id, "get_latest_by_name should return the newest version");
    
    // Both versions should exist
    let all_versions = storage.sites.get_all_by_name(&site_name).await.expect("get_all_by_name failed");
    assert_eq!(all_versions.len(), 2, "Should have 2 versions");
}

// ===== SiteResponse Tests =====

#[test]
fn test_site_response_contains_both_urls() {
    let site_id = Uuid::new_v4();
    let site_name = "my-blog".to_string();
    let owner_id = Uuid::new_v4();
    
    let site = Site::new(site_id, owner_id, site_name.clone(), "Test".to_string());
    let response = SiteResponse::from_site(site, "https://example.com");
    
    // Verify both URLs are present
    assert_eq!(response.url, format!("https://example.com/sites/{}/", site_name));
    assert_eq!(response.url_by_id, format!("https://example.com/sites/{}/", site_id));
}
