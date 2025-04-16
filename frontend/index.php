<?php
require_once 'includes/config.php';
require_once 'includes/functions.php';

// Determine which page to load
$page = isset($_GET['page']) ? sanitize($_GET['page']) : 'home';

// List of valid pages
$valid_pages = ['home', 'catalog', 'reader', 'profile', 'login', 'register', 'category'];

// If page is not valid, default to home
if (!in_array($page, $valid_pages)) {
    $page = 'home';
}

// Check if the user is logged in
$logged_in = isLoggedIn();

// Pages that require authentication
$auth_required = ['profile', 'reader'];

// Redirect to login if trying to access page that requires authentication
if (in_array($page, $auth_required) && !$logged_in) {
    header('Location: index.php?page=login&redirect=' . urlencode($page));
    exit;
}

// Pages where we don't want to show header/footer (optional)
$no_layout = ['reader'];

// Start output buffering
ob_start();

// Load the requested page
include_once "pages/{$page}.php";

// Get the page content
$content = ob_get_clean();

// Show page with or without layout
if (in_array($page, $no_layout)) {
    echo $content;
} else {
    include_once 'components/header.php';
    echo $content;
    include_once 'components/footer.php';
}
