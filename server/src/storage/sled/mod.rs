pub mod user_storage;
pub mod site_storage;

pub use user_storage::UserStorage;
pub use site_storage::SiteStorage;

pub const DB_USERS: &str = "users.db";
pub const DB_SITES: &str = "sites.db";
pub const DB_USER_SITES: &str = "user_sites.db";