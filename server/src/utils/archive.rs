use crate::error::AppError;
use std::path::Path;
use axum::extract::multipart::Field;
use futures_util::{StreamExt, TryStreamExt};
use tokio::io::AsyncWriteExt;

use tracing::info;

pub async fn save_archive_field(field: Field<'_>, archive_path: &Path) -> Result<(), AppError> {
    info!("Saving archive field to {:?}", archive_path);
    let mut outfile = tokio::fs::File::create(&archive_path).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let mut stream = field.into_stream();
    while let Some(chunk_res) = stream.next().await {
        let chunk = chunk_res.map_err(|e| AppError::Internal(e.to_string()))?;
        outfile.write_all(chunk.as_ref()).await.map_err(|e| AppError::Internal(e.to_string()))?;
    }
    outfile.flush().await.map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

pub async fn extract_archive(archive_path: &Path, extract_to: &Path) -> Result<(), AppError> {
    let file_name = archive_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    if file_name.ends_with(".tar.gz") || file_name.ends_with(".tgz") {
        extract_tar_gz(archive_path, extract_to).await
    } else if file_name.ends_with(".zip") {
        extract_zip(archive_path, extract_to).await
    } else {
        Err(AppError::InvalidInput("Unsupported archive format".to_string()))
    }
}

pub async fn extract_tar_gz(archive_path: &Path, extract_to: &Path) -> Result<(), AppError> {
    use flate2::read::GzDecoder;
    use std::fs::File;
    use tar::Archive;

    let file = File::open(archive_path)?;
    let gz = GzDecoder::new(file);
    let mut archive = Archive::new(gz);
    
    archive.unpack(extract_to)
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

async fn extract_zip(archive_path: &Path, extract_to: &Path) -> Result<(), AppError> {
    use std::fs::File;
    use zip::ZipArchive;

    let file = File::open(archive_path)?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| AppError::Internal(e.to_string()))?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let outpath = extract_to.join(file.name());

        if file.name().ends_with('/') {
            tokio::fs::create_dir_all(&outpath).await?;
        } else {
            if let Some(parent) = outpath.parent() {
                tokio::fs::create_dir_all(parent).await?;
            }
            let mut outfile = std::fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| AppError::Internal(e.to_string()))?;
        }
    }
    Ok(())
}
