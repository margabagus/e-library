use actix_web::{web, HttpResponse, Responder, post, get, HttpRequest};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::{
    auth::{hash_password, verify_password, generate_token, verify_token},
    config::Config,
    db::DbPool,
};
use super::models::{User, CreateUser};

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: User,
}

#[post("/register")]
pub async fn register(
    pool: web::Data<DbPool>,
    config: web::Data<Config>,
    req: web::Json<RegisterRequest>,
) -> impl Responder {
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    // Check if user with email already exists
    let existing_user = client
        .query_one(
            "SELECT COUNT(*) FROM users WHERE email = $1",
            &[&req.email],
        )
        .await;

    match existing_user {
        Ok(row) => {
            let count: i64 = row.get(0);
            if count > 0 {
                return HttpResponse::BadRequest().json("User with this email already exists");
            }
        }
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    }

    // Hash password
    let hashed_password = match hash_password(&req.password) {
        Ok(hash) => hash,
        Err(_) => return HttpResponse::InternalServerError().json("Password hashing error"),
    };

    // Create new user
    let user_id = Uuid::new_v4();
    let new_user = CreateUser {
        id: user_id,
        username: req.username.clone(),
        email: req.email.clone(),
        password_hash: hashed_password,
    };

    // Insert user into database
    let result = client
        .execute(
            "INSERT INTO users (id, username, email, password_hash) VALUES ($1, $2, $3, $4)",
            &[&new_user.id, &new_user.username, &new_user.email, &new_user.password_hash],
        )
        .await;

    match result {
        Ok(_) => {
            // Create user object for token generation
            let user = User {
                id: new_user.id,
                username: new_user.username,
                email: new_user.email,
                created_at: chrono::Utc::now(),
            };

            // Generate JWT token
            match generate_token(&user, &config) {
                Ok(token) => {
                    let response = AuthResponse {
                        token,
                        user,
                    };
                    HttpResponse::Created().json(response)
                }
                Err(_) => HttpResponse::InternalServerError().json("Token generation error"),
            }
        }
        Err(_) => HttpResponse::InternalServerError().json("Failed to create user"),
    }
}

#[post("/login")]
pub async fn login(
    pool: web::Data<DbPool>,
    config: web::Data<Config>,
    req: web::Json<LoginRequest>,
) -> impl Responder {
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    // Find user by email
    let user_result = client
        .query_one(
            "SELECT id, username, email, password_hash, created_at FROM users WHERE email = $1",
            &[&req.email],
        )
        .await;

    let row = match user_result {
        Ok(row) => row,
        Err(_) => return HttpResponse::Unauthorized().json("Invalid email or password"),
    };

    // Verify password
    let password_hash: String = row.get("password_hash");
    match verify_password(&req.password, &password_hash) {
        Ok(valid) => {
            if !valid {
                return HttpResponse::Unauthorized().json("Invalid email or password");
            }
        }
        Err(_) => return HttpResponse::InternalServerError().json("Password verification error"),
    }

    // Create user object for token generation
    let user = User {
        id: row.get("id"),
        username: row.get("username"),
        email: row.get("email"),
        created_at: row.get("created_at"),
    };

    // Generate JWT token
    match generate_token(&user, &config) {
        Ok(token) => {
            let response = AuthResponse {
                token,
                user,
            };
            HttpResponse::Ok().json(response)
        }
        Err(_) => HttpResponse::InternalServerError().json("Token generation error"),
    }
}

#[post("/logout")]
pub async fn logout() -> impl Responder {
    // Since we're using JWT, we don't need to do anything server-side
    // The client should discard the token
    HttpResponse::Ok().json("Logged out successfully")
}

#[get("/profile")]
pub async fn profile(
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

    // Get user from database
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    let user_result = client
        .query_one(
            "SELECT id, username, email, created_at FROM users WHERE id = $1",
            &[&user_id],
        )
        .await;

    match user_result {
        Ok(row) => {
            let user = User {
                id: row.get("id"),
                username: row.get("username"),
                email: row.get("email"),
                created_at: row.get("created_at"),
            };
            HttpResponse::Ok().json(user)
        }
        Err(_) => HttpResponse::NotFound().json("User not found"),
    }
}