<?php
// 404 page for E-Library
require_once 'includes/functions.php';

// Set 404 status
http_response_code(404);
?>

<div class="main-content">
    <div class="container">
        <div class="error-page">
            <div class="error-code">404</div>
            <h1 class="error-title">Halaman Tidak Ditemukan</h1>
            <p class="error-message">Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.</p>

            <div class="error-actions">
                <a href="index.php" class="btn btn-primary">Kembali ke Beranda</a>
                <a href="index.php?page=catalog" class="btn btn-secondary">Jelajahi Katalog</a>
            </div>

            <div class="error-suggestions">
                <h3>Mungkin Anda tertarik dengan buku-buku berikut:</h3>

                <div class="book-grid small-grid">
                    <?php
                    // Get some random featured books
                    $suggestedBooks = getFeaturedBooks(4);

                    if (!empty($suggestedBooks)):
                        foreach ($suggestedBooks as $book):
                    ?>
                            <div class="book-card">
                                <div class="book-cover">
                                    <img src="<?php echo $book['cover_image']; ?>" alt="<?php echo $book['title']; ?>">
                                    <div class="book-format"><?php echo $book['format']; ?></div>
                                </div>
                                <div class="book-info">
                                    <h3 class="book-title"><?php echo $book['title']; ?></h3>
                                    <div class="book-author"><?php echo $book['author']; ?></div>
                                </div>
                                <a href="index.php?page=reader&id=<?php echo $book['id']; ?>&format=<?php echo $book['format']; ?>" class="book-link"></a>
                            </div>
                        <?php
                        endforeach;
                    else:
                        ?>
                        <p>Tidak ada saran buku saat ini.</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    // Check for offline status
    document.addEventListener('DOMContentLoaded', function() {
        if (!navigator.onLine) {
            const errorPage = document.querySelector('.error-page');

            if (errorPage) {
                const offlineNotice = document.createElement('div');
                offlineNotice.className = 'offline-notice';
                offlineNotice.innerHTML = '<i class="fas fa-wifi-slash"></i> Anda sedang offline. Beberapa fitur mungkin tidak tersedia.';
                errorPage.prepend(offlineNotice);
            }
        }
    });
</script>