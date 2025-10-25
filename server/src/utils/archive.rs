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
