use actix_web::web;
use crate::auth;
use crate::catalog;
use crate::reader;
use crate::analytics;

pub fn configure(cfg: &mut web::ServiceConfig) {
    // Configure all routes for our API
    
    // Auth routes
    auth::configure(cfg);
    
    // Catalog routes
    catalog::configure(cfg);
    
    // Reader routes
    reader::configure(cfg);
    
    // Analytics routes
    analytics::configure(cfg);
    
    // Health check endpoint
    cfg.route("/health", web::get().to(health_check));
}

// Simple health check endpoint
async fn health_check() -> actix_web::HttpResponse {
    actix_web::HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}