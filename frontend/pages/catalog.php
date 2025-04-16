<?php
// Catalog page for E-Library
require_once 'includes/functions.php';

// Get category ID from URL if present
$categoryId = isset($_GET['category']) ? $_GET['category'] : null;
$searchQuery = isset($_GET['q']) ? $_GET['q'] : null;

// Get category name if ID is provided
$categoryName = '';
if ($categoryId) {
    $category = getCategoryById($categoryId);
    $categoryName = $category ? $category['name'] : '';
}
?>

<div class="main-content">
    <div class="container">
        <div class="catalog-header">
            <?php if ($searchQuery): ?>
                <h1>Hasil Pencarian: "<?php echo htmlspecialchars($searchQuery); ?>"</h1>
            <?php elseif ($categoryName): ?>
                <h1>Kategori: <?php echo $categoryName; ?></h1>
            <?php else: ?>
                <h1>Katalog Buku</h1>
            <?php endif; ?>

            <div class="catalog-search">
                <form id="search-form" action="index.php" method="get">
                    <input type="hidden" name="page" value="catalog">
                    <div class="search-input-group">
                        <input type="text" name="q" id="search-input" placeholder="Cari judul, penulis, atau kata kunci..." value="<?php echo htmlspecialchars($searchQuery ?? ''); ?>">
                        <button type="submit" class="search-btn">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <div class="catalog-filters">
            <div class="filter-section">
                <h3>Kategori</h3>
                <div class="category-list" id="category-list">
                    <!-- Categories will be loaded here via JavaScript -->
                    <div class="category-item active" data-category-id="all">Semua Buku</div>
                    <?php
                    // Get categories from API
                    $categories = getCategories();

                    if (!empty($categories)):
                        foreach ($categories as $category):
                            $activeClass = ($categoryId && $categoryId === $category['id']) ? 'active' : '';
                    ?>
                            <div class="category-item <?php echo $activeClass; ?>" data-category-id="<?php echo $category['id']; ?>">
                                <?php echo $category['name']; ?>
                            </div>
                    <?php
                        endforeach;
                    endif;
                    ?>
                </div>
            </div>

            <div class="filter-section">
                <h3>Format</h3>
                <div class="format-options">
                    <label class="format-option">
                        <input type="checkbox" value="pdf" checked> PDF
                    </label>
                    <label class="format-option">
                        <input type="checkbox" value="epub" checked> EPUB
                    </label>
                    <label class="format-option">
                        <input type="checkbox" value="mobi" checked> MOBI
                    </label>
                </div>
            </div>

            <?php if (isLoggedIn()): ?>
                <div class="filter-section">
                    <h3>Status</h3>
                    <div class="status-options">
                        <label class="status-option">
                            <input type="checkbox" value="all" checked> Semua
                        </label>
                        <label class="status-option">
                            <input type="checkbox" value="offline"> Tersedia Offline
                        </label>
                        <label class="status-option">
                            <input type="checkbox" value="read"> Sudah Dibaca
                        </label>
                    </div>
                </div>
            <?php endif; ?>
        </div>

        <div class="catalog-content">
            <!-- Offline indicator -->
            <div id="offline-indicator" class="offline-indicator"></div>

            <!-- Books grid -->
            <div class="book-grid" id="book-grid">
                <!-- Books will be loaded here via JavaScript -->
                <div class="loader"></div>
            </div>

            <!-- Pagination -->
            <div class="pagination" id="pagination">
                <!-- Pagination will be added here via JavaScript if needed -->
            </div>
        </div>
    </div>
</div>

