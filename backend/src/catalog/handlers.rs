use actix_web::{web, HttpResponse, Responder, get};
use uuid::Uuid;
use crate::db::DbPool;
use super::models::{Book, BookSummary, Category, BookFormat};

#[get("/books")]
pub async fn get_books(
    pool: web::Data<DbPool>,
    query: web::Query<GetBooksQuery>,
) -> impl Responder {
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    let mut sql = String::from(
        "SELECT b.id, b.title, b.author, b.cover_image, b.category_id, c.name as category_name, b.format 
         FROM books b 
         JOIN categories c ON b.category_id = c.id"
    );
    
    let mut params: Vec<Box<dyn tokio_postgres::types::ToSql + Sync>> = Vec::new();
    let mut param_count = 1;
    
    // Add category filter if provided
    if let Some(category_id) = &query.category {
        if let Ok(uuid) = Uuid::parse_str(category_id) {
            sql.push_str(&format!(" WHERE b.category_id = ${}", param_count));
            params.push(Box::new(uuid));
            param_count += 1;
        }
    }
    
    // Add limit and offset for pagination
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.page.unwrap_or(1).saturating_sub(1) * limit;
    
    sql.push_str(&format!(" ORDER BY b.created_at DESC LIMIT ${} OFFSET ${}", 
        param_count, param_count + 1));
    params.push(Box::new(limit as i32));
    params.push(Box::new(offset as i32));

    // Convert params to the right format for query
    let params_refs: Vec<&(dyn tokio_postgres::types::ToSql + Sync)> = 
        params.iter().map(|p| p.as_ref()).collect();

    match client.query(&sql, &params_refs[..]).await {
        Ok(rows) => {
            let books: Vec<BookSummary> = rows
                .into_iter()
                .map(|row| BookSummary {
                    id: row.get("id"),
                    title: row.get("title"),
                    author: row.get("author"),
                    cover_image: row.get("cover_image"),
                    category_id: row.get("category_id"),
                    category_name: row.get("category_name"),
                    format: row.get("format"),
                })
                .collect();

            HttpResponse::Ok().json(books)
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().json("Error fetching books")
        }
    }
}

#[get("/books/{id}")]
pub async fn get_book(
    pool: web::Data<DbPool>,
    path: web::Path<(String,)>,
) -> impl Responder {
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    let book_id = match Uuid::parse_str(&path.0) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().json("Invalid book ID"),
    };

    match client
        .query_one(
            "SELECT b.id, b.title, b.author, b.description, b.cover_image, 
                   b.category_id, c.name as category_name, b.format, b.file_path, 
                   b.total_pages, b.published_date, b.created_at
            FROM books b
            JOIN categories c ON b.category_id = c.id
            WHERE b.id = $1",
            &[&book_id],
        )
        .await
    {
        Ok(row) => {
            let book = Book {
                id: row.get("id"),
                title: row.get("title"),
                author: row.get("author"),
                description: row.get("description"),
                cover_image: row.get("cover_image"),
                category_id: row.get("category_id"),
                format: row.get("format"),
                file_path: row.get("file_path"),
                total_pages: row.get("total_pages"),
                published_date: row.get("published_date"),
                created_at: row.get("created_at"),
            };

            HttpResponse::Ok().json(book)
        }
        Err(_) => HttpResponse::NotFound().json("Book not found"),
    }
}

#[get("/categories")]
pub async fn get_categories(pool: web::Data<DbPool>) -> impl Responder {
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    match client
        .query(
            "SELECT c.id, c.name, c.description, COUNT(b.id) as book_count
            FROM categories c
            LEFT JOIN books b ON c.id = b.category_id
            GROUP BY c.id, c.name, c.description
            ORDER BY c.name",
            &[],
        )
        .await
    {
        Ok(rows) => {
            let categories: Vec<Category> = rows
                .into_iter()
                .map(|row| Category {
                    id: row.get("id"),
                    name: row.get("name"),
                    description: row.get("description"),
                    book_count: row.get("book_count"),
                })
                .collect();

            HttpResponse::Ok().json(categories)
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().json("Error fetching categories")
        }
    }
}

