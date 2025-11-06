use crate::error::AppError;
use std::{io, path::Path};
use tokio::{fs::File, io::BufWriter};
use tokio_util::io::StreamReader;
use axum::{
    body::Bytes,
    BoxError,
};
use futures_util::{Stream, TryStreamExt};
use tracing::debug;

// Save a `Stream` to a file, see https://github.com/tokio-rs/axum/blob/main/examples/stream-to-file/src/main.rs
pub async fn save_archive_field<S, E>(stream: S, archive_path: &Path) -> Result<(), AppError>
where
    S: Stream<Item = Result<Bytes, E>>,
    E: Into<BoxError>,
{
    debug!("Saving archive field to {:?}", archive_path);
    async {
        // Convert the stream into an `AsyncRead`.
        let body_with_io_error = stream.map_err(io::Error::other);
        let mut body_reader = std::pin::pin!(StreamReader::new(body_with_io_error));

        // Create the file. `File` implements `AsyncWrite`.
        let mut file = BufWriter::new(File::create(archive_path).await?);

        // Copy the body into the file.
        tokio::io::copy(&mut body_reader, &mut file).await?;

        Ok::<_, io::Error>(())
    }
    .await
    .map_err(|e| AppError::Internal(e.to_string()))
}

/// Extract archive without blocking the async runtime by running sync extraction in a blocking task.
pub async fn extract_archive(archive_path: &Path, extract_to: &Path) -> Result<(), AppError> {
    let archive_path = archive_path.to_owned();
    let extract_to = extract_to.to_owned();

    tokio::task::spawn_blocking(move || extract_archive_sync(&archive_path, &extract_to))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}

/// Synchronous extraction entry point. Returns AppError for any failure.
pub fn extract_archive_sync(archive_path: &Path, extract_to: &Path) -> Result<(), AppError> {
    let file_name = archive_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    if file_name.ends_with(".tar.gz") || file_name.ends_with(".tgz") {
        extract_tar_gz_sync(archive_path, extract_to)
    } else if file_name.ends_with(".zip") {
        extract_zip_sync(archive_path, extract_to)
    } else {
        Err(AppError::InvalidInput("Unsupported archive format".to_string()))
    }
}

fn path_contains_parent_or_root(p: &std::path::Path) -> bool {
    use std::path::Component;
    p.components().any(|c| matches!(c, Component::ParentDir | Component::RootDir | Component::Prefix(_)))
}

fn extract_tar_gz_sync(archive_path: &Path, extract_to: &Path) -> Result<(), AppError> {
    debug!("Extracting tar.gz archive {:?} to {:?}", archive_path, extract_to);
    use flate2::read::GzDecoder;
    use std::fs::File;
    use tar::Archive;

    let file = File::open(archive_path)?;
    let gz = GzDecoder::new(file);
    let mut archive = Archive::new(gz);

    // Iterate entries and extract safely
    for entry in archive.entries()? {
        let mut entry = entry.map_err(|e| AppError::Internal(e.to_string()))?;
        let entry_path = entry.path().map_err(|e| AppError::Internal(e.to_string()))?;

        // Reject entries with absolute paths or parent dir components
        if path_contains_parent_or_root(&entry_path) {
            return Err(AppError::InvalidInput(format!("Tar archive contains unsafe path: {:?}", entry_path)));
        }

        // Compute destination path
        let dest = extract_to.join(&entry_path);

        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }

        // Unpack this entry to the destination
        entry.unpack(&dest)
            .map_err(|e| AppError::Internal(e.to_string()))?;
    }

    Ok(())
}

fn extract_zip_sync(archive_path: &Path, extract_to: &Path) -> Result<(), AppError> {
    debug!("Extracting zip archive {:?} to {:?}", archive_path, extract_to);
    use std::fs::File;
    use zip::ZipArchive;

    let file = File::open(archive_path)?;
    let mut archive = ZipArchive::new(file).map_err(|e| AppError::Internal(e.to_string()))?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| AppError::Internal(e.to_string()))?;
        let name = file.name();
        let path = std::path::Path::new(name);

        // Reject absolute paths or parent dir traversals
        if path.is_absolute() || path_contains_parent_or_root(path) {
            return Err(AppError::InvalidInput(format!("Zip archive contains unsafe path: {}", name)));
        }

        let outpath = extract_to.join(path);

        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath)?;
        } else {
            if let Some(parent) = outpath.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let mut outfile = std::fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| AppError::Internal(e.to_string()))?;
        }
    }

    Ok(())
}