<script>
    // Format filter functionality
    document.querySelectorAll('.format-option input').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            filterBooksByFormat();
        });
    });

    // Status filter functionality (for logged in users)
    document.querySelectorAll('.status-option input').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            filterBooksByStatus();
        });
    });

    // Filter books by format
    function filterBooksByFormat() {
        const selectedFormats = Array.from(document.querySelectorAll('.format-option input:checked'))
            .map(checkbox => checkbox.value);

        document.querySelectorAll('.book-card').forEach(book => {
            const format = book.querySelector('.book-format').textContent.toLowerCase();
            if (selectedFormats.includes(format)) {
                book.style.display = '';
            } else {
                book.style.display = 'none';
            }
        });

        checkEmptyResults();
    }

    // Filter books by status (read/offline)
    function filterBooksByStatus() {
        const selectedStatuses = Array.from(document.querySelectorAll('.status-option input:checked'))
            .map(checkbox => checkbox.value);

        // If "all" is selected, show all books
        if (selectedStatuses.includes('all')) {
            document.querySelectorAll('.book-card').forEach(book => {
                book.style.display = '';
            });
            return;
        }

        document.querySelectorAll('.book-card').forEach(book => {
            const bookId = book.querySelector('.book-link').getAttribute('href').split('id=')[1].split('&')[0];
            let showBook = false;

            // Check each selected status
            if (selectedStatuses.includes('offline') && book.classList.contains('offline-available')) {
                showBook = true;
            }

            if (selectedStatuses.includes('read') && book.classList.contains('already-read')) {
                showBook = true;
            }

            book.style.display = showBook ? '' : 'none';
        });

        checkEmptyResults();
    }

    // Check if there are no visible books after filtering
    function checkEmptyResults() {
        const bookGrid = document.getElementById('book-grid');
        const visibleBooks = bookGrid.querySelectorAll('.book-card[style="display: none;"]');

        // If all books are hidden, show a message
        if (visibleBooks.length === bookGrid.querySelectorAll('.book-card').length) {
            let noResultsElem = bookGrid.querySelector('.no-results');
            if (!noResultsElem) {
                noResultsElem = document.createElement('p');
                noResultsElem.className = 'no-results';
                noResultsElem.textContent = 'Tidak ada buku yang sesuai dengan filter yang dipilih.';
                bookGrid.appendChild(noResultsElem);
            }
        } else {
            const noResultsElem = bookGrid.querySelector('.no-results');
            if (noResultsElem) {
                noResultsElem.remove();
            }
        }
    }

    // Check if books are available offline
    async function checkOfflineAvailability() {
        if (!window.offlineManager) return;

        document.querySelectorAll('.book-card').forEach(async bookCard => {
            const bookLink = bookCard.querySelector('.book-link');
            if (!bookLink) return;

            const href = bookLink.getAttribute('href');
            const bookId = href.split('id=')[1]?.split('&')[0];

            if (bookId) {
                const isAvailableOffline = await window.offlineManager.isBookAvailableOffline(bookId);
                if (isAvailableOffline) {
                    bookCard.classList.add('offline-available');

                    // Add offline badge if not exists
                    if (!bookCard.querySelector('.offline-badge')) {
                        const offlineBadge = document.createElement('div');
                        offlineBadge.className = 'offline-badge';
                        offlineBadge.textContent = 'Tersedia Offline';
                        bookCard.querySelector('.book-cover').appendChild(offlineBadge);
                    }
                }
            }
        });
    }

    // Check reading progress for books (for logged in users)
    async function checkReadingProgress() {
        if (!window.offlineManager) return;

        try {
            const books = document.querySelectorAll('.book-card');
            for (const bookCard of books) {
                const bookLink = bookCard.querySelector('.book-link');
                if (!bookLink) continue;

                const href = bookLink.getAttribute('href');
                const bookId = href.split('id=')[1]?.split('&')[0];

                if (bookId) {
                    const progress = await window.offlineManager.getReadingProgress(bookId);
                    if (progress) {
                        bookCard.classList.add('already-read');

                        // Calculate percentage
                        const percent = Math.round((progress.currentPage / progress.totalPages) * 100) || 0;

                        // Add progress bar if not exists
                        if (!bookCard.querySelector('.reading-progress-bar')) {
                            const progressBar = document.createElement('div');
                            progressBar.className = 'reading-progress-bar';
                            progressBar.innerHTML = `<div class="progress-fill" style="width: ${percent}%"></div>`;
                            bookCard.querySelector('.book-cover').appendChild(progressBar);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error checking reading progress:', error);
        }
    }

    // When DOM is loaded, check offline availability and reading progress
    document.addEventListener('DOMContentLoaded', () => {
        // Give time for the books to load via the main app.js
        setTimeout(() => {
            checkOfflineAvailability();
            checkReadingProgress();
        }, 1000);
    });
</script>