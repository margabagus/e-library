<?php

/**
 * Configuration file for E-Library
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Database configuration
$DB_HOST = 'localhost';
$DB_NAME = 'elibrary';
$DB_USER = 'elibrary_user';
$DB_PASS = 'your_secure_password'; // Change this to a secure password

// API configuration
$API_BASE_URL = 'https://book.margabagus.com/api'; // Base URL for API requests

// JWT configuration
$JWT_SECRET = 'your_jwt_secret_key'; // Change this to a secure random string
$JWT_EXPIRATION = 30 * 24 * 60 * 60; // 30 days in seconds

// Storage paths
$BOOK_STORAGE_PATH = __DIR__ . '/../storage/books';
$COVER_STORAGE_PATH = __DIR__ . '/../storage/covers';
$CACHE_STORAGE_PATH = __DIR__ . '/../storage/cache';

// Make sure storage directories exist
if (!file_exists($BOOK_STORAGE_PATH)) {
    mkdir($BOOK_STORAGE_PATH, 0755, true);
}

if (!file_exists($COVER_STORAGE_PATH)) {
    mkdir($COVER_STORAGE_PATH, 0755, true);
}

if (!file_exists($CACHE_STORAGE_PATH)) {
    mkdir($CACHE_STORAGE_PATH, 0755, true);
}

// Site configuration
$SITE_NAME = 'E-Library';
$SITE_URL = 'https://book.margabagus.com';
$ADMIN_EMAIL = 'admin@margabagus.com';

// PWA configuration
$PWA_NAME = 'MargaBagus E-Library';
$PWA_SHORT_NAME = 'E-Library';
$PWA_THEME_COLOR = '#3498db';
$PWA_BACKGROUND_COLOR = '#ffffff';

// Debug mode (set to false in production)
$DEBUG_MODE = false;

// Set error reporting based on debug mode
if ($DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Define supported book formats
$SUPPORTED_FORMATS = ['pdf', 'epub', 'mobi'];

// Define maximum file size for uploads (in bytes)
$MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// Set default timezone
date_default_timezone_set('Asia/Jakarta');

// Connect to PostgreSQL database
function db_connect()
{
    global $DB_HOST, $DB_NAME, $DB_USER, $DB_PASS;

    try {
        $dsn = "pgsql:host=$DB_HOST;dbname=$DB_NAME";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        return new PDO($dsn, $DB_USER, $DB_PASS, $options);
    } catch (PDOException $e) {
        if ($GLOBALS['DEBUG_MODE']) {
            echo "Database connection failed: " . $e->getMessage();
        }
        return false;
    }
}
