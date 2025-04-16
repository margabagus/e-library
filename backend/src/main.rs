use actix_cors::Cors;
use actix_web::{middleware, web, App, HttpServer};
use dotenv::dotenv;
use std::env;
use log::info;

mod auth;
mod catalog;
mod reader;
mod analytics;
mod db;
mod config;
mod routes;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();

    // Initialize configuration
    let config = config::Config::from_env().expect("Failed to load configuration");
    
    // Set up database connection pool
    let pool = db::init_pool(&config.database_url).await.expect("Failed to create pool");
    
    // Log startup information
    info!("Starting server at http://{}:{}", config.host, config.port);

    // Start HTTP server
    HttpServer::new(move || {
        // Configure CORS
        let cors = Cors::default()
            .allowed_origin("https://book.margabagus.com")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
            .allowed_headers(vec!["Authorization", "Content-Type"])
            .max_age(3600);

        App::new()
            // Add database pool to app state
            .app_data(web::Data::new(pool.clone()))
            // Add config to app state
            .app_data(web::Data::new(config.clone()))
            // Enable logger and compression
            .wrap(middleware::Logger::default())
            .wrap(middleware::Compress::default())
            .wrap(cors)
            // Configure routes
            .configure(routes::configure)
    })
    .bind(format!("{}:{}", config.host, config.port))?
    .run()
    .await
}