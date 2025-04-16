use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Book {
    pub id: Uuid,
    pub title: String,
    pub author: String,
    pub description: String,
    pub cover_image: String,
    pub category_id: Uuid,
    pub format: BookFormat,
    pub file_path: String,
    pub total_pages: i32,
    pub published_date: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BookSummary {
    pub id: Uuid,
    pub title: String,
    pub author: String,
    pub cover_image: String,
    pub category_id: Uuid,
    pub category_name: String,
    pub format: BookFormat,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Category {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub book_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BookFormat {
    PDF,
    EPUB,
    MOBI,
}

impl std::fmt::Display for BookFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BookFormat::PDF => write!(f, "pdf"),
            BookFormat::EPUB => write!(f, "epub"),
            BookFormat::MOBI => write!(f, "mobi"),
        }
    }
}

impl std::str::FromStr for BookFormat {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "pdf" => Ok(BookFormat::PDF),
            "epub" => Ok(BookFormat::EPUB),
            "mobi" => Ok(BookFormat::MOBI),
            _ => Err(format!("Unknown book format: {}", s)),
        }
    }
}