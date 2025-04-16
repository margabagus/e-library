use deadpool_postgres::{Config, Pool, Runtime};
use tokio_postgres::NoTls;
use std::error::Error;

pub type DbPool = Pool;

pub async fn init_pool(database_url: &str) -> Result<DbPool, Box<dyn Error>> {
    let config = Config::new()
        .parse(database_url)?;

    let pool = config.create_pool(Some(Runtime::Tokio1), NoTls)?;
    
    // Test the connection
    let client = pool.get().await?;
    client.query("SELECT 1", &[]).await?;
    
    log::info!("Successfully connected to the database");
    
    Ok(pool)
}