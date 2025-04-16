<?php
// Reader page for E-Library
require_once 'includes/functions.php';

// Get book ID and format from URL
$bookId = isset($_GET['id']) ? $_GET['id'] : null;
$format = isset($_GET['format']) ? $_GET['format'] : null;

// Redirect if no book ID or format
if (!$bookId || !$format) {
    header('Location: index.php?page=catalog');
    exit;
}

// Check if user is logged in
if (!isLoggedIn()) {
    // Save the current URL for redirect after login
    $redirect = 'reader&id=' . $bookId . '&format=' . $format;
    header('Location: index.php?page=login&redirect=' . urlencode($redirect));
    exit;
}

// Get book details from API
$book = getBookById($bookId);

// If book not found, redirect to catalog
if (!$book) {
    header('Location: index.php?page=catalog');
    exit;
}
?>

<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $book['title']; ?> - E-Library</title>
    <meta name="description" content="Baca <?php echo $book['title']; ?> oleh <?php echo $book['author']; ?> di E-Library">

    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#3498db">
    <link rel="manifest" href="/pwa/manifest.json">
    <link rel="apple-touch-icon" href="/assets/icons/icon-192x192.png">

    <!-- Favicon -->
    <link rel="shortcut icon" href="/assets/images/favicon.ico" type="image/x-icon">

    <!-- Stylesheets -->
    <link rel="stylesheet" href="/assets/css/main.css">
    <link rel="stylesheet" href="/assets/css/reader.css">
    <link rel="stylesheet" href="/assets/css/responsive.css">

    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
</head>

<body class="reader-page theme-light font-medium">
    <!-- Reader Container -->
    <div class="reader-container" id="reader-container">
        <!-- Book Content Area -->
        <div class="book-content" id="book-content">
            <!-- Content will be loaded here by the reader.js script -->
        </div>

        <!-- Loading Indicator -->
        <div class="loader" id="loader"></div>

        <!-- Reader Controls -->
        <div class="reader-controls">
            <div class="control-left">
                <button id="exit-reader" class="exit-reader-btn">
                    <i class="fas fa-arrow-left"></i> Kembali
                </button>
            </div>

            <div class="control-center">
                <div class="page-navigation">
                    <button id="prev-page" class="page-nav-btn" disabled>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div id="page-count" class="page-count">Page 0 of 0</div>
                    <button id="next-page" class="page-nav-btn">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>

            <div class="control-right">
                <div class="control-buttons">
                    <button id="offline-button" title="Save for Offline Reading">
                        <i class="fas fa-download"></i>
                    </button>
                    <button id="settings-button" title="Reader Settings">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Reader Settings Panel -->
        <div class="reader-settings-panel" id="settings-panel">
            <div class="settings-group">
                <div class="settings-title">Theme</div>
                <div class="theme-options">
                    <div class="theme-option theme-light-option" data-theme="light" title="Light Theme">
                        <i class="fas fa-sun"></i>
                    </div>
                    <div class="theme-option theme-sepia-option" data-theme="sepia" title="Sepia Theme">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="theme-option theme-dark-option" data-theme="dark" title="Dark Theme">
                        <i class="fas fa-moon"></i>
                    </div>
                </div>
            </div>

            <div class="settings-group">
                <div class="settings-title">Font Size</div>
                <div class="font-size-options">
                    <div class="font-size-option" data-size="small" title="Small">
                        A
                    </div>
                    <div class="font-size-option" data-size="medium" title="Medium">
                        A
                    </div>
                    <div class="font-size-option" data-size="large" title="Large">
                        A
                    </div>
                    <div class="font-size-option" data-size="xlarge" title="Extra Large">
                        A
                    </div>
                </div>
            </div>
        </div>

        <!-- Touch overlay for mobile swiping -->
        <div class="touch-overlay">
            <div class="touch-left"></div>
            <div class="touch-right"></div>
        </div>
    </div>

    <!-- Book Metadata (hidden, for JavaScript) -->
    <div id="book-metadata" data-book-id="<?php echo $book['id']; ?>" data-format="<?php echo $book['format']; ?>" data-title="<?php echo htmlspecialchars($book['title']); ?>" data-author="<?php echo htmlspecialchars($book['author']); ?>" style="display:none;"></div>

    <!-- Scripts -->
    <script src="/assets/js/offline.js"></script>
    <script src="/assets/js/reader.js"></script>

    <script>
        // Initialize offline functionality for this book
        document.addEventListener('DOMContentLoaded', function() {
            const offlineButton = document.getElementById('offline-button');
            const bookId = document.getElementById('book-metadata').dataset.bookId;
            const bookFormat = document.getElementById('book-metadata').dataset.format;

            // Check if this book is available offline
            if (window.offlineManager) {
                window.offlineManager.isBookAvailableOffline(bookId)
                    .then(isAvailable => {
                        if (isAvailable) {
                            // Update button to show it's already saved
                            offlineButton.innerHTML = '<i class="fas fa-check"></i>';
                            offlineButton.title = 'Saved for Offline Reading';
                            offlineButton.classList.add('saved-offline');
                        }
                    });
            }

            // Add event listener to save book for offline reading
            offlineButton.addEventListener('click', async function() {
                if (offlineButton.classList.contains('saved-offline')) {
                    // Already saved, offer to remove
                    if (confirm('This book is already saved for offline reading. Do you want to remove it from offline storage?')) {
                        try {
                            await window.offlineManager.removeOfflineBook(bookId);
                            offlineButton.innerHTML = '<i class="fas fa-download"></i>';
                            offlineButton.title = 'Save for Offline Reading';
                            offlineButton.classList.remove('saved-offline');
                            alert('Book removed from offline storage');
                        } catch (error) {
                            alert('Failed to remove book: ' + error.message);
                        }
                    }
                } else {
                    // Save for offline
                    offlineButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    offlineButton.disabled = true;

                    try {
                        await window.offlineManager.downloadBookForOffline(bookId);
                        offlineButton.innerHTML = '<i class="fas fa-check"></i>';
                        offlineButton.title = 'Saved for Offline Reading';
                        offlineButton.classList.add('saved-offline');
                        alert('Book saved for offline reading');
                    } catch (error) {
                        offlineButton.innerHTML = '<i class="fas fa-download"></i>';
                        alert('Failed to save book for offline reading: ' + error.message);
                    } finally {
                        offlineButton.disabled = false;
                    }
                }
            });
        });
    </script>
</body>

</html>