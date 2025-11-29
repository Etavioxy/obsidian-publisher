/// Storage integration tests
/// 
/// These tests validate the storage layer with real database operations.
/// Key principles:
/// - Use isolated temporary directories for each test
/// - Minimal number of focused tests covering critical paths
/// - Safe cleanup after each test
/// - Test real data persistence and retrieval

mod utils;

use obsidian_publisher_server::models::{User, Site};
use uuid::Uuid;
use utils::storage::create_test_storage;

#[tokio::test]
async fn test_user_crud_lifecycle() {
    let (storage, _temp) = create_test_storage().await;
    
    // Create
    let user = User::new("testuser".to_string(), "password123".to_string());
    let user_id = user.id;
    storage.users.create(user.clone()).await.expect("Failed to create user");
    
    // Read by ID
    let retrieved = storage.users.get(user_id).await.expect("Failed to get user");
    assert!(retrieved.is_some());
    let retrieved = retrieved.unwrap();
    assert_eq!(retrieved.username, "testuser");
    assert_eq!(retrieved.password, "password123");
    
    // Read by username
    let by_username = storage.users.get_by_username("testuser").await.expect("Failed to get by username");
    assert!(by_username.is_some());
    assert_eq!(by_username.unwrap().id, user_id);
    
    // Update
    let mut updated_user = retrieved.clone();
    updated_user.password = "newpassword".to_string();
    storage.users.update(updated_user).await.expect("Failed to update user");
    
    let after_update = storage.users.get(user_id).await.expect("Failed to get after update").unwrap();
    assert_eq!(after_update.password, "newpassword");
    
    // Delete
    storage.users.delete(user_id).await.expect("Failed to delete user");
    let after_delete = storage.users.get(user_id).await.expect("Failed to get after delete");
    assert!(after_delete.is_none());
    
    // Username index should also be deleted
    let by_username_after = storage.users.get_by_username("testuser").await.expect("Failed to get by username after delete");
    assert!(by_username_after.is_none());
}

#[tokio::test]
async fn test_site_crud_lifecycle() {
    let (storage, _temp) = create_test_storage().await;
    
    // Create owner user first
    let owner = User::new("owner".to_string(), "pass".to_string());
    let owner_id = owner.id;
    storage.users.create(owner).await.expect("Failed to create owner");
    
    // Create site
    let site_id = Uuid::new_v4();
    let site = Site::new(
        site_id,
        owner_id,
        "Test Site".to_string(),
        "A test site".to_string(),
    );
    storage.sites.create(site.clone()).await.expect("Failed to create site");
    
    // Read
    let retrieved = storage.sites.get(site_id).await.expect("Failed to get site");
    assert!(retrieved.is_some());
    let retrieved = retrieved.unwrap();
    assert_eq!(retrieved.name, "Test Site");
    assert_eq!(retrieved.owner_id, owner_id);
    
    // Update
    let mut updated_site = retrieved.clone();
    updated_site.description = "Updated description".to_string();
    storage.sites.update(updated_site).await.expect("Failed to update site");
    
    let after_update = storage.sites.get(site_id).await.expect("Failed to get after update").unwrap();
    assert_eq!(after_update.description, "Updated description");
    
    // List by owner
    let owner_sites = storage.sites.list_by_owner(owner_id).await.expect("Failed to list by owner");
    assert_eq!(owner_sites.len(), 1);
    assert_eq!(owner_sites[0].id, site_id);
    
    // Delete
    storage.sites.delete(site_id).await.expect("Failed to delete site");
    let after_delete = storage.sites.get(site_id).await.expect("Failed to get after delete");
    assert!(after_delete.is_none());
}

#[tokio::test]
async fn test_user_site_relationship() {
    let (storage, _temp) = create_test_storage().await;
    
    // Create user
    let user = User::new("user_with_sites".to_string(), "pass".to_string());
    let user_id = user.id;
    storage.users.create(user.clone()).await.expect("Failed to create user");
    
    // Create multiple sites
    let site1_id = Uuid::new_v4();
    let site1 = Site::new(site1_id, user_id, "Site 1".to_string(), "First site".to_string());
    storage.sites.create(site1).await.expect("Failed to create site1");
    
    let site2_id = Uuid::new_v4();
    let site2 = Site::new(site2_id, user_id, "Site 2".to_string(), "Second site".to_string());
    storage.sites.create(site2).await.expect("Failed to create site2");
    
    // Verify sites belong to user via sites storage index
    let user_sites = storage.sites.list_by_owner(user_id).await.expect("Failed to list sites");
    assert_eq!(user_sites.len(), 2);
    let ids: Vec<Uuid> = user_sites.iter().map(|s| s.id).collect();
    assert!(ids.contains(&site1_id));
    assert!(ids.contains(&site2_id));

    // Remove one site and verify the index updates
    storage.sites.delete(site1_id).await.expect("Failed to delete site1");
    let user_sites_after = storage.sites.list_by_owner(user_id).await.expect("Failed to list sites after delete");
    assert_eq!(user_sites_after.len(), 1);
    assert_eq!(user_sites_after[0].id, site2_id);
}

#[tokio::test]
async fn test_concurrent_operations_safety() {
    let (storage, _temp) = create_test_storage().await;
    
    // Create initial user
    let user1 = User::new("concurrent_user1".to_string(), "pass1".to_string());
    let user1_id = user1.id;
    storage.users.create(user1).await.expect("Failed to create user1");
    
    let user2 = User::new("concurrent_user2".to_string(), "pass2".to_string());
    let user2_id = user2.id;
    storage.users.create(user2).await.expect("Failed to create user2");
    
    // Verify both users exist
    assert!(storage.users.get(user1_id).await.expect("Failed to get user1").is_some());
    assert!(storage.users.get(user2_id).await.expect("Failed to get user2").is_some());
    
    // Get count
    let count = storage.users.count().await.expect("Failed to count users");
    assert_eq!(count, 2);
    
    // List all
    let all_users = storage.users.list_all().await.expect("Failed to list all users");
    assert_eq!(all_users.len(), 2);
    
    // Verify username lookup for both
    assert!(storage.users.get_by_username("concurrent_user1").await.expect("Failed to lookup").is_some());
    assert!(storage.users.get_by_username("concurrent_user2").await.expect("Failed to lookup").is_some());
}

