mod auth;
mod config;
mod error;
mod utils;
mod handlers;
mod models;
mod storage;

use auth::{auth_middleware, AuthService, TokenService};
use axum::{
    extract::DefaultBodyLimit,
    middleware,
    response::Redirect,
    routing::{delete, get, post, put},
    Router,
};
use config::Config;
use handlers::{auth as auth_handlers, sites as site_handlers, users as user_handlers, admin as admin_handlers};
use std::sync::Arc;
use storage::Storage;
use tower_http::{cors::CorsLayer, limit::RequestBodyLimitLayer, services::{ServeDir, ServeFile}, trace::TraceLayer};
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("debug")
        .init();

    let args: Vec<String> = std::env::args().collect();
    let (show_help, config_path) = utils::parse_args::parse_args(&args);
    if show_help {
        let prog = args.get(0).map(|s| s.as_str()).unwrap_or("server");
        println!("Usage: {} --config <path>\n\nOptions:\n  --config <path>    Specify config file (default: config.json)\n  -h, --help         Show this help\n", prog);
        return Ok(());
    }

    let config = Arc::new(Config::load_from(&config_path)?);
    info!("🔧 Configuration loaded");

    // 初始化存储 (async to support ORM connection)
    let storage = Arc::new(Storage::new(&config.storage).await?);
    info!("💾 Storage initialized");

    // 初始化服务
    let token_service = Arc::new(TokenService::new(
        config.server.jwt_secret.clone(),
        config.auth.token_expiration_hours,
    ));
    let auth_service = Arc::new(AuthService::new(
        storage.users.clone(),
        (*token_service).clone(),
        config.auth.allow_plaintext_password,
    ));
    info!("🔒 Services initialized");

    // 公开路由（不需要认证）
    let public_routes = Router::new()
        .route("/api/admin/all", get(admin_handlers::admin_all))
        .route("/api/admin/sites", get(admin_handlers::admin_sites))
        .route("/api/admin/storage", get(admin_handlers::admin_storage))
        .route("/api/sites", get(site_handlers::list_all))
        .with_state((storage.clone(), config.clone()))
        .route("/auth/register", post(auth_handlers::register))
        .route("/auth/login", post(auth_handlers::login))
        .with_state(auth_service.clone());

    // 需要认证的路由
    let protected_routes = Router::new()
        .route("/auth/me", get(auth_handlers::me))
        .with_state(auth_service.clone())
        .route("/api/sites", post(site_handlers::upload_site))
        .route("/api/sites/{id}", put(site_handlers::update_site))
        .route("/api/sites/{id}", delete(site_handlers::delete_site))
        .route("/user/stats", get(user_handlers::get_user_stats))
        .with_state((storage.clone(), config.clone()))
        .route("/user/profile", get(user_handlers::get_user_profile))
        .route("/user/profile", put(user_handlers::update_user_profile))
        .route("/user/account", delete(user_handlers::delete_user_account))
        .with_state(storage.clone());

    let auth_middleware_layer =
        middleware::from_fn_with_state(
            token_service.clone(),
            auth_middleware,
        );

    let app = Router::new()
        // Public API routes (no auth required)
        .merge(public_routes)
        // Protected API routes (auth required)
        .merge(protected_routes.route_layer(auth_middleware_layer))
        // Serve published sites (no auth required)
        .nest_service("/sites", ServeDir::new(storage.sites.get_site_files_path_str("")))
        // Serve the web UI as root with SPA fallback (no auth required)
        // This must be last so API routes take precedence
        .fallback_service(
            ServeDir::new("webui/dist")
                .not_found_service(ServeFile::new("webui/dist/index.html")),
        )
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .layer(DefaultBodyLimit::disable())
        .layer(RequestBodyLimitLayer::new(
            250 * 1024 * 1024, /* 250mb */
        ));

    let listener = tokio::net::TcpListener::bind(config.server.bind_url()).await?;
    info!("🚀 Server running on {}", config.server.bind_url());
    info!("🌐 Web UI: http://{}/", config.server.bind_url());
    info!("");
    info!("📚 Public API endpoints:");
    info!("  GET    /*                - Admin Web UI (SPA, fallback)");
    info!("  GET    /sites/*          - Published sites (static files)");
    info!("  GET    /api/sites        - 列出站点");
    info!("  POST   /auth/register    - 用户注册");
    info!("  POST   /auth/login       - 用户登录");
    info!("  GET    /api/admin/all    - Debugging");
    info!("  GET    /api/admin/sites  - DB <-> disk mismatch check (requires ?key=JWT_SECRET)");
    info!("  GET    /api/admin/storage - Storage usage summary (requires ?key=JWT_SECRET)");
    info!("");
    info!("🔒 Protected API endpoints (require authentication):");
    info!("  GET    /auth/me          - 获取当前用户信息");
    info!("  POST   /api/sites        - 上传站点");
    info!("  PUT    /api/sites/:id    - 更新站点信息");
    info!("  DELETE /api/sites/:id    - 删除站点");
    info!("  GET    /user/profile     - 获取用户详细信息");
    info!("  PUT    /user/profile     - 更新用户信息");
    info!("  GET    /user/stats       - 获取用户统计");
    info!("  DELETE /user/account     - 删除用户账户");

    axum::serve(listener, app).await?;

    Ok(())
}