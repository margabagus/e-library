pub mod handlers;
pub mod models;

use actix_web::web;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/analytics")
            .service(handlers::record_reading_analytics)
            .service(handlers::record_bulk_analytics)
            .service(handlers::get_user_stats)
    );
}