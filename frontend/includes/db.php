<?php

/**
 * Database connection and helper functions for E-Library
 */

// Include configuration
require_once 'config.php';

/**
 * Get database connection
 * @return PDO Database connection
 */
function getDbConnection()
{
    global $DB_HOST, $DB_NAME, $DB_USER, $DB_PASS;

    static $db = null;

    if ($db === null) {
        try {
            // Create new PDO instance
            $dsn = "pgsql:host={$DB_HOST};dbname={$DB_NAME}";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $db = new PDO($dsn, $DB_USER, $DB_PASS, $options);
        } catch (PDOException $e) {
            // Log error and return null
            error_log("Database connection error: " . $e->getMessage());
            die("Database connection failed: " . ($GLOBALS['DEBUG_MODE'] ? $e->getMessage() : "Please try again later."));
        }
    }

    return $db;
}

/**
 * Execute query and return all results
 * @param string $sql SQL query
 * @param array $params Parameters for prepared statement
 * @return array Query results
 */
function dbQuery($sql, $params = [])
{
    try {
        $db = getDbConnection();
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    } catch (PDOException $e) {
        error_log("Database query error: " . $e->getMessage());
        return [];
    }
}

/**
 * Execute query and return single row
 * @param string $sql SQL query
 * @param array $params Parameters for prepared statement
 * @return array|null Query result or null if not found
 */
function dbQuerySingle($sql, $params = [])
{
    try {
        $db = getDbConnection();
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result !== false ? $result : null;
    } catch (PDOException $e) {
        error_log("Database query error: " . $e->getMessage());
        return null;
    }
}

/**
 * Execute query and return the ID of the last inserted row
 * @param string $sql SQL query
 * @param array $params Parameters for prepared statement
 * @return string|false Last inserted ID or false on error
 */
function dbInsert($sql, $params = [])
{
    try {
        $db = getDbConnection();
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $db->lastInsertId();
    } catch (PDOException $e) {
        error_log("Database insert error: " . $e->getMessage());
        return false;
    }
}

/**
 * Execute query and return number of affected rows
 * @param string $sql SQL query
 * @param array $params Parameters for prepared statement
 * @return int Number of affected rows
 */
function dbExecute($sql, $params = [])
{
    try {
        $db = getDbConnection();
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    } catch (PDOException $e) {
        error_log("Database execute error: " . $e->getMessage());
        return 0;
    }
}

/**
 * Begin a transaction
 * @return bool True on success, false on failure
 */
function dbBeginTransaction()
{
    try {
        $db = getDbConnection();
        return $db->beginTransaction();
    } catch (PDOException $e) {
        error_log("Database transaction error: " . $e->getMessage());
        return false;
    }
}

/**
 * Commit a transaction
 * @return bool True on success, false on failure
 */
function dbCommit()
{
    try {
        $db = getDbConnection();
        return $db->commit();
    } catch (PDOException $e) {
        error_log("Database commit error: " . $e->getMessage());
        return false;
    }
}

/**
 * Roll back a transaction
 * @return bool True on success, false on failure
 */
function dbRollback()
{
    try {
        $db = getDbConnection();
        return $db->rollBack();
    } catch (PDOException $e) {
        error_log("Database rollback error: " . $e->getMessage());
        return false;
    }
}

/**
 * Get categories from database
 * @return array List of categories
 */