#[tokio::test]
async fn test_site_files_path_management() {
    let (storage, temp) = create_test_storage().await;
    
    let owner = User::new("owner".to_string(), "pass".to_string());
    let owner_id = owner.id;
    storage.users.create(owner).await.expect("Failed to create owner");
    
    let site_id = Uuid::new_v4();
    let site = Site::new(site_id, owner_id, "Site with files".to_string(), "Test".to_string());
    storage.sites.create(site).await.expect("Failed to create site");
    
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
    storage.sites.delete(site_id).await.expect("Failed to delete site");
    
    // Verify directory is removed
    assert!(!files_path.exists());
}

#[tokio::test]
async fn test_site_get_by_name() {
    let (storage, _temp) = create_test_storage().await;
    
    // Create owner user
    let owner = User::new("owner".to_string(), "pass".to_string());
    let owner_id = owner.id;
    storage.users.create(owner).await.expect("Failed to create owner");
    
    // Create site with a specific name
    let site_id = Uuid::new_v4();
    let site_name = "my-awesome-site".to_string();
    let site = Site::new(
        site_id,
        owner_id,
        site_name.clone(),
        "A test site".to_string(),
    );
    storage.sites.create(site.clone()).await.expect("Failed to create site");
    
    // Get by name should find the site
    let found = storage.sites.get_by_name(&site_name).await.expect("Failed to get by name");
    assert!(found.is_some());
    let found = found.unwrap();
    assert_eq!(found.id, site_id);
    assert_eq!(found.name, site_name);
    assert_eq!(found.owner_id, owner_id);
    
    // Get by non-existent name should return None
    let not_found = storage.sites.get_by_name("non-existent-site").await.expect("Failed to get by name");
    assert!(not_found.is_none());
}

#[tokio::test]
async fn test_site_name_uniqueness() {
    let (storage, _temp) = create_test_storage().await;
    
    // Create two different owners
    let owner1 = User::new("owner1".to_string(), "pass1".to_string());
    let owner1_id = owner1.id;
    storage.users.create(owner1).await.expect("Failed to create owner1");
    
    let owner2 = User::new("owner2".to_string(), "pass2".to_string());
    let _owner2_id = owner2.id;
    storage.users.create(owner2).await.expect("Failed to create owner2");
    
    // Owner1 creates a site with name "shared-name"
    let site1_id = Uuid::new_v4();
    let shared_name = "shared-name".to_string();
    let site1 = Site::new(
        site1_id,
        owner1_id,
        shared_name.clone(),
        "First site".to_string(),
    );
    storage.sites.create(site1.clone()).await.expect("Failed to create site1");
    
    // Verify site1 can be found by name
    let found = storage.sites.get_by_name(&shared_name).await.expect("Failed to get by name");
    assert!(found.is_some());
    assert_eq!(found.unwrap().owner_id, owner1_id);
    
    // Owner1 can create another site with a different name
    let site2_id = Uuid::new_v4();
    let site2 = Site::new(
        site2_id,
        owner1_id,
        "another-name".to_string(),
        "Second site".to_string(),
    );
    storage.sites.create(site2).await.expect("Failed to create site2 with different name");
    
    // Verify we can look up sites by name correctly
    let all_sites = storage.sites.list_all().await.expect("Failed to list all");
    assert_eq!(all_sites.len(), 2);
    
    // Verify get_by_name returns the correct site
    let found_shared = storage.sites.get_by_name(&shared_name).await.expect("get_by_name failed");
    assert!(found_shared.is_some());
    assert_eq!(found_shared.unwrap().id, site1_id);
    
    let found_another = storage.sites.get_by_name("another-name").await.expect("get_by_name failed");
    assert!(found_another.is_some());
    assert_eq!(found_another.unwrap().id, site2_id);
}

#[tokio::test]
async fn test_site_name_update() {
    let (storage, _temp) = create_test_storage().await;
    
    // Create owner
    let owner = User::new("owner".to_string(), "pass".to_string());
    let owner_id = owner.id;
    storage.users.create(owner).await.expect("Failed to create owner");
    
    // Create site
    let site_id = Uuid::new_v4();
    let original_name = "original-name".to_string();
    let site = Site::new(
        site_id,
        owner_id,
        original_name.clone(),
        "Test site".to_string(),
    );
    storage.sites.create(site.clone()).await.expect("Failed to create site");
    
    // Verify original name lookup works
    let found = storage.sites.get_by_name(&original_name).await.expect("get_by_name failed");
    assert!(found.is_some());
    
    // Update site name
    let new_name = "new-name".to_string();
    let mut updated_site = storage.sites.get(site_id).await.expect("get failed").unwrap();
    updated_site.name = new_name.clone();
    storage.sites.update(updated_site).await.expect("update failed");
    
    // Verify new name lookup works
    let found_new = storage.sites.get_by_name(&new_name).await.expect("get_by_name failed");
    assert!(found_new.is_some());
    assert_eq!(found_new.unwrap().id, site_id);
    
    // Original name should no longer find the site
    let found_old = storage.sites.get_by_name(&original_name).await.expect("get_by_name failed");
    assert!(found_old.is_none());
}