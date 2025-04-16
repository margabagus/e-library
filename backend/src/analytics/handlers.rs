use actix_web::{web, HttpResponse, Responder, post, get, HttpRequest};
use uuid::Uuid;
use chrono::Utc;

use crate::auth::verify_token;
use crate::config::Config;
use crate::db::DbPool;
use super::models::{ReadingAnalytics, BulkAnalytics, UserStats};

#[post("/reading")]
pub async fn record_reading_analytics(
    req: HttpRequest,
    body: web::Json<ReadingAnalytics>,
    pool: web::Data<DbPool>,
    config: web::Data<Config>,
) -> impl Responder {
    // Extract token from authorization header
    let auth_header = match req.headers().get("Authorization") {
        Some(header) => header,
        None => return HttpResponse::Unauthorized().json("No authorization header"),
    };

    let auth_str = match auth_header.to_str() {
        Ok(str) => str,
        Err(_) => return HttpResponse::Unauthorized().json("Invalid authorization header"),
    };

    // Check if it's a Bearer token
    if !auth_str.starts_with("Bearer ") {
        return HttpResponse::Unauthorized().json("Invalid token format");
    }

    let token = &auth_str[7..]; // Remove "Bearer " prefix

    // Verify the token
    let claims = match verify_token(token, &config) {
        Ok(claims) => claims,
        Err(_) => return HttpResponse::Unauthorized().json("Invalid token"),
    };

    // Get user ID from claims
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return HttpResponse::InternalServerError().json("Invalid user ID in token"),
    };

    // Parse book ID
    let book_id = match Uuid::parse_str(&body.book_id) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().json("Invalid book ID"),
    };

    // Insert or update analytics record
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    let result = client
        .execute(
            "INSERT INTO user_analytics (user_id, book_id, pages_read, reading_time_seconds, session_date)
             VALUES ($1, $2, $3, $4, CURRENT_DATE)
             ON CONFLICT (user_id, book_id, session_date)
             DO UPDATE SET 
                pages_read = user_analytics.pages_read + $3,
                reading_time_seconds = user_analytics.reading_time_seconds + $4",
            &[&user_id, &book_id, &body.pages_read, &body.reading_time_seconds],
        )
        .await;

    match result {
        Ok(_) => HttpResponse::Ok().json("Analytics recorded successfully"),
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().json("Error recording analytics")
        }
    }
}

#[post("/bulk")]
pub async fn record_bulk_analytics(
    req: HttpRequest,
    body: web::Json<Vec<BulkAnalytics>>,
    pool: web::Data<DbPool>,
    config: web::Data<Config>,
) -> impl Responder {
    // Extract token from authorization header
    let auth_header = match req.headers().get("Authorization") {
        Some(header) => header,
        None => return HttpResponse::Unauthorized().json("No authorization header"),
    };

    let auth_str = match auth_header.to_str() {
        Ok(str) => str,
        Err(_) => return HttpResponse::Unauthorized().json("Invalid authorization header"),
    };

    // Check if it's a Bearer token
    if !auth_str.starts_with("Bearer ") {
        return HttpResponse::Unauthorized().json("Invalid token format");
    }

    let token = &auth_str[7..]; // Remove "Bearer " prefix

    // Verify the token
    let claims = match verify_token(token, &config) {
        Ok(claims) => claims,
        Err(_) => return HttpResponse::Unauthorized().json("Invalid token"),
    };

    // Get user ID from claims
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return HttpResponse::InternalServerError().json("Invalid user ID in token"),
    };

    // Get database client
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    // Start a transaction
    let tx = match client.transaction().await {
        Ok(tx) => tx,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    // Process each analytics record
    for analytics in body.iter() {
        // Parse book ID
        let book_id = match Uuid::parse_str(&analytics.book_id) {
            Ok(id) => id,
            Err(_) => continue, // Skip invalid book IDs
        };

        // Parse the timestamp
        let timestamp = match chrono::DateTime::parse_from_rfc3339(&analytics.timestamp) {
            Ok(dt) => dt.with_timezone(&Utc),
            Err(_) => Utc::now(), // Use current time if invalid
        };

        // Insert or update analytics record
        let result = tx
            .execute(
                "INSERT INTO user_analytics (user_id, book_id, pages_read, reading_time_seconds, session_date)
                 VALUES ($1, $2, $3, $4, $5::date)
                 ON CONFLICT (user_id, book_id, session_date)
                 DO UPDATE SET 
                    pages_read = user_analytics.pages_read + $3,
                    reading_time_seconds = user_analytics.reading_time_seconds + $4",
                &[
                    &user_id,
                    &book_id,
                    &analytics.pages_read,
                    &analytics.reading_time_seconds,
                    &timestamp,
                ],
            )
            .await;

        if let Err(e) = result {
            eprintln!("Database error: {}", e);
            // Continue with next record, don't fail the whole batch
        }
    }

    // Commit the transaction
    match tx.commit().await {
        Ok(_) => HttpResponse::Ok().json("Bulk analytics recorded successfully"),
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().json("Error recording bulk analytics")
        }
    }
}

#[get("/user/stats")]
pub async fn get_user_stats(
    req: HttpRequest,
    pool: web::Data<DbPool>,
    config: web::Data<Config>,
) -> impl Responder {
    // Extract token from authorization header
    let auth_header = match req.headers().get("Authorization") {
        Some(header) => header,
        None => return HttpResponse::Unauthorized().json("No authorization header"),
    };

    let auth_str = match auth_header.to_str() {
        Ok(str) => str,
        Err(_) => return HttpResponse::Unauthorized().json("Invalid authorization header"),
    };

    // Check if it's a Bearer token
    if !auth_str.starts_with("Bearer ") {
        return HttpResponse::Unauthorized().json("Invalid token format");
    }

    let token = &auth_str[7..]; // Remove "Bearer " prefix

    // Verify the token
    let claims = match verify_token(token, &config) {
        Ok(claims) => claims,
        Err(_) => return HttpResponse::Unauthorized().json("Invalid token"),
    };

    // Get user ID from claims
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return HttpResponse::InternalServerError().json("Invalid user ID in token"),
    };

    // Get database client
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    // Get books read count
    let books_read_result = client
        .query_one(
            "SELECT COUNT(DISTINCT book_id) FROM user_reading_progress WHERE user_id = $1",
            &[&user_id],
        )
        .await;

    let books_read = match books_read_result {
        Ok(row) => row.get::<_, i64>(0),
        Err(_) => 0,
    };

    // Get total pages read
    let pages_result = client
        .query_one(
            "SELECT COALESCE(SUM(pages_read), 0) FROM user_analytics WHERE user_id = $1",
            &[&user_id],
        )
        .await;

    let total_pages = match pages_result {
        Ok(row) => row.get::<_, i64>(0),
        Err(_) => 0,
    };

    // Get total reading time
    let time_result = client
        .query_one(
            "SELECT COALESCE(SUM(reading_time_seconds), 0) FROM user_analytics WHERE user_id = $1",
            &[&user_id],
        )
        .await;

    let total_reading_time = match time_result {
        Ok(row) => row.get::<_, i64>(0),
        Err(_) => 0,
    };

    // Prepare stats response
    let stats = UserStats {
        books_read,
        total_pages,
        total_reading_time,
    };

    HttpResponse::Ok().json(stats)
}