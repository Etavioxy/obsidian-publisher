mod auth;
mod config;
mod error;
mod handlers;
mod models;
mod storage;

use auth::{auth_middleware, AuthService, TokenService};
use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};
use config::Config;
use handlers::{auth as auth_handlers, sites as site_handlers, users as user_handlers};
use std::sync::Arc;
use storage::Storage;
use tower_http::{cors::CorsLayer, services::ServeDir, trace::TraceLayer};
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("debug")
        .init();

    // 加载配置
    let config = Arc::new(Config::load()?);
    info!("🔧 Configuration loaded");

    // 初始化存储
    let storage = Arc::new(Storage::new(&config.storage)?);
    info!("💾 Storage initialized");

    // 初始化服务
    let token_service = Arc::new(TokenService::new(config.server.jwt_secret.clone()));
    let auth_service = Arc::new(AuthService::new(
        storage.users.clone(),
        (*token_service).clone(),
        config.auth.allow_plaintext_password,
    ));
    info!("🔒 Services initialized");

    // 公开路由（不需要认证）
    let public_routes = Router::new()
        .route("/api/admin/all", get(site_handlers::admin_all))
        .route("/api/sites", get(site_handlers::list_all))
        .with_state((storage.clone(), config.clone()))
        .route("/auth/register", post(auth_handlers::register))
        .route("/auth/login", post(auth_handlers::login))
        .with_state(auth_service.clone());

    // 需要认证的路由
    let protected_routes = Router::new()
        .route("/auth/me", get(auth_handlers::me))
        .with_state(auth_service.clone())
        //.route("/api/sites", get(site_handlers::list_sites))
        .route("/api/sites", post(site_handlers::upload_site))
        .route("/api/sites/{id}", put(site_handlers::update_site))
        .route("/api/sites/{id}", delete(site_handlers::delete_site))
        .with_state((storage.clone(), config.clone()))
        .route("/user/profile", get(user_handlers::get_user_profile))
        .route("/user/profile", put(user_handlers::update_user_profile))
        .route("/user/stats", get(user_handlers::get_user_stats))
        .route("/user/account", delete(user_handlers::delete_user_account))
        .with_state(storage.clone());

    let auth_middleware_layer =
        middleware::from_fn_with_state(
            token_service.clone(),
            auth_middleware,
        );

    let app = Router::new()
        .merge(protected_routes)
        .route_layer(auth_middleware_layer)
        .merge(public_routes)
        .nest_service("/sites", ServeDir::new(storage.sites.get_site_files_path(uuid::Uuid::nil())))
        //.nest_service("/sites", ServeDir::new(storage.sites.get_site_files_path(uuid::Uuid::nil())))
        //.nest_service("/", ServeDir::new(storage.sites.get_site_files_path(uuid::Uuid::nil())))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", config.server.port)).await?;
    info!("🚀 Server running on {}", config.server.url());
    info!("📚 API endpoints:");
    info!("  POST   /auth/register    - 用户注册");
    info!("  POST   /auth/login       - 用户登录");
    info!("  GET    /auth/me          - 获取当前用户信息");
    info!("  POST   /api/sites        - 上传站点");
    info!("  GET    /api/sites        - 列出用户站点");
    info!("  PUT    /api/sites/:id    - 更新站点信息");
    info!("  DELETE /api/sites/:id    - 删除站点");
    info!("  GET    /user/profile     - 获取用户详细信息");
    info!("  PUT    /user/profile     - 更新用户信息");
    info!("  GET    /user/stats       - 获取用户统计");
    info!("  DELETE /user/account     - 删除用户账户");

    axum::serve(listener, app).await?;

    Ok(())
}