<?php

/**
 * Sidebar component for E-Library
 * Typically used in catalog and home pages
 */

require_once 'includes/functions.php';

// Get current page
$currentPage = isset($_GET['page']) ? $_GET['page'] : 'home';

// Get current category if on catalog page
$currentCategory = isset($_GET['category']) ? $_GET['category'] : null;

// Get all categories
$categories = getCategories();
?>

<div class="sidebar">
    <!-- Categories Section -->
    <div class="sidebar-section categories-section">
        <h3 class="sidebar-title">Kategori</h3>
        <ul class="sidebar-list">
            <li class="<?php echo empty($currentCategory) ? 'active' : ''; ?>">
                <a href="index.php?page=catalog">Semua Buku</a>
            </li>
            <?php if (!empty($categories)): ?>
                <?php foreach ($categories as $category): ?>
                    <li class="<?php echo $currentCategory == $category['id'] ? 'active' : ''; ?>">
                        <a href="index.php?page=catalog&category=<?php echo $category['id']; ?>">
                            <?php echo htmlspecialchars($category['name']); ?>
                            <span class="category-count">(<?php echo $category['book_count']; ?>)</span>
                        </a>
                    </li>
                <?php endforeach; ?>
            <?php else: ?>
                <li><em>Tidak ada kategori</em></li>
            <?php endif; ?>
        </ul>
    </div>

    <?php if ($currentPage == 'catalog'): ?>
        <!-- Filters Section (only on catalog page) -->
        <div class="sidebar-section filters-section">
            <h3 class="sidebar-title">Filter</h3>

            <div class="filter-group">
                <h4>Format</h4>
                <div class="checkbox-list">
                    <label class="checkbox-item">
                        <input type="checkbox" class="format-filter" value="pdf" checked> PDF
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" class="format-filter" value="epub" checked> EPUB
                    </label>
                    <label class="checkbox-item">
                        <input type="checkbox" class="format-filter" value="mobi" checked> MOBI
                    </label>
                </div>
            </div>

            <?php if (isLoggedIn()): ?>
                <div class="filter-group">
                    <h4>Status</h4>
                    <div class="checkbox-list">
                        <label class="checkbox-item">
                            <input type="checkbox" class="status-filter" value="offline"> Tersedia Offline
                        </label>
                        <label class="checkbox-item">
                            <input type="checkbox" class="status-filter" value="read"> Sudah Dibaca
                        </label>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    <?php endif; ?>

    <!-- Popular Books Section -->
    <?php if ($currentPage == 'home' || $currentPage == 'catalog'):
        // Get popular books
        $popularBooks = apiRequest('/books/popular?limit=3');
        $books = isset($popularBooks['data']) ? $popularBooks['data'] : [];
    ?>
        <div class="sidebar-section popular-books-section">
            <h3 class="sidebar-title">Populer</h3>

            <?php if (!empty($books)): ?>
                <div class="sidebar-book-list">
                    <?php foreach ($books as $book): ?>
                        <div class="sidebar-book-item">
                            <div class="sidebar-book-cover">
                                <img src="<?php echo $book['cover_image'] ?? '/assets/images/default-cover.jpg'; ?>" alt="<?php echo htmlspecialchars($book['title']); ?>">
                            </div>
                            <div class="sidebar-book-info">
                                <h4 class="sidebar-book-title">
                                    <a href="index.php?page=reader&id=<?php echo $book['id']; ?>&format=<?php echo $book['format']; ?>">
                                        <?php echo htmlspecialchars($book['title']); ?>
                                    </a>
                                </h4>
                                <div class="sidebar-book-author"><?php echo htmlspecialchars($book['author']); ?></div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php else: ?>
                <p>Tidak ada buku populer saat ini.</p>
            <?php endif; ?>
        </div>
    <?php endif; ?>

    <!-- Recent Books Section (for logged in users) -->
    <?php if (isLoggedIn() && ($currentPage == 'home')):
        // Get recent books for current user
        $recentBooks = apiRequest('/user/recent-books?limit=2');
        $books = isset($recentBooks['data']) ? $recentBooks['data'] : [];
    ?>
        <div class="sidebar-section recent-books-section">
            <h3 class="sidebar-title">Baru Dibaca</h3>

            <?php if (!empty($books)): ?>
                <div class="sidebar-book-list">
                    <?php foreach ($books as $book): ?>
                        <div class="sidebar-book-item">
                            <div class="sidebar-book-cover">
                                <img src="<?php echo $book['book']['cover_image'] ?? '/assets/images/default-cover.jpg'; ?>" alt="<?php echo htmlspecialchars($book['book']['title']); ?>">
                            </div>
                            <div class="sidebar-book-info">
                                <h4 class="sidebar-book-title">
                                    <a href="index.php?page=reader&id=<?php echo $book['book']['id']; ?>&format=<?php echo $book['book']['format']; ?>">
                                        <?php echo htmlspecialchars($book['book']['title']); ?>
                                    </a>
                                </h4>
                                <div class="reading-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: <?php echo min(100, round(($book['progress']['current_page'] / max(1, $book['progress']['total_pages'])) * 100)); ?>%"></div>
                                    </div>
                                    <div class="progress-text">
                                        <?php echo $book['progress']['current_page']; ?>/<?php echo $book['progress']['total_pages']; ?>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>

                <div class="sidebar-footer">
                    <a href="index.php?page=profile&section=recent" class="btn btn-sm btn-secondary">Lihat Semua</a>
                </div>
            <?php else: ?>
                <p>Belum ada buku yang dibaca.</p>
            <?php endif; ?>
        </div>
    <?php endif; ?>

    <!-- Online/Offline Status Indicator -->
    <div class="sidebar-section online-status-section">
        <div class="online-status-indicator">
            <span class="status-icon online"><i class="fas fa-wifi"></i></span>
            <span class="status-text">Online</span>
        </div>
    </div>
</div>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Update online/offline status
        const statusIndicator = document.querySelector('.online-status-indicator');
        const statusIcon = document.querySelector('.status-icon');
        const statusText = document.querySelector('.status-text');

        function updateOnlineStatus() {
            if (navigator.onLine) {
                statusIndicator.classList.remove('offline');
                statusIndicator.classList.add('online');
                statusIcon.innerHTML = '<i class="fas fa-wifi"></i>';
                statusText.textContent = 'Online';
            } else {
                statusIndicator.classList.remove('online');
                statusIndicator.classList.add('offline');
                statusIcon.innerHTML = '<i class="fas fa-wifi-slash"></i>';
                statusText.textContent = 'Offline';
            }
        }

        // Initial check
        updateOnlineStatus();

        // Listen for changes
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        // Filter functionality
        const formatFilters = document.querySelectorAll('.format-filter');
        const statusFilters = document.querySelectorAll('.status-filter');

        function applyFilters() {
            if (window.catalogModule) {
                window.catalogModule.updateFormatFilters();
                window.catalogModule.updateStatusFilters();
                window.catalogModule.applyFilters();
            }
        }

        // Bind filter events
        formatFilters.forEach(filter => {
            filter.addEventListener('change', applyFilters);
        });

        statusFilters.forEach(filter => {
            filter.addEventListener('change', applyFilters);
        });
    });
</script>