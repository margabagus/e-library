<?php

/**
 * Helper functions for E-Library
 */

// Include configuration
require_once 'config.php';

/**
 * Sanitize input data
 * @param string $data Input data to sanitize
 * @return string Sanitized data
 */
function sanitize($data)
{
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

/**
 * Check if user is logged in
 * @return bool True if logged in, false otherwise
 */
function isLoggedIn()
{
    return isset($_SESSION['user_id']) || isset($_COOKIE['auth_token']);
}

/**
 * Get current user ID
 * @return string|null User ID if logged in, null otherwise
 */
function getCurrentUserId()
{
    if (isset($_SESSION['user_id'])) {
        return $_SESSION['user_id'];
    } elseif (isset($_COOKIE['auth_token'])) {
        // Verify token and get user ID
        $token = $_COOKIE['auth_token'];
        $userId = verifyToken($token);
        return $userId;
    }
    return null;
}

/**
 * Verify JWT token
 * @param string $token JWT token
 * @return string|false User ID if valid, false otherwise
 */
function verifyToken($token)
{
    global $JWT_SECRET;

    try {
        // Split the token
        list($header, $payload, $signature) = explode('.', $token);

        // Decode the payload
        $payload = json_decode(base64_decode($payload), true);

        // Check if token has expired
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false;
        }

        // Return user ID from token
        return isset($payload['sub']) ? $payload['sub'] : false;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Make API request to backend
 * @param string $endpoint API endpoint
 * @param string $method HTTP method (GET, POST, PUT, DELETE)
 * @param array $data Request data
 * @return array|false Response data or false on error
 */
function apiRequest($endpoint, $method = 'GET', $data = null)
{
    global $API_BASE_URL;

    $url = $API_BASE_URL . $endpoint;

    $options = [
        'http' => [
            'header' => "Content-Type: application/json\r\n",
            'method' => $method
        ]
    ];

    // Add auth token if logged in
    if (isLoggedIn()) {
        $token = $_COOKIE['auth_token'] ?? '';
        $options['http']['header'] .= "Authorization: Bearer $token\r\n";
    }

    // Add request body for POST, PUT
    if ($data && in_array($method, ['POST', 'PUT'])) {
        $options['http']['content'] = json_encode($data);
    }

    $context = stream_context_create($options);

    // Make request
    try {
        $response = file_get_contents($url, false, $context);
        return json_decode($response, true);
    } catch (Exception $e) {
        // Check if we're offline
        if (!isOnline()) {
            // Try to get data from offline cache if available
            return getOfflineData($endpoint);
        }
        return false;
    }
}

/**
 * Check if user is online
 * @return bool True if online, false otherwise
 */
function isOnline()
{
    // Simple online check - this is just a fallback
    // The main online/offline detection is done via JavaScript
    $url = 'https://www.google.com';
    $headers = @get_headers($url);
    return $headers && strpos($headers[0], '200') !== false;
}

/**
 * Get data from offline cache
 * @param string $endpoint API endpoint
 * @return array|false Cached data or false if not available
 */
function getOfflineData($endpoint)
{
    // This is a simple implementation
    // In a real app, this would interact with IndexedDB via JavaScript
    $cacheFile = __DIR__ . '/../cache/' . md5($endpoint) . '.json';

    if (file_exists($cacheFile)) {
        $data = file_get_contents($cacheFile);
        return json_decode($data, true);
    }

    return false;
}

/**
 * Get featured books
 * @param int $limit Number of books to return
 * @return array Array of book objects
 */
function getFeaturedBooks($limit = 5)
{
    $result = apiRequest('/books/featured?limit=' . $limit);

    if ($result === false || !isset($result['data'])) {
        // Return empty array on error
        return [];
    }

    return $result['data'];
}

/**
 * Get recent books
 * @param int $limit Number of books to return
 * @return array Array of book objects
 */
function getRecentBooks($limit = 10)
{
    $result = apiRequest('/books/recent?limit=' . $limit);

    if ($result === false || !isset($result['data'])) {
        // Return empty array on error
        return [];
    }

    return $result['data'];
}

/**
 * Get book by ID
 * @param string $id Book ID
 * @return array|false Book object or false on error
 */
function getBookById($id)
{
    $result = apiRequest('/books/' . $id);

    if ($result === false || !isset($result['data'])) {
        return false;
    }

    return $result['data'];
}

/**
 * Get all books
 * @param int $page Page number
 * @param int $limit Books per page
 * @return array Array of book objects
 */
function getAllBooks($page = 1, $limit = 20)
{
    $result = apiRequest('/books?page=' . $page . '&limit=' . $limit);

    if ($result === false || !isset($result['data'])) {
        return [];
    }

    return $result['data'];
}

/**
 * Get books by category
 * @param string $categoryId Category ID
 * @param int $page Page number
 * @param int $limit Books per page
 * @return array Array of book objects
 */
function getBooksByCategory($categoryId, $page = 1, $limit = 20)
{
    $result = apiRequest('/books?category=' . $categoryId . '&page=' . $page . '&limit=' . $limit);

    if ($result === false || !isset($result['data'])) {
        return [];
    }

    return $result['data'];
}

/**
 * Search books
 * @param string $query Search query
 * @param int $page Page number
 * @param int $limit Books per page
 * @return array Array of book objects
 */
function searchBooks($query, $page = 1, $limit = 20)
{
    $query = urlencode($query);
    $result = apiRequest('/books/search?q=' . $query . '&page=' . $page . '&limit=' . $limit);

    if ($result === false || !isset($result['data'])) {
        return [];
    }

    return $result['data'];
}

/**
 * Get all categories
 * @return array Array of category objects
 */
function getCategories()
{
    $result = apiRequest('/categories');

    if ($result === false || !isset($result['data'])) {
        return [];
    }

    return $result['data'];
}

/**
 * Get category by ID
 * @param string $id Category ID
 * @return array|false Category object or false on error
 */
function getCategoryById($id)
{
    $result = apiRequest('/categories/' . $id);

    if ($result === false || !isset($result['data'])) {
        return false;
    }

    return $result['data'];
}

/**
 * Save reading progress
 * @param string $bookId Book ID
 * @param int $currentPage Current page
 * @param int $totalPages Total pages
 * @return bool True on success, false on error
 */
function saveReadingProgress($bookId, $currentPage, $totalPages)
{
    if (!isLoggedIn()) {
        return false;
    }

    $data = [
        'book_id' => $bookId,
        'current_page' => $currentPage,
        'total_pages' => $totalPages
    ];

    $result = apiRequest('/user/reading-progress', 'POST', $data);

    return ($result !== false);
}

/**
 * Get reading progress for a book
 * @param string $bookId Book ID
 * @return array|false Progress object or false on error
 */
function getReadingProgress($bookId)
{
    if (!isLoggedIn()) {
        return false;
    }

    $result = apiRequest('/user/reading-progress/' . $bookId);

    if ($result === false || !isset($result['data'])) {
        return false;
    }

    return $result['data'];
}

/**
 * Save reading analytics
 * @param string $bookId Book ID
 * @param int $pagesRead Number of pages read
 * @param int $readingTime Reading time in seconds
 * @return bool True on success, false on error
 */
function saveReadingAnalytics($bookId, $pagesRead, $readingTime)
{
    if (!isLoggedIn()) {
        return false;
    }

    $data = [
        'book_id' => $bookId,
        'pages_read' => $pagesRead,
        'reading_time_seconds' => $readingTime,
        'session_date' => date('Y-m-d')
    ];

    $result = apiRequest('/analytics/reading', 'POST', $data);

    return ($result !== false);
}

/**
 * Get user reading statistics
 * @return array|false Statistics object or false on error
 */
function getUserReadingStats()
{
    if (!isLoggedIn()) {
        return false;
    }

    $result = apiRequest('/user/stats');

    if ($result === false || !isset($result['data'])) {
        return false;
    }

    return $result['data'];
}

/**
 * Register a new user
 * @param string $username Username
 * @param string $email Email
 * @param string $password Password
 * @return array|false User data on success, false on error
 */
function registerUser($username, $email, $password)
{
    $data = [
        'username' => $username,
        'email' => $email,
        'password' => $password
    ];

    $result = apiRequest('/auth/register', 'POST', $data);

    if ($result === false || !isset($result['data'])) {
        return false;
    }

    // Set auth token cookie
    setAuthCookie($result['data']['token']);

    return $result['data']['user'];
}

/**
 * Login user
 * @param string $email Email
 * @param string $password Password
 * @return array|false User data on success, false on error
 */
function loginUser($email, $password)
{
    $data = [
        'email' => $email,
        'password' => $password
    ];

    $result = apiRequest('/auth/login', 'POST', $data);

    if ($result === false || !isset($result['data'])) {
        return false;
    }

    // Set auth token cookie
    setAuthCookie($result['data']['token']);

    return $result['data']['user'];
}

/**
 * Logout user
 * @return bool True on success
 */
function logoutUser()
{
    // Clear auth cookie
    setcookie('auth_token', '', time() - 3600, '/');

    // Clear session
    session_start();
    session_destroy();

    return true;
}

/**
 * Set authentication cookie
 * @param string $token JWT token
 */
function setAuthCookie($token)
{
    // Set cookie for 30 days
    setcookie('auth_token', $token, time() + (30 * 24 * 60 * 60), '/', '', true, true);
}

/**
 * Get appropriate icon for category
 * @param string $categoryName Category name
 * @return string Font Awesome icon class
 */
function getCategoryIcon($categoryName)
{
    $name = strtolower($categoryName);

    $icons = [
        'fiction' => 'fas fa-book',
        'non-fiction' => 'fas fa-globe',
        'science' => 'fas fa-flask',
        'technology' => 'fas fa-laptop-code',
        'history' => 'fas fa-landmark',
        'biography' => 'fas fa-user-tie',
        'business' => 'fas fa-chart-line',
        'self-help' => 'fas fa-hand-holding-heart',
        'health' => 'fas fa-heartbeat',
        'travel' => 'fas fa-plane',
        'cooking' => 'fas fa-utensils',
        'art' => 'fas fa-palette',
        'music' => 'fas fa-music',
        'religion' => 'fas fa-pray',
        'philosophy' => 'fas fa-brain',
        'education' => 'fas fa-graduation-cap',
        'children' => 'fas fa-child',
        'comics' => 'fas fa-book-open',
        'romance' => 'fas fa-heart',
        'mystery' => 'fas fa-search',
        'fantasy' => 'fas fa-dragon',
        'science fiction' => 'fas fa-rocket',
        'horror' => 'fas fa-ghost',
        'thriller' => 'fas fa-mask',
        'poetry' => 'fas fa-feather-alt',
        'drama' => 'fas fa-theater-masks',
        'classic' => 'fas fa-star',
        'adventure' => 'fas fa-mountain',
        'comedy' => 'fas fa-laugh',
        'action' => 'fas fa-running'
    ];

    // Check if category name contains any of the keys
    foreach ($icons as $key => $icon) {
        if (strpos($name, $key) !== false) {
            return $icon;
        }
    }

    // Default icon
    return 'fas fa-book';
}

/**
 * Limit text to specified length
 * @param string $text Text to limit
 * @param int $length Maximum length
 * @return string Limited text
 */
function limitText($text, $length = 100)
{
    if (strlen($text) <= $length) {
        return $text;
    }

    $text = substr($text, 0, $length);
    $text = substr($text, 0, strrpos($text, ' '));
    return $text . '...';
}

/**
 * Format date for display
 * @param string $date Date string
 * @param string $format Date format
 * @return string Formatted date
 */
function formatDate($date, $format = 'd M Y')
{
    $timestamp = strtotime($date);
    return date($format, $timestamp);
}

/**
 * Get appropriate color for book format
 * @param string $format Book format
 * @return string CSS color class
 */
function getFormatColor($format)
{
    $format = strtolower($format);

    switch ($format) {
        case 'pdf':
            return 'format-pdf';
        case 'epub':
            return 'format-epub';
        case 'mobi':
            return 'format-mobi';
        default:
            return '';
    }
}

/**
 * Check if device is mobile
 * @return bool True if mobile device
 */
function isMobile()
{
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    return preg_match('/(android|iphone|ipad|mobile)/i', $userAgent);
}

/**
 * Generate random string
 * @param int $length String length
 * @return string Random string
 */
function generateRandomString($length = 10)
{
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[rand(0, strlen($characters) - 1)];
    }
    return $randomString;
}
