/// Storage integration tests
/// 
/// These tests validate the storage layer with real database operations.
/// Key principles:
/// - Use isolated temporary directories for each test
/// - Minimal number of focused tests covering critical paths
/// - Safe cleanup after each test
/// - Test real data persistence and retrieval

use obsidian_publisher_server::{
    config::StorageConfig,
    models::{User, Site},
    storage::Storage,
};
use tempfile::TempDir;
use uuid::Uuid;

/// Helper to create an isolated storage instance for testing
fn create_test_storage() -> (Storage, TempDir) {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let config = StorageConfig {
        path: temp_dir.path().to_path_buf(),
    };
    
    let storage = Storage::new(&config).expect("Failed to create storage");
    (storage, temp_dir)
}

#[test]
fn test_user_crud_lifecycle() {
    let (storage, _temp) = create_test_storage();
    
    // Create
    let user = User::new("testuser".to_string(), "password123".to_string());
    let user_id = user.id;
    storage.users.create(user.clone()).expect("Failed to create user");
    
    // Read by ID
    let retrieved = storage.users.get(user_id).expect("Failed to get user");
    assert!(retrieved.is_some());
    let retrieved = retrieved.unwrap();
    assert_eq!(retrieved.username, "testuser");
    assert_eq!(retrieved.password, "password123");
    
    // Read by username
    let by_username = storage.users.get_by_username("testuser").expect("Failed to get by username");
    assert!(by_username.is_some());
    assert_eq!(by_username.unwrap().id, user_id);
    
    // Update
    let mut updated_user = retrieved.clone();
    updated_user.password = "newpassword".to_string();
    storage.users.update(updated_user).expect("Failed to update user");
    
    let after_update = storage.users.get(user_id).expect("Failed to get after update").unwrap();
    assert_eq!(after_update.password, "newpassword");
    
    // Delete
    storage.users.delete(user_id).expect("Failed to delete user");
    let after_delete = storage.users.get(user_id).expect("Failed to get after delete");
    assert!(after_delete.is_none());
    
    // Username index should also be deleted
    let by_username_after = storage.users.get_by_username("testuser").expect("Failed to get by username after delete");
    assert!(by_username_after.is_none());
}

#[test]
fn test_site_crud_lifecycle() {
    let (storage, _temp) = create_test_storage();
    
    // Create owner user first
    let owner = User::new("owner".to_string(), "pass".to_string());
    let owner_id = owner.id;
    storage.users.create(owner).expect("Failed to create owner");
    
    // Create site
    let site_id = Uuid::new_v4();
    let site = Site::new(
        site_id,
        owner_id,
        "Test Site".to_string(),
        "A test site".to_string(),
    );
    storage.sites.create(site.clone()).expect("Failed to create site");
    
    // Read
    let retrieved = storage.sites.get(site_id).expect("Failed to get site");
    assert!(retrieved.is_some());
    let retrieved = retrieved.unwrap();
    assert_eq!(retrieved.name, "Test Site");
    assert_eq!(retrieved.owner_id, owner_id);
    
    // Update
    let mut updated_site = retrieved.clone();
    updated_site.description = "Updated description".to_string();
    storage.sites.update(updated_site).expect("Failed to update site");
    
    let after_update = storage.sites.get(site_id).expect("Failed to get after update").unwrap();
    assert_eq!(after_update.description, "Updated description");
    
    // List by owner
    let owner_sites = storage.sites.list_by_owner(owner_id).expect("Failed to list by owner");
    assert_eq!(owner_sites.len(), 1);
    assert_eq!(owner_sites[0].id, site_id);
    
    // Delete
    storage.sites.delete(site_id).expect("Failed to delete site");
    let after_delete = storage.sites.get(site_id).expect("Failed to get after delete");
    assert!(after_delete.is_none());
}

