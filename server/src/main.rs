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
use tracing::{info, warn};
use uuid::Uuid;

type SiteStore = Arc<Mutex<HashMap<String, SiteInfo>>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SiteInfo {
    id: String,
    name: String,
    path: PathBuf,
    created_at: chrono::DateTime<chrono::Utc>,
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

    // 确保上传目录存在
    tokio::fs::create_dir_all("uploads").await.unwrap();
    tokio::fs::create_dir_all("sites").await.unwrap();

    let app = Router::new()
        .route("/api/upload", post(upload_site))
        .route("/api/sites", get(list_sites))
        .route("/api/sites/{id}", get(get_site_info))
        .nest_service("/sites/{id}", ServeDir::new("sites"))
        .layer(CorsLayer::permissive())
        .with_state(sites);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    info!("🚀 Server running on http://localhost:3000");
    
    axum::serve(listener, app).await.unwrap();
}

async fn upload_site(
    axum::extract::State(sites): axum::extract::State<SiteStore>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, (StatusCode, Json<ErrorResponse>)> {
    let site_id = Uuid::new_v4().to_string();
    let site_dir = PathBuf::from("sites").join(&site_id);

    // 创建站点目录
    tokio::fs::create_dir_all(&site_dir).await.map_err(|e| {
        warn!("Failed to create site directory: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "Failed to create site directory".to_string(),
            }),
        )
    })?;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        warn!("Multipart error: {}", e);
        (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Invalid multipart data".to_string(),
            }),
        )
    })? {
        let name = field.name().unwrap_or("unknown").to_string();
        
        if name == "site" {
            // 处理上传的站点文件
            let data = field.bytes().await.map_err(|e| {
                warn!("Failed to read field data: {}", e);
                (
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse {
                        error: "Failed to read upload data".to_string(),
                    }),
                )
            })?;

            // 简化处理：假设上传的是单个 HTML 文件或目录内容
            // 实际应该处理 zip/tar 解压
            let index_path = site_dir.join("index.html");
            tokio::fs::write(&index_path, &data).await.map_err(|e| {
                warn!("Failed to write site files: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: "Failed to save site".to_string(),
                    }),
                )
            })?;
        }
    }

    // 存储站点信息
    let site_info = SiteInfo {
        id: site_id.clone(),
        name: format!("Site {}", &site_id[..8]),
        path: site_dir,
        created_at: chrono::Utc::now(),
    };

    sites.lock().unwrap().insert(site_id.clone(), site_info);

    info!("✅ Site {} uploaded successfully", site_id);

    Ok(Json(UploadResponse {
        id: site_id.clone(),
        url: format!("http://localhost:3000/sites/{}", site_id),
        message: "Site uploaded successfully".to_string(),
    }))
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