function getLocalCategories()
{
    return dbQuery("
        SELECT 
            c.id, 
            c.name, 
            c.description, 
            COUNT(b.id) AS book_count
        FROM 
            categories c
        LEFT JOIN 
            books b ON c.id = b.category_id
        GROUP BY 
            c.id, c.name, c.description
        ORDER BY 
            c.name
    ");
}

/**
 * Get books from database
 * @param int $limit Maximum number of books to return
 * @param int $offset Offset for pagination
 * @param string|null $categoryId Filter by category ID
 * @return array List of books
 */
function getLocalBooks($limit = 20, $offset = 0, $categoryId = null)
{
    $params = [$limit, $offset];
    $whereClause = '';

    if ($categoryId !== null) {
        $whereClause = 'WHERE b.category_id = ?';
        $params[] = $categoryId;
    }

    return dbQuery("
        SELECT 
            b.id, 
            b.title, 
            b.author, 
            b.description, 
            b.cover_image, 
            b.category_id, 
            c.name AS category_name, 
            b.format, 
            b.total_pages, 
            b.published_date
        FROM 
            books b
        JOIN 
            categories c ON b.category_id = c.id
        $whereClause
        ORDER BY 
            b.created_at DESC
        LIMIT ? OFFSET ?
    ", $params);
}

/**
 * Get book by ID from database
 * @param string $bookId Book ID
 * @return array|null Book data or null if not found
 */
function getLocalBookById($bookId)
{
    return dbQuerySingle("
        SELECT 
            b.id, 
            b.title, 
            b.author, 
            b.description, 
            b.cover_image, 
            b.category_id, 
            c.name AS category_name, 
            b.format, 
            b.file_path,
            b.total_pages, 
            b.published_date
        FROM 
            books b
        JOIN 
            categories c ON b.category_id = c.id
        WHERE 
            b.id = ?
    ", [$bookId]);
}

/**
 * Get user by ID from database
 * @param string $userId User ID
 * @return array|null User data or null if not found
 */
function getLocalUserById($userId)
{
    return dbQuerySingle("
        SELECT 
            id, 
            username, 
            email, 
            created_at
        FROM 
            users
        WHERE 
            id = ?
    ", [$userId]);
}

/**
 * Save reading progress to database
 * @param string $userId User ID
 * @param string $bookId Book ID
 * @param int $currentPage Current page number
 * @param int $totalPages Total pages in book
 * @param bool $completed Whether book is completed
 * @return bool True on success, false on failure
 */
function saveLocalReadingProgress($userId, $bookId, $currentPage, $totalPages, $completed = false)
{
    return dbExecute("
        INSERT INTO user_reading_progress 
            (user_id, book_id, current_page, total_pages, completed)
        VALUES 
            (?, ?, ?, ?, ?)
        ON CONFLICT (user_id, book_id) 
        DO UPDATE SET 
            current_page = EXCLUDED.current_page,
            total_pages = EXCLUDED.total_pages,
            completed = EXCLUDED.completed,
            last_read_at = CURRENT_TIMESTAMP
    ", [$userId, $bookId, $currentPage, $totalPages, $completed ? 1 : 0]);
}

/**
 * Get reading progress from database
 * @param string $userId User ID
 * @param string $bookId Book ID
 * @return array|null Reading progress data or null if not found
 */
function getLocalReadingProgress($userId, $bookId)
{
    return dbQuerySingle("
        SELECT 
            user_id, 
            book_id, 
            current_page, 
            total_pages, 
            last_read_at, 
            completed
        FROM 
            user_reading_progress
        WHERE 
            user_id = ? AND book_id = ?
    ", [$userId, $bookId]);
}

/**
 * Get recently read books for user
 * @param string $userId User ID
 * @param int $limit Maximum number of books to return
 * @return array List of recently read books with progress
 */
function getLocalRecentlyReadBooks($userId, $limit = 5)
{
    return dbQuery("
        SELECT 
            b.id, 
            b.title, 
            b.author, 
            b.cover_image, 
            b.category_id, 
            c.name AS category_name, 
            b.format, 
            urp.current_page, 
            urp.total_pages, 
            urp.last_read_at, 
            urp.completed
        FROM 
            user_reading_progress urp
        JOIN 
            books b ON urp.book_id = b.id
        JOIN 
            categories c ON b.category_id = c.id
        WHERE 
            urp.user_id = ?
        ORDER BY 
            urp.last_read_at DESC
        LIMIT ?
    ", [$userId, $limit]);
}

/**
 * Save analytics data to database
 * @param string $userId User ID
 * @param string $bookId Book ID
 * @param int $pagesRead Number of pages read
 * @param int $readingTimeSeconds Reading time in seconds
 * @return bool True on success, false on failure
 */
function saveLocalAnalytics($userId, $bookId, $pagesRead, $readingTimeSeconds)
{
    return dbExecute("
        INSERT INTO user_analytics 
            (user_id, book_id, pages_read, reading_time_seconds, session_date)
        VALUES 
            (?, ?, ?, ?, CURRENT_DATE)
        ON CONFLICT (user_id, book_id, session_date) 
        DO UPDATE SET 
            pages_read = user_analytics.pages_read + EXCLUDED.pages_read,
            reading_time_seconds = user_analytics.reading_time_seconds + EXCLUDED.reading_time_seconds
    ", [$userId, $bookId, $pagesRead, $readingTimeSeconds]);
}

/**
 * Get user reading statistics
 * @param string $userId User ID
 * @return array User reading statistics
 */
function getLocalUserStats($userId)
{
    return dbQuerySingle("
        SELECT 
            COUNT(DISTINCT urp.book_id) AS books_read,
            COALESCE(SUM(ua.pages_read), 0) AS total_pages,
            COALESCE(SUM(ua.reading_time_seconds), 0) AS total_reading_time
        FROM 
            users u
        LEFT JOIN 
            user_reading_progress urp ON u.id = urp.user_id
        LEFT JOIN 
            user_analytics ua ON u.id = ua.user_id
        WHERE 
            u.id = ?
        GROUP BY 
            u.id
    ", [$userId]);
}
