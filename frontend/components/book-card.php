<?php

/**
 * Book card component for E-Library
 * 
 * Usage:
 * include_once 'components/book-card.php';
 * echo renderBookCard($book, $options);
 * 
 * @param array $book Book data
 * @param array $options Additional options
 * @return string HTML output
 */

/**
 * Render book card HTML
 * @param array $book Book data
 * @param array $options Additional options
 * @return string HTML output
 */
function renderBookCard($book, $options = [])
{
    // Default options
    $defaultOptions = [
        'showDescription' => false,
        'showCategory' => true,
        'showReadingProgress' => false,
        'showOfflineBadge' => false,
        'cardClass' => '',
    ];

    // Merge options
    $options = array_merge($defaultOptions, $options);

    // Check required fields
    if (!isset($book['id']) || !isset($book['title']) || !isset($book['author'])) {
        return '<div class="book-card error">Invalid book data</div>';
    }

    // Begin output buffer
    ob_start();

    // Get reading progress if needed
    $progress = null;
    if ($options['showReadingProgress'] && isLoggedIn()) {
        $progress = getReadingProgress($book['id']);
    }

    // Check if book is available offline
    $isOffline = false;
    if ($options['showOfflineBadge']) {
        $isOffline = checkBookOfflineAvailability($book['id']);
    }

    // Build CSS classes
    $classes = ['book-card'];

    if (!empty($options['cardClass'])) {
        $classes[] = $options['cardClass'];
    }

    if ($isOffline) {
        $classes[] = 'offline-available';
    }

    if ($progress) {
        $classes[] = 'already-read';
    }

    $classAttribute = implode(' ', $classes);
?>
    <div class="<?php echo $classAttribute; ?>" data-id="<?php echo $book['id']; ?>" data-format="<?php echo strtolower($book['format']); ?>">
        <div class="book-cover">
            <img src="<?php echo $book['cover_image'] ?? '/assets/images/default-cover.jpg'; ?>" alt="<?php echo htmlspecialchars($book['title']); ?>">
            <div class="book-format"><?php echo htmlspecialchars($book['format']); ?></div>

            <?php if ($isOffline): ?>
                <div class="offline-badge">Tersedia Offline</div>
            <?php endif; ?>

            <?php if ($progress): ?>
                <div class="reading-progress-bar">
                    <div class="progress-fill" style="width: <?php echo min(100, max(0, round(($progress['current_page'] / max(1, $progress['total_pages'])) * 100))); ?>%"></div>
                </div>
            <?php endif; ?>
        </div>

        <div class="book-info">
            <h3 class="book-title"><?php echo htmlspecialchars($book['title']); ?></h3>
            <div class="book-author"><?php echo htmlspecialchars($book['author']); ?></div>

            <?php if ($options['showDescription'] && isset($book['description'])): ?>
                <div class="book-description"><?php echo limitText($book['description'], 100); ?></div>
            <?php endif; ?>

            <?php if ($options['showCategory'] && isset($book['category_name'])): ?>
                <div class="book-category"><?php echo htmlspecialchars($book['category_name']); ?></div>
            <?php endif; ?>

            <?php if ($progress): ?>
                <div class="reading-progress">
                    <span class="page-indicator">Halaman <?php echo $progress['current_page']; ?> dari <?php echo $progress['total_pages']; ?></span>
                    <span class="percent-indicator"><?php echo min(100, max(0, round(($progress['current_page'] / max(1, $progress['total_pages'])) * 100))); ?>%</span>
                </div>
            <?php endif; ?>
        </div>

        <a href="index.php?page=reader&id=<?php echo $book['id']; ?>&format=<?php echo $book['format']; ?>" class="book-link"></a>
    </div>
<?php

    // Return output buffer content
    return ob_get_clean();
}

/**
 * Check if book is available offline
 * This is a placeholder function - actual implementation would use IndexedDB via JavaScript
 * @param string $bookId Book ID
 * @return bool True if available offline
 */
function checkBookOfflineAvailability($bookId)
{
    // This would normally be checked client-side with JavaScript
    // Return false by default
    return false;
}
