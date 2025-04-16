use serde::Deserialize;
use std::env;
use std::time::Duration;

#[derive(Clone, Debug, Deserialize)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expires_in: Duration,
    pub book_storage_path: String,
}

impl Config {
    pub fn from_env() -> Result<Self, env::VarError> {
        let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let port = env::var("PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse()
            .expect("PORT must be a number");
        let database_url = env::var("DATABASE_URL")?;
        let jwt_secret = env::var("JWT_SECRET")?;
        let jwt_expiration = env::var("JWT_EXPIRATION")
            .unwrap_or_else(|_| "86400".to_string())
            .parse()
            .expect("JWT_EXPIRATION must be a number");
        let book_storage_path = env::var("BOOK_STORAGE_PATH")
            .unwrap_or_else(|_| "./storage/books".to_string());

        Ok(Config {
            host,
            port,
            database_url,
            jwt_secret,
            jwt_expires_in: Duration::from_secs(jwt_expiration),
            book_storage_path,
        })
    }
}