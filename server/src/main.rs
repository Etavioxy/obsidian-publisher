use axum::{
    extract::{Multipart, Path},
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
};
use tracing::{info, warn, error};
use uuid::Uuid;
use tokio::io::AsyncWriteExt;

type SiteStore = Arc<Mutex<HashMap<String, SiteInfo>>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SiteInfo {
    id: String,
    name: String,
    path: PathBuf,
    created_at: String,
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
    tracing_subscriber::init();

    let sites: SiteStore = Arc::new(Mutex::new(HashMap::new()));

    // 确保目录存在
    tokio::fs::create_dir_all("uploads").await.unwrap();
    tokio::fs::create_dir_all("sites").await.unwrap();

    let app = Router::new()
        .route("/api/upload", post(upload_site))
        .route("/api/sites", get(list_sites))
        .route("/api/sites/:id", get(get_site_info))
        .nest_service("/sites/:id", ServeDir::new("sites"))
        .layer(CorsLayer::permissive())
        .with_state(sites);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    info!("🚀 Server running on http://localhost:3000");
    info!("📝 Test upload with: curl -X POST -F \"site=@your-archive.tar.gz\" http://localhost:3000/api/upload");
    
    axum::serve(listener, app).await.unwrap();
}

async fn upload_site(
    axum::extract::State(sites): axum::extract::State<SiteStore>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, (StatusCode, Json<ErrorResponse>)> {
    let site_id = Uuid::new_v4().to_string();
    let site_dir = PathBuf::from("sites").join(&site_id);

    info!("📤 Processing upload for site: {}", site_id);

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

    let mut processed_files = false;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        error!("Multipart parsing error: {}", e);
        (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Invalid multipart data: {}", e),
            }),
        )
    })? {
        let field_name = field.name().unwrap_or("unknown").to_string();
        info!("📄 Processing field: {}", field_name);
        
        if field_name == "site" {
            let file_name = field.file_name().unwrap_or("upload").to_string();
            info!("📁 Processing file: {}", file_name);
            
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

            info!("📊 Received {} bytes", data.len());

            // 保存上传的文件
            let upload_path = PathBuf::from("uploads").join(format!("{}.tar.gz", site_id));
            let mut file = tokio::fs::File::create(&upload_path).await.map_err(|e| {
                error!("Failed to create upload file: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: "Failed to save upload".to_string(),
                    }),
                )
            })?;
            
            file.write_all(&data).await.map_err(|e| {
                error!("Failed to write upload data: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: "Failed to write upload data".to_string(),
                    }),
                )
            })?;

            // 解压文件
            extract_archive(&upload_path, &site_dir).await.map_err(|e| {
                error!("Failed to extract archive: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to extract archive: {}", e),
                    }),
                )
            })?;

            // 清理上传的压缩文件
            let _ = tokio::fs::remove_file(&upload_path).await;
            
            processed_files = true;
            info!("✅ Successfully processed upload for site: {}", site_id);
        }
    }

    if !processed_files {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "No site file found in upload".to_string(),
            }),
        ));
    }

    // 存储站点信息
    let site_info = SiteInfo {
        id: site_id.clone(),
        name: format!("Site {}", &site_id[..8]),
        path: site_dir,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    sites.lock().unwrap().insert(site_id.clone(), site_info);

    info!("✅ Site {} uploaded and extracted successfully", site_id);

    Ok(Json(UploadResponse {
        id: site_id.clone(),
        url: format!("http://localhost:3000/sites/{}", site_id),
        message: "Site uploaded successfully".to_string(),
    }))
}

async fn extract_archive(archive_path: &PathBuf, extract_to: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    use flate2::read::GzDecoder;
    use std::fs::File;
    use tar::Archive;

    let file = File::open(archive_path)?;
    let gz = GzDecoder::new(file);
    let mut archive = Archive::new(gz);
    
    archive.unpack(extract_to)?;
    
    Ok(())
}

async fn list_sites(
    axum::extract::State(sites): axum::extract::State<SiteStore>,
) -> Json<Vec<SiteInfo>> {
    let sites = sites.lock().unwrap();
    let site_list: Vec<SiteInfo> = sites.values().cloned().collect();
    Json(site_list)
}

async fn get_site_info(
    axum::extract::State(sites): axum::extract::State<SiteStore>,
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
