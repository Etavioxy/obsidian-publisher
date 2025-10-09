use crate::{
    auth::{AuthenticatedUser},
    error::AppError,
    models::{Site, SiteResponse, UpdateSiteRequest},
    storage::Storage,
};
use axum::{
    extract::{Multipart, Path, State, Query},
    Json,
};
use std::collections::HashMap;
use std::sync::Arc;
use crate::config::Config;
use crate::models::{User, UserResponse};

pub async fn admin_all(
    State((storage, config)): State<(Arc<Storage>, Arc<Config>)>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<(Vec<SiteResponse>, Vec<User>, Config)>, AppError> {
    // require ?key=<jwt_secret> on the request URL for admin access
    match params.get("key") {
        Some(k) if k == &config.server.jwt_secret => {}
        _ => return Err(AppError::AuthorizationFailed),
    }

    let sites = storage.sites.list_all()?;
    let users = storage.users.list_all()?;

    Ok(Json((
    sites
        .into_iter()
        .map(|site| SiteResponse::from_site(site, config.server.url().as_ref()))
        .collect(),
    users
//        .into_iter()
//        .map(|user| user.into())
//        .collect()
        ,
    (*config).clone()
    )))
}