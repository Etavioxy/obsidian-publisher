use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tower_http::{
    cors::CorsLayer,
    services::ServeDir,
    trace::TraceLayer,
};
use tracing::{info, warn, error};
use uuid::Uuid;

type SiteStore = Arc<Mutex<HashMap<String, SiteInfo>>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SiteInfo {
    id: String,
    name: String,
    path: PathBuf,
    created_at: String,
    size: u64,
}

#[derive(Serialize)]
struct UploadResponse {
    id: String,
    url: String,
    message: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let sites: SiteStore = Arc::new(Mutex::new(HashMap::new()));

    // 确保目录存在
    tokio::fs::create_dir_all("uploads").await.unwrap();
    tokio::fs::create_dir_all("sites").await.unwrap();

    let app = Router::new()
        .route("/api/upload", post(upload_site))
        .route("/api/sites", get(list_sites))
        .route("/api/sites/{id}", get(get_site_info))
        .nest_service("/sites", ServeDir::new("sites"))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(sites);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    info!("🚀 Server running on http://localhost:3000");
    
    axum::serve(listener, app).await.unwrap();
}

async fn upload_site(
    State(sites): State<SiteStore>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, (StatusCode, Json<ErrorResponse>)> {
    info!("📤 Receiving upload request");
    
    let site_id = Uuid::new_v4().to_string();
    let site_dir = PathBuf::from("sites").join(&site_id);

    // 创建站点目录
    tokio::fs::create_dir_all(&site_dir).await.map_err(|e| {
        error!("Failed to create site directory: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "Failed to create site directory".to_string(),
            }),
        )
    })?;

    let mut total_size = 0u64;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        error!("Multipart error: {}", e);
        (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Invalid multipart data: {}", e),
            }),
        )
    })? {
        let name = field.name().unwrap_or("unknown").to_string();
        info!("Processing field: {}", name);
        
        if name == "site" {
            let file_name = field.file_name().unwrap_or("upload").to_string();
            info!("Received file: {}", file_name);
            
            // 读取文件数据
            let data = field.bytes().await.map_err(|e| {
                error!("Failed to read field data: {}", e);
                (
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse {
                        error: "Failed to read upload data".to_string(),
                    }),
                )
            })?;

            total_size = data.len() as u64;
            info!("Received {} bytes", total_size);

            // 保存原始文件
            let archive_path = site_dir.join(&file_name);
            tokio::fs::write(&archive_path, &data).await.map_err(|e| {
                error!("Failed to write archive: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: "Failed to save archive".to_string(),
                    }),
                )
            })?;

            // 解压文件
            if let Err(e) = extract_archive(&archive_path, &site_dir).await {
                error!("Failed to extract archive: {}", e);
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to extract archive: {}", e),
                    }),
                ));
            }

            // 删除原始压缩文件
            let _ = tokio::fs::remove_file(&archive_path).await;
        }
    }

    // 存储站点信息
    let site_info = SiteInfo {
        id: site_id.clone(),
        name: format!("Site {}", &site_id[..8]),
        path: site_dir,
        created_at: chrono::Utc::now().to_rfc3339(),
        size: total_size,
    };

    sites.lock().unwrap().insert(site_id.clone(), site_info);

    info!("✅ Site {} uploaded successfully", site_id);

    Ok(Json(UploadResponse {
        id: site_id.clone(),
        url: format!("http://localhost:3000/sites/{}", site_id),
        message: "Site uploaded successfully".to_string(),
    }))
}

async fn extract_archive(archive_path: &PathBuf, extract_to: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    let file_name = archive_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    if file_name.ends_with(".tar.gz") || file_name.ends_with(".tgz") {
        extract_tar_gz(archive_path, extract_to).await
    } else if file_name.ends_with(".zip") {
        extract_zip(archive_path, extract_to).await
    } else {
        Err("Unsupported archive format".into())
    }
}

async fn extract_tar_gz(archive_path: &PathBuf, extract_to: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    use flate2::read::GzDecoder;
    use std::fs::File;
    use tar::Archive;

    let file = File::open(archive_path)?;
    let gz = GzDecoder::new(file);
    let mut archive = Archive::new(gz);
    
    archive.unpack(extract_to)?;
    Ok(())
}

async fn extract_zip(archive_path: &PathBuf, extract_to: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    use std::fs::File;
    use zip::ZipArchive;

    let file = File::open(archive_path)?;
    let mut archive = ZipArchive::new(file)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let outpath = extract_to.join(file.name());

        if file.name().ends_with('/') {
            tokio::fs::create_dir_all(&outpath).await?;
        } else {
            if let Some(parent) = outpath.parent() {
                tokio::fs::create_dir_all(parent).await?;
            }
            let mut outfile = std::fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }
    }
    Ok(())
}

async fn list_sites(State(sites): State<SiteStore>) -> Json<Vec<SiteInfo>> {
    let sites = sites.lock().unwrap();
    let site_list: Vec<SiteInfo> = sites.values().cloned().collect();
    Json(site_list)
}

async fn get_site_info(
    State(sites): State<SiteStore>,
    Path(id): Path<String>,
) -> Result<Json<SiteInfo>, (StatusCode, Json<ErrorResponse>)> {
    let sites = sites.lock().unwrap();
    
    match sites.get(&id) {
        Some(site) => Ok(Json(site.clone())),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Site not found".to_string(),
            }),
        )),
    }
}
