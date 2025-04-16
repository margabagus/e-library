<?php
// 503 Service Unavailable page for E-Library
require_once 'includes/functions.php';

// Set 503 status
http_response_code(503);
?>

<div class="main-content">
    <div class="container">
        <div class="error-page">
            <div class="error-code">503</div>
            <h1 class="error-title">Layanan Tidak Tersedia</h1>
            <p class="error-message">Maaf, layanan saat ini sedang tidak tersedia. Kami sedang melakukan pemeliharaan atau pengembangan sistem.</p>

            <div class="maintenance-info">
                <div class="maintenance-icon">
                    <i class="fas fa-tools"></i>
                </div>
                <div class="maintenance-details">
                    <h3>Informasi Pemeliharaan</h3>
                    <p>Kami sedang melakukan peningkatan sistem untuk memberikan pengalaman yang lebih baik.</p>
                    <p>Silakan coba lagi dalam beberapa saat.</p>
                </div>
            </div>

            <div class="error-actions">
                <button onclick="location.reload()" class="btn btn-primary">Coba Lagi</button>
                <a href="index.php" class="btn btn-secondary">Kembali ke Beranda</a>
            </div>

            <div class="offline-books-section" id="offline-books-section" style="display: none;">
                <h3>Buku yang Tersedia Offline</h3>
                <p>Anda masih dapat membaca buku-buku yang telah tersimpan untuk akses offline:</p>

                <div class="book-grid small-grid" id="offline-books-grid">
                    <div class="loader"></div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    // Check for offline status and load offline books
    document.addEventListener('DOMContentLoaded', function() {
        const offlineBooksSection = document.getElementById('offline-books-section');
        const offlineBooksGrid = document.getElementById('offline-books-grid');

        // Check for offline books
        if (window.offlineManager) {
            window.offlineManager.getAllOfflineBooks().then(books => {
                if (books && books.length > 0) {
                    // Show offline books section
                    offlineBooksSection.style.display = 'block';

                    // Clear loader
                    offlineBooksGrid.innerHTML = '';

                    // Add each book
                    books.forEach(book => {
                        const bookCard = document.createElement('div');
                        bookCard.className = 'book-card';

                        bookCard.innerHTML = `
                        <div class="book-cover">
                            <img src="${book.cover_image || '/assets/images/default-cover.jpg'}" alt="${book.title}">
                            <div class="book-format">${book.format}</div>
                            <div class="offline-badge">Available Offline</div>
                        </div>
                        <div class="book-info">
                            <h3 class="book-title">${book.title}</h3>
                            <div class="book-author">${book.author}</div>
                        </div>
                        <a href="index.php?page=reader&id=${book.id}&format=${book.format}" class="book-link"></a>
                    `;

                        offlineBooksGrid.appendChild(bookCard);
                    });
                }
            }).catch(error => {
                console.error('Error loading offline books:', error);
                offlineBooksGrid.innerHTML = '<p>Gagal memuat buku offline.</p>';
            });
        }

        // Add offline notice if offline
        if (!navigator.onLine) {
            const errorPage = document.querySelector('.error-page');

            if (errorPage) {
                const offlineNotice = document.createElement('div');
                offlineNotice.className = 'offline-notice';
                offlineNotice.innerHTML = '<i class="fas fa-wifi-slash"></i> Anda sedang offline. Server mungkin tidak tersedia hingga koneksi dipulihkan.';
                errorPage.prepend(offlineNotice);
            }
        }
    });
</script>