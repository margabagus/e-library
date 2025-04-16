use actix_web::{web, HttpResponse, Responder, get, post, HttpRequest};
use uuid::Uuid;
use std::path::Path;
use actix_files::NamedFile;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

use crate::auth::verify_token;
use crate::config::Config;
use crate::db::DbPool;
use crate::catalog::models::BookFormat;
use super::formats;

#[derive(Debug, Deserialize)]
pub struct ReadingProgressRequest {
    pub current_page: i32,
    pub total_pages: i32,
}

#[derive(Debug, Serialize)]
pub struct ReadingProgress {
    pub book_id: Uuid,
    pub user_id: Uuid,
    pub current_page: i32,
    pub total_pages: i32,
    pub last_read_at: DateTime<Utc>,
    pub completed: bool,
}

#[get("/content/{id}")]
pub async fn get_book_content(
    req: HttpRequest,
    path: web::Path<(String,)>,
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
    let book_id = match Uuid::parse_str(&path.0) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().json("Invalid book ID"),
    };

    // Check if the book exists and get its format and file path
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    let book_result = client
        .query_one(
            "SELECT format, file_path FROM books WHERE id = $1",
            &[&book_id],
        )
        .await;

    let row = match book_result {
        Ok(row) => row,
        Err(_) => return HttpResponse::NotFound().json("Book not found"),
    };

    let format: BookFormat = row.get("format");
    let file_path: String = row.get("file_path");

    // Construct the full file path
    let full_path = Path::new(&config.book_storage_path).join(&file_path);

    // Log reading analytics
    let _ = client
        .execute(
            "INSERT INTO user_analytics (user_id, book_id, pages_read, reading_time_seconds, session_date)
             VALUES ($1, $2, $3, $4, CURRENT_DATE)
             ON CONFLICT (user_id, book_id, session_date)
             DO UPDATE SET pages_read = user_analytics.pages_read + 1",
            &[&user_id, &book_id, &1, &0],
        )
        .await;

    // Return the file based on format
    match format {
        BookFormat::PDF => {
            match NamedFile::open(full_path) {
                Ok(file) => file.into_response(&req),
                Err(_) => HttpResponse::NotFound().json("File not found"),
            }
        },
        BookFormat::EPUB => {
            // Handle EPUB format using the formats module
            match formats::epub::process_epub(&full_path).await {
                Ok(content) => HttpResponse::Ok().content_type("application/epub+zip").body(content),
                Err(_) => HttpResponse::InternalServerError().json("Error processing EPUB file"),
            }
        },
        BookFormat::MOBI => {
            // Handle MOBI format using the formats module
            match formats::mobi::process_mobi(&full_path).await {
                Ok(content) => HttpResponse::Ok().content_type("application/x-mobipocket-ebook").body(content),
                Err(_) => HttpResponse::InternalServerError().json("Error processing MOBI file"),
            }
        },
    }
}

#[post("/progress/{book_id}")]
pub async fn save_reading_progress(
    req: HttpRequest,
    path: web::Path<(String,)>,
    body: web::Json<ReadingProgressRequest>,
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
    let book_id = match Uuid::parse_str(&path.0) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().json("Invalid book ID"),
    };

    // Check if the book exists
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    let book_exists = client
        .query_one("SELECT 1 FROM books WHERE id = $1", &[&book_id])
        .await;

    if book_exists.is_err() {
        return HttpResponse::NotFound().json("Book not found");
    }

    // Check if completing the book
    let completed = body.current_page >= body.total_pages;

    // Save or update reading progress
    let result = client
        .query_one(
            "INSERT INTO user_reading_progress (user_id, book_id, current_page, total_pages, completed)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, book_id)
             DO UPDATE SET current_page = $3, total_pages = $4, completed = $5, last_read_at = CURRENT_TIMESTAMP
             RETURNING id, user_id, book_id, current_page, total_pages, last_read_at, completed",
            &[
                &user_id,
                &book_id,
                &body.current_page,
                &body.total_pages,
                &completed,
            ],
        )
        .await;

    match result {
        Ok(row) => {
            let progress = ReadingProgress {
                book_id: row.get("book_id"),
                user_id: row.get("user_id"),
                current_page: row.get("current_page"),
                total_pages: row.get("total_pages"),
                last_read_at: row.get("last_read_at"),
                completed: row.get("completed"),
            };

            HttpResponse::Ok().json(progress)
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().json("Error saving reading progress")
        }
    }
}

#[get("/progress/{book_id}")]
pub async fn get_reading_progress(
    req: HttpRequest,
    path: web::Path<(String,)>,
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
    let book_id = match Uuid::parse_str(&path.0) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().json("Invalid book ID"),
    };

    // Get reading progress
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    let result = client
        .query_opt(
            "SELECT user_id, book_id, current_page, total_pages, last_read_at, completed
             FROM user_reading_progress
             WHERE user_id = $1 AND book_id = $2",
            &[&user_id, &book_id],
        )
        .await;

    match result {
        Ok(Some(row)) => {
            let progress = ReadingProgress {
                book_id: row.get("book_id"),
                user_id: row.get("user_id"),
                current_page: row.get("current_page"),
                total_pages: row.get("total_pages"),
                last_read_at: row.get("last_read_at"),
                completed: row.get("completed"),
            };

            HttpResponse::Ok().json(progress)
        }
        Ok(None) => {
            // No progress yet, return default
            let progress = ReadingProgress {
                book_id,
                user_id,
                current_page: 1,
                total_pages: 0,
                last_read_at: Utc::now(),
                completed: false,
            };

            HttpResponse::Ok().json(progress)
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().json("Error fetching reading progress")
        }
    }
}