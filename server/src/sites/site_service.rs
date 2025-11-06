use crate::{error::AppError, storage::Storage};
use axum::extract::Multipart;
use uuid::Uuid;
use std::sync::Arc;

// Service that encapsulates site-related business logic so handlers stay thin.
pub struct SiteService {
    pub storage: Arc<Storage>,
}

impl SiteService {
    pub fn new(storage: Arc<Storage>) -> Self {
        Self { storage }
    }

    /// Process upload: expects multipart with a "uuid" text field and a "site" file field.
    /// Saves archive to disk, extracts it and updates storage (site record + user site list).
    pub async fn process_upload(&self, user_id: Uuid, mut multipart: Multipart) -> Result<crate::models::Site, AppError> {
        use crate::utils::archive;
        use tracing::debug;

        let mut site_id: Option<Uuid> = None;

        while let Some(field) = multipart.next_field().await.map_err(|e| AppError::Internal(e.to_string()))? {
            let name = field.name().unwrap_or("unknown").to_string();

            match (name.as_ref(), site_id) {
                ("uuid", _) => {
                    let id = field.text().await.map_err(|e| AppError::Internal(e.to_string()))?;
                    site_id = Some(Uuid::parse_str(&id).map_err(|e| AppError::InvalidInput(e.to_string()))?);
                },
                ("site", None) => {
                    return Err(AppError::InvalidInput("reading site archive without uuid ?????".to_string()));
                },
                ("site", Some(id)) => {
                    let site_dir = self.storage.sites.get_site_files_path(id);
                    std::fs::create_dir_all(&site_dir)?;

                    let file_name = field.file_name().ok_or_else(|| AppError::InvalidInput("Uploaded file must have a filename".to_string()))?.to_string();
                    let archive_path = site_dir.join(&file_name);

                    // Stream-save archive and extract using archive util
                    archive::save_archive_field(field, &archive_path).await?;
                    debug!("Saved archive to {:?}", archive_path);

                    archive::extract_archive(&archive_path, &site_dir).await?;
                    tokio::fs::remove_file(&archive_path).await?;
                },
                _ => {}
            }
        }

        let site_id = site_id.ok_or_else(|| AppError::InvalidInput("Missing site uuid".to_string()))?;

        // Create site record
        let site = crate::models::Site::new(site_id, user_id, "Uploaded Site".to_string(), "Site uploaded from CLI".to_string());
        self.storage.sites.create(site.clone())?;

        // Update user's site list
        if let Some(mut user) = self.storage.users.get(user_id)? {
            user.add_site(site_id);
            self.storage.users.update(user)?;
        }

        Ok(site)
    }
}
