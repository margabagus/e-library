pub mod handlers;
pub mod models;

use actix_web::web;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/catalog")
            .service(handlers::get_books)
            .service(handlers::get_book)
            .service(handlers::get_categories)
            .service(handlers::get_books_by_category),
    );
}