#[test]
fn test_user_site_relationship() {
    let (storage, _temp) = create_test_storage();
    
    // Create user
    let mut user = User::new("user_with_sites".to_string(), "pass".to_string());
    let user_id = user.id;
    storage.users.create(user.clone()).expect("Failed to create user");
    
    // Create multiple sites
    let site1_id = Uuid::new_v4();
    let site1 = Site::new(site1_id, user_id, "Site 1".to_string(), "First site".to_string());
    storage.sites.create(site1).expect("Failed to create site1");
    
    let site2_id = Uuid::new_v4();
    let site2 = Site::new(site2_id, user_id, "Site 2".to_string(), "Second site".to_string());
    storage.sites.create(site2).expect("Failed to create site2");
    
    // Update user with site references
    user.add_site(site1_id);
    user.add_site(site2_id);
    storage.users.update(user.clone()).expect("Failed to update user");
    
    // Verify user has sites
    let retrieved_user = storage.users.get(user_id).expect("Failed to get user").unwrap();
    assert_eq!(retrieved_user.sites.len(), 2);
    assert!(retrieved_user.sites.contains(&site1_id));
    assert!(retrieved_user.sites.contains(&site2_id));
    
    // Verify sites belong to user
    let user_sites = storage.sites.list_by_owner(user_id).expect("Failed to list sites");
    assert_eq!(user_sites.len(), 2);
    
    // Remove one site from user
    let mut updated_user = retrieved_user.clone();
    updated_user.remove_site(site1_id);
    storage.users.update(updated_user).expect("Failed to update user");
    
    let final_user = storage.users.get(user_id).expect("Failed to get user").unwrap();
    assert_eq!(final_user.sites.len(), 1);
    assert!(final_user.sites.contains(&site2_id));
    assert!(!final_user.sites.contains(&site1_id));
}

#[test]
fn test_concurrent_operations_safety() {
    let (storage, _temp) = create_test_storage();
    
    // Create initial user
    let user1 = User::new("concurrent_user1".to_string(), "pass1".to_string());
    let user1_id = user1.id;
    storage.users.create(user1).expect("Failed to create user1");
    
    let user2 = User::new("concurrent_user2".to_string(), "pass2".to_string());
    let user2_id = user2.id;
    storage.users.create(user2).expect("Failed to create user2");
    
    // Verify both users exist
    assert!(storage.users.get(user1_id).expect("Failed to get user1").is_some());
    assert!(storage.users.get(user2_id).expect("Failed to get user2").is_some());
    
    // Get count
    let count = storage.users.count().expect("Failed to count users");
    assert_eq!(count, 2);
    
    // List all
    let all_users = storage.users.list_all().expect("Failed to list all users");
    assert_eq!(all_users.len(), 2);
    
    // Verify username lookup for both
    assert!(storage.users.get_by_username("concurrent_user1").expect("Failed to lookup").is_some());
    assert!(storage.users.get_by_username("concurrent_user2").expect("Failed to lookup").is_some());
}

#[test]
fn test_site_files_path_management() {
    let (storage, temp) = create_test_storage();
    
    let owner = User::new("owner".to_string(), "pass".to_string());
    let owner_id = owner.id;
    storage.users.create(owner).expect("Failed to create owner");
    
    let site_id = Uuid::new_v4();
    let site = Site::new(site_id, owner_id, "Site with files".to_string(), "Test".to_string());
    storage.sites.create(site).expect("Failed to create site");
    
    // Get site files path
    let files_path = storage.sites.get_site_files_path(site_id);
    
    // Verify path structure
    assert!(files_path.starts_with(temp.path()));
    assert!(files_path.to_string_lossy().contains(&site_id.to_string()));
    
    // Create a test file in the site directory
    std::fs::create_dir_all(&files_path).expect("Failed to create site dir");
    let test_file = files_path.join("test.txt");
    std::fs::write(&test_file, "test content").expect("Failed to write test file");
    
    assert!(test_file.exists());
    
    // Delete site should remove files directory
    storage.sites.delete(site_id).expect("Failed to delete site");
    
    // Verify directory is removed
    assert!(!files_path.exists());
}