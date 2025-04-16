pub mod handlers;
pub mod formats;

use actix_web::web;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/reader")
            .service(handlers::get_book_content)
            .service(handlers::save_reading_progress)
            .service(handlers::get_reading_progress)
    );
}