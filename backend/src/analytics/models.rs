use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct ReadingAnalytics {
    pub book_id: String,
    pub pages_read: i32,
    pub reading_time_seconds: i32,
}

#[derive(Debug, Deserialize)]
pub struct BulkAnalytics {
    pub book_id: String,
    pub pages_read: i32,
    pub reading_time_seconds: i32,
    pub timestamp: String,
}

#[derive(Debug, Serialize)]
pub struct UserStats {
    pub books_read: i64,
    pub total_pages: i64,
    pub total_reading_time: i64,
}