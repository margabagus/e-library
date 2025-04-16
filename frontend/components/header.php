<?php
// Header component for E-Library
require_once 'includes/functions.php';

// Get current page
$currentPage = isset($_GET['page']) ? $_GET['page'] : 'home';

// Check if user is logged in
$isLoggedIn = isLoggedIn();

// Get user data if logged in
$userData = null;
if ($isLoggedIn) {
    $result = apiRequest('/user/profile');
    if ($result && isset($result['data'])) {
        $userData = $result['data'];
    }
}
?>

<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-Library - <?php echo ucfirst($currentPage); ?></title>
    <meta name="description" content="E-Library - Perpustakaan digital untuk membaca e-book secara online dan offline">

    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#3498db">
    <link rel="manifest" href="/pwa/manifest.json">
    <link rel="apple-touch-icon" href="/assets/icons/icon-192x192.png">

    <!-- Favicon -->
    <link rel="shortcut icon" href="/assets/images/favicon.ico" type="image/x-icon">

    <!-- Stylesheets -->
    <link rel="stylesheet" href="/assets/css/main.css">
    <link rel="stylesheet" href="/assets/css/responsive.css">

    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
</head>

<body data-page="<?php echo $currentPage; ?>">
    <!-- Header -->
    <header class="header">
        <div class="container header-container">
            <a href="index.php" class="logo">E-Library</a>

            <button class="mobile-menu-toggle" id="mobile-menu-toggle">
                <i class="fas fa-bars"></i>
            </button>

            <nav class="main-nav">
                <ul class="nav-list" id="nav-list">
                    <li class="nav-item <?php echo $currentPage === 'home' ? 'active' : ''; ?>">
                        <a href="index.php" class="nav-link">Beranda</a>
                    </li>
                    <li class="nav-item <?php echo $currentPage === 'catalog' ? 'active' : ''; ?>">
                        <a href="index.php?page=catalog" class="nav-link">Katalog</a>
                    </li>
                    <?php if ($isLoggedIn): ?>
                        <li class="nav-item <?php echo $currentPage === 'profile' ? 'active' : ''; ?>">
                            <a href="index.php?page=profile" class="nav-link">Profil</a>
                        </li>
                    <?php endif; ?>
                </ul>
            </nav>

            <div class="auth-buttons">
                <?php if (!$isLoggedIn): ?>
                    <a href="index.php?page=login" class="btn btn-secondary">Masuk</a>
                    <a href="index.php?page=register" class="btn btn-primary">Daftar</a>
                <?php endif; ?>
            </div>

            <div class="user-menu-container" style="display: <?php echo $isLoggedIn ? 'block' : 'none'; ?>">
                <div class="user-menu">
                    <div class="user-info">
                        <span id="user-display-name"><?php echo $userData ? htmlspecialchars($userData['username']) : 'User'; ?></span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="user-dropdown">
                        <a href="index.php?page=profile">
                            <i class="fas fa-user"></i> Profil Saya
                        </a>
                        <a href="index.php?page=profile&section=recent">
                            <i class="fas fa-book-open"></i> Baru Dibaca
                        </a>
                        <a href="index.php?page=profile&section=offline">
                            <i class="fas fa-download"></i> Buku Offline
                        </a>
                        <a href="index.php?page=profile&section=settings">
                            <i class="fas fa-cog"></i> Pengaturan
                        </a>
                        <div class="dropdown-divider"></div>
                        <a href="#" id="header-logout-button">
                            <i class="fas fa-sign-out-alt"></i> Keluar
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Offline Indicator -->
    <div id="offline-indicator" class="offline-indicator"></div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // User dropdown menu toggle
            const userInfo = document.querySelector('.user-info');
            const userDropdown = document.querySelector('.user-dropdown');

            if (userInfo) {
                userInfo.addEventListener('click', function(e) {
                    e.stopPropagation();
                    userDropdown.classList.toggle('active');
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', function(e) {
                    if (!userInfo.contains(e.target)) {
                        userDropdown.classList.remove('active');
                    }
                });
            }

            // Logout button in header
            const headerLogoutButton = document.getElementById('header-logout-button');

            if (headerLogoutButton) {
                headerLogoutButton.addEventListener('click', function(e) {
                    e.preventDefault();

                    if (confirm('Apakah Anda yakin ingin keluar?')) {
                        // Clear auth token
                        localStorage.removeItem('auth_token');
                        // Redirect to home page
                        window.location.href = 'index.php';
                    }
                });
            }
        });
    </script>