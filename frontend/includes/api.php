<?php

/**
 * API bridge file for connecting PHP frontend with Rust backend
 */

// Include required files
require_once 'config.php';
require_once 'functions.php';

/**
 * Make API request to backend
 * @param string $endpoint API endpoint
 * @param string $method HTTP method (GET, POST, PUT, DELETE)
 * @param array|null $data Request data (for POST, PUT)
 * @param array $headers Additional headers
 * @return array|null Response data or null on error
 */
function apiRequest($endpoint, $method = 'GET', $data = null, $headers = [])
{
    global $API_BASE_URL;

    // Build full URL
    $url = $API_BASE_URL . $endpoint;

    // Initialize cURL
    $ch = curl_init($url);

    // Set method
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));

    // JSON content type and accept headers
    $defaultHeaders = [
        'Content-Type: application/json',
        'Accept: application/json'
    ];

    // Add auth token if user is logged in
    if (isLoggedIn()) {
        $token = $_COOKIE['auth_token'] ?? '';
        $defaultHeaders[] = "Authorization: Bearer {$token}";
    }

    // Merge with additional headers
    $allHeaders = array_merge($defaultHeaders, $headers);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $allHeaders);

    // Set data for POST, PUT
    if ($data !== null && in_array(strtoupper($method), ['POST', 'PUT'])) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }

    // Return response as string instead of outputting
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    // Set timeout
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    // For HTTPS
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    // Execute request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    // Check for errors
    if (curl_errno($ch)) {
        error_log('API Request Error: ' . curl_error($ch));
        curl_close($ch);

        // Try to get from offline cache if available
        if (!isOnline()) {
            return getOfflineData($endpoint);
        }

        return null;
    }

    curl_close($ch);

    // Parse response as JSON
    $responseData = json_decode($response, true);

    // Handle non-200 responses
    if ($httpCode < 200 || $httpCode >= 300) {
        error_log("API Error: Endpoint {$endpoint} returned status {$httpCode} with response: " . $response);

        // If offline, try to get from cache
        if (!isOnline() || $httpCode == 503) {
            return getOfflineData($endpoint);
        }

        // Return the error data
        return [
            'error' => true,
            'code' => $httpCode,
            'message' => $responseData['message'] ?? 'Unknown error',
            'data' => null
        ];
    }

    // Cache successful responses if they're GET requests
    if (strtoupper($method) === 'GET') {
        cacheApiResponse($endpoint, $responseData);
    }

    return [
        'error' => false,
        'code' => $httpCode,
        'data' => $responseData
    ];
}

/**
 * Cache API response for offline use
 * @param string $endpoint API endpoint
 * @param array $data Response data
 */
function cacheApiResponse($endpoint, $data)
{
    global $CACHE_STORAGE_PATH;

    // Create cache directory if it doesn't exist
    if (!file_exists($CACHE_STORAGE_PATH)) {
        mkdir($CACHE_STORAGE_PATH, 0755, true);
    }

    // Generate cache file name
    $cacheFile = $CACHE_STORAGE_PATH . '/' . md5($endpoint) . '.json';

    // Save data to cache file
    file_put_contents($cacheFile, json_encode($data));
}

/**
 * Get cached API response
 * @param string $endpoint API endpoint
 * @return array|null Cached data or null if not available
 */
function getOfflineData($endpoint)
{
    global $CACHE_STORAGE_PATH;

    // Generate cache file name
    $cacheFile = $CACHE_STORAGE_PATH . '/' . md5($endpoint) . '.json';

    // Check if cache file exists
    if (!file_exists($cacheFile)) {
        return null;
    }

    // Get cache file age
    $cacheAge = time() - filemtime($cacheFile);

    // If cache is older than 30 days, consider it expired
    if ($cacheAge > 30 * 24 * 60 * 60) {
        return null;
    }

    // Read cache file
    $cacheData = file_get_contents($cacheFile);

    // Parse JSON
    $data = json_decode($cacheData, true);

    // If parsing failed, return null
    if ($data === null) {
        return null;
    }

    return [
        'error' => false,
        'code' => 200,
        'data' => $data,
        'cached' => true,
        'cache_age' => $cacheAge
    ];
}

/**
 * Check if internet connection is available
 * @return bool True if online, false if offline
 */
function isOnline()
{
    // Try to connect to a well-known host
    $connected = @fsockopen("www.google.com", 80, $errno, $errstr, 2);

    // If connected, close connection and return true
    if ($connected) {
        fclose($connected);
        return true;
    }

    return false;
}

/**
 * Proxy API request from frontend to backend
 * For use when .htaccess/nginx rewrite rules aren't an option
 */
function proxyApiRequest()
{
    // Check if this is an API request
    if (strpos($_SERVER['REQUEST_URI'], '/api/') === 0) {
        // Extract API endpoint from URL
        $endpoint = substr($_SERVER['REQUEST_URI'], 5); // Remove /api/ prefix

        // Get HTTP method
        $method = $_SERVER['REQUEST_METHOD'];

        // Get request data
        $data = null;
        if (in_array($method, ['POST', 'PUT'])) {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
        }

        // Get all headers
        $headers = getallheaders();
        $customHeaders = [];

        // Convert headers to cURL format
        foreach ($headers as $key => $value) {
            if (strtolower($key) !== 'host' && strtolower($key) !== 'content-length') {
                $customHeaders[] = "{$key}: {$value}";
            }
        }

        // Make API request
        $response = apiRequest($endpoint, $method, $data, $customHeaders);

        // Set response headers
        header('Content-Type: application/json');

        if ($response['error']) {
            http_response_code($response['code']);
        } else {
            http_response_code(200);
        }

        // Output response data
        echo json_encode($response['data']);
        exit;
    }
}