#[get("/categories/{id}")]
pub async fn get_category(
    pool: web::Data<DbPool>,
    path: web::Path<(String,)>,
) -> impl Responder {
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    let category_id = match Uuid::parse_str(&path.0) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().json("Invalid category ID"),
    };

    match client
        .query_one(
            "SELECT c.id, c.name, c.description, COUNT(b.id) as book_count
            FROM categories c
            LEFT JOIN books b ON c.id = b.category_id
            WHERE c.id = $1
            GROUP BY c.id, c.name, c.description",
            &[&category_id],
        )
        .await
    {
        Ok(row) => {
            let category = Category {
                id: row.get("id"),
                name: row.get("name"),
                description: row.get("description"),
                book_count: row.get("book_count"),
            };

            HttpResponse::Ok().json(category)
        }
        Err(_) => HttpResponse::NotFound().json("Category not found"),
    }
}

#[get("/books/search")]
pub async fn search_books(
    pool: web::Data<DbPool>,
    query: web::Query<SearchQuery>,
) -> impl Responder {
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    if query.q.is_empty() {
        return HttpResponse::BadRequest().json("Search query is required");
    }

    let search_query = format!("%{}%", query.q.to_lowercase());

    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.page.unwrap_or(1).saturating_sub(1) * limit;

    match client
        .query(
            "SELECT b.id, b.title, b.author, b.cover_image, b.category_id, c.name as category_name, b.format
            FROM books b
            JOIN categories c ON b.category_id = c.id
            WHERE LOWER(b.title) LIKE $1 
               OR LOWER(b.author) LIKE $1
               OR LOWER(b.description) LIKE $1
            ORDER BY 
                CASE 
                    WHEN LOWER(b.title) LIKE $1 THEN 0
                    WHEN LOWER(b.author) LIKE $1 THEN 1
                    ELSE 2
                END,
                b.created_at DESC
            LIMIT $2 OFFSET $3",
            &[&search_query, &(limit as i32), &(offset as i32)],
        )
        .await
    {
        Ok(rows) => {
            let books: Vec<BookSummary> = rows
                .into_iter()
                .map(|row| BookSummary {
                    id: row.get("id"),
                    title: row.get("title"),
                    author: row.get("author"),
                    cover_image: row.get("cover_image"),
                    category_id: row.get("category_id"),
                    category_name: row.get("category_name"),
                    format: row.get("format"),
                })
                .collect();

            HttpResponse::Ok().json(books)
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().json("Error searching books")
        }
    }
}

#[get("/books/category/{id}")]
pub async fn get_books_by_category(
    pool: web::Data<DbPool>,
    path: web::Path<(String,)>,
    query: web::Query<PaginationQuery>,
) -> impl Responder {
    let client = match pool.get().await {
        Ok(client) => client,
        Err(_) => return HttpResponse::InternalServerError().json("Database error"),
    };

    let category_id = match Uuid::parse_str(&path.0) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().json("Invalid category ID"),
    };

    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.page.unwrap_or(1).saturating_sub(1) * limit;

    match client
        .query(
            "SELECT b.id, b.title, b.author, b.cover_image, b.category_id, c.name as category_name, b.format
            FROM books b
            JOIN categories c ON b.category_id = c.id
            WHERE b.category_id = $1
            ORDER BY b.created_at DESC
            LIMIT $2 OFFSET $3",
            &[&category_id, &(limit as i32), &(offset as i32)],
        )
        .await
    {
        Ok(rows) => {
            let books: Vec<BookSummary> = rows
                .into_iter()
                .map(|row| BookSummary {
                    id: row.get("id"),
                    title: row.get("title"),
                    author: row.get("author"),
                    cover_image: row.get("cover_image"),
                    category_id: row.get("category_id"),
                    category_name: row.get("category_name"),
                    format: row.get("format"),
                })
                .collect();

            HttpResponse::Ok().json(books)
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().json("Error fetching books by category")
        }
    }
}

// Query parameters
#[derive(serde::Deserialize)]
pub struct GetBooksQuery {
    pub category: Option<String>,
    pub page: Option<usize>,
    pub limit: Option<usize>,
}

#[derive(serde::Deserialize)]
pub struct PaginationQuery {
    pub page: Option<usize>,
    pub limit: Option<usize>,
}

#[derive(serde::Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub page: Option<usize>,
    pub limit: Option<usize>,
}