use crate::error::AppError;
use std::{io, pin::pin, path::Path};
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
        let mut body_reader = pin!(StreamReader::new(body_with_io_error));

        // Create the file. `File` implements `AsyncWrite`.
        let mut file = BufWriter::new(File::create(archive_path).await?);

        // Copy the body into the file.
        tokio::io::copy(&mut body_reader, &mut file).await?;

        Ok::<_, io::Error>(())
    }
    .await
    .map_err(|e| AppError::Internal(e.to_string()))
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
    debug!("Extracting tar.gz archive {:?} to {:?}", archive_path, extract_to);
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
    debug!("Extracting zip archive {:?} to {:?}", archive_path, extract_to);
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

pub async fn extract_archive_with_replace(
    archive_path: &Path,
    extract_to: &Path,
    replacement: Option<(String, String)>,
) -> Result<(), AppError> {
    let file_name = archive_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    if file_name.ends_with(".tar.gz") || file_name.ends_with(".tgz") {
        extract_tar_gz_with_replace(archive_path, extract_to, replacement).await
    } else if file_name.ends_with(".zip") {
        extract_zip_with_replace(archive_path, extract_to, replacement).await
    } else {
        Err(AppError::InvalidInput("Unsupported archive format".to_string()))
    }
}

pub async fn extract_tar_gz_with_replace(
    archive_path: &Path,
    extract_to: &Path,
    replacement: Option<(String, String)>,
) -> Result<(), AppError> {
    debug!("Extracting tar.gz archive with optional replace {:?} to {:?}", archive_path, extract_to);

    use flate2::read::GzDecoder;
    use std::fs::File;
    use tar::Archive;
    use std::io::Read;

    let file = File::open(archive_path)?;
    let gz = GzDecoder::new(file);
    let mut archive = Archive::new(gz);

    // Prepare output dirs
    let original_dir = extract_to.join("original");
    let replaced_dir = extract_to.join("replaced");
    std::fs::create_dir_all(&original_dir)?;
    std::fs::create_dir_all(&replaced_dir)?;

    for entry_res in archive.entries()? {
        let mut entry = entry_res.map_err(|e| AppError::Internal(e.to_string()))?;
        let path = match entry.path() {
            Ok(p) => p.into_owned(),
            Err(e) => return Err(AppError::Internal(e.to_string())),
        };

        let out_original = original_dir.join(&path);
        let out_replaced = replaced_dir.join(&path);

        if entry.header().entry_type().is_dir() {
            std::fs::create_dir_all(&out_original)?;
            std::fs::create_dir_all(&out_replaced)?;
            continue;
        }

        if let Some(parent) = out_original.parent() {
            std::fs::create_dir_all(parent)?;
        }
        if let Some(parent) = out_replaced.parent() {
            std::fs::create_dir_all(parent)?;
        }

        // Read entry into memory (per-file streaming)
        let mut buf = Vec::new();
        entry.read_to_end(&mut buf)
            .map_err(|e| AppError::Internal(e.to_string()))?;

        // write original bytes
        std::fs::write(&out_original, &buf)?;

        // if replacement provided and file is valid UTF-8, do text replace
        if let Some((ref pattern, ref replacement)) = replacement {
            if let Ok(text) = String::from_utf8(buf.clone()) {
                let replaced_text = text.replace(pattern, replacement);
                std::fs::write(&out_replaced, replaced_text.as_bytes())?;
            } else {
                // binary file, just write original bytes into replaced folder as well
                std::fs::write(&out_replaced, &buf)?;
            }
        } else {
            // no replacement requested, just copy original to replaced folder as-is
            std::fs::write(&out_replaced, &buf)?;
        }
    }

    Ok(())
}

async fn extract_zip_with_replace(
    archive_path: &Path,
    extract_to: &Path,
    replacement: Option<(String, String)>,
) -> Result<(), AppError> {
    debug!("Extracting zip archive with optional replace {:?} to {:?}", archive_path, extract_to);
    use std::fs::File;
    use zip::ZipArchive;
    use std::io::Read;

    let file = File::open(archive_path)?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let original_dir = extract_to.join("original");
    let replaced_dir = extract_to.join("replaced");
    std::fs::create_dir_all(&original_dir)?;
    std::fs::create_dir_all(&replaced_dir)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| AppError::Internal(e.to_string()))?;

        // Use sanitized name when available to avoid absolute paths
        let name = file.name().to_string();
        let out_original = original_dir.join(&name);
        let out_replaced = replaced_dir.join(&name);

        if file.name().ends_with('/') {
            std::fs::create_dir_all(&out_original)?;
            std::fs::create_dir_all(&out_replaced)?;
            continue;
        }

        if let Some(parent) = out_original.parent() {
            std::fs::create_dir_all(parent)?;
        }
        if let Some(parent) = out_replaced.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let mut buf = Vec::new();
        file.read_to_end(&mut buf)
            .map_err(|e| AppError::Internal(e.to_string()))?;

        // write original
        std::fs::write(&out_original, &buf)?;

        if let Some((ref pattern, ref replacement)) = replacement {
            if let Ok(text) = String::from_utf8(buf.clone()) {
                let replaced_text = text.replace(pattern, replacement);
                std::fs::write(&out_replaced, replaced_text.as_bytes())?;
            } else {
                std::fs::write(&out_replaced, &buf)?;
            }
        } else {
            std::fs::write(&out_replaced, &buf)?;
        }
    }
    Ok(())
}
