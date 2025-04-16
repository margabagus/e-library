<?php
// Home page for E-Library
require_once 'includes/functions.php';
?>

<div class="main-content">
    <div class="container">
        <div class="hero-section">
            <div class="hero-content">
                <h1>Selamat Datang di E-Library</h1>
                <p>Akses ribuan buku digital, baca online atau offline, kapan saja dan di mana saja.</p>
                <div class="hero-buttons">
                    <a href="index.php?page=catalog" class="btn btn-primary">Jelajahi Katalog</a>
                    <?php if (!isLoggedIn()): ?>
                        <a href="index.php?page=register" class="btn btn-secondary">Daftar Sekarang</a>
                    <?php endif; ?>
                </div>
            </div>
            <div class="hero-image">
                <img src="assets/images/hero-image.jpg" alt="E-Library">
            </div>
        </div>

        <!-- Featured Books Section -->
        <section class="featured-section">
            <h2 class="section-title">Buku Pilihan</h2>
            <p class="section-subtitle">Koleksi buku terbaik dan terpopuler</p>

            <div class="featured-books">
                <div class="featured-slider">
                    <?php
                    // Get featured books from API
                    $featuredBooks = getFeaturedBooks(5);

                    if (!empty($featuredBooks)):
                        foreach ($featuredBooks as $index => $book):
                            $activeClass = ($index === 0) ? 'active' : '';
                    ?>
                            <div class="featured-book <?php echo $activeClass; ?>">
                                <div class="featured-book-inner">
                                    <div class="featured-book-cover">
                                        <img src="<?php echo $book['cover_image']; ?>" alt="<?php echo $book['title']; ?>">
                                    </div>
                                    <div class="featured-book-info">
                                        <h3><?php echo $book['title']; ?></h3>
                                        <p class="featured-book-author">By <?php echo $book['author']; ?></p>
                                        <p class="featured-book-description"><?php echo limitText($book['description'], 150); ?></p>
                                        <a href="index.php?page=reader&id=<?php echo $book['id']; ?>&format=<?php echo $book['format']; ?>" class="btn btn-primary">Baca Sekarang</a>
                                    </div>
                                </div>
                            </div>
                        <?php
                        endforeach;
                    else:
                        ?>
                        <div class="featured-book active">
                            <div class="featured-book-inner">
                                <div class="featured-book-cover">
                                    <img src="assets/images/default-cover.jpg" alt="Default Book">
                                </div>
                                <div class="featured-book-info">
                                    <h3>Tidak ada buku pilihan</h3>
                                    <p class="featured-book-description">Maaf, buku pilihan tidak tersedia saat ini.</p>
                                    <a href="index.php?page=catalog" class="btn btn-primary">Lihat Katalog</a>
                                </div>
                            </div>
                        </div>
                    <?php endif; ?>
                </div>
                <button class="slider-control prev-btn"><i class="fas fa-chevron-left"></i></button>
                <button class="slider-control next-btn"><i class="fas fa-chevron-right"></i></button>
            </div>
        </section>

        <!-- Categories Section -->
        <section class="categories-section">
            <h2 class="section-title">Kategori Buku</h2>
            <p class="section-subtitle">Temukan buku berdasarkan kategori</p>

            <div class="categories-grid">
                <?php
                // Get categories from API
                $categories = getCategories();

                if (!empty($categories)):
                    foreach ($categories as $category):
                ?>
                        <a href="index.php?page=catalog&category=<?php echo $category['id']; ?>" class="category-card">
                            <div class="category-icon">
                                <i class="<?php echo getCategoryIcon($category['name']); ?>"></i>
                            </div>
                            <h3 class="category-name"><?php echo $category['name']; ?></h3>
                            <span class="category-count"><?php echo $category['book_count']; ?> buku</span>
                        </a>
                    <?php
                    endforeach;
                else:
                    ?>
                    <div class="no-categories">
                        <p>Tidak ada kategori tersedia saat ini.</p>
                    </div>
                <?php endif; ?>
            </div>
        </section>

        <!-- Recent Books Section -->
        <section class="recent-section">
            <h2 class="section-title">Buku Terbaru</h2>
            <p class="section-subtitle">Tambahan terbaru ke koleksi perpustakaan</p>

            <div class="book-grid" id="recent-books">
                <!-- Recent books will be loaded here via JavaScript -->
                <div class="loader"></div>
            </div>

            <div class="view-more-container">
                <a href="index.php?page=catalog" class="btn btn-secondary">Lihat Semua Buku</a>
            </div>
        </section>

        <!-- Features Section -->
        <section class="features-section">
            <h2 class="section-title">Fitur Utama</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-book-reader"></i>
                    </div>
                    <h3>Baca Online & Offline</h3>
                    <p>Akses buku tanpa koneksi internet setelah diunduh sekali.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-mobile-alt"></i>
                    </div>
                    <h3>Responsif Mobile</h3>
                    <p>Desain adaptif untuk pengalaman membaca optimal di semua perangkat.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-download"></i>
                    </div>
                    <h3>Install sebagai Aplikasi</h3>
                    <p>Tambahkan ke layar utama untuk akses cepat seperti aplikasi native.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-bookmark"></i>
                    </div>
                    <h3>Simpan Progres</h3>
                    <p>Lanjutkan membaca dari halaman terakhir yang Anda baca.</p>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="cta-section">
            <div class="cta-content">
                <h2>Mulai Membaca Sekarang</h2>
                <p>Akses perpustakaan digital kami dan mulai eksplorasi pengetahuan.</p>
                <div class="cta-buttons">
                    <?php if (isLoggedIn()): ?>
                        <a href="index.php?page=catalog" class="btn btn-primary">Jelajahi Katalog</a>
                    <?php else: ?>
                        <a href="index.php?page=register" class="btn btn-primary">Daftar Gratis</a>
                        <a href="index.php?page=login" class="btn btn-secondary">Masuk</a>
                    <?php endif; ?>
                </div>
            </div>
        </section>
    </div>
</div>

<!-- Add PWA install prompt -->
<div id="pwa-install-prompt" style="display:none;">
    <div class="prompt-container">
        <div class="prompt-header">
            <h3>Install E-Library App</h3>
            <button id="close-prompt">&times;</button>
        </div>
        <div class="prompt-content">
            <p>Install aplikasi ini di perangkat Anda untuk akses offline dan pengalaman yang lebih baik.</p>
            <button id="install-button" class="btn btn-primary">Install</button>
        </div>
    </div>
</div>

<script>
    // PWA Install Prompt
    let deferredPrompt;
    const pwaPrompt = document.getElementById('pwa-install-prompt');
    const installButton = document.getElementById('install-button');
    const closePromptButton = document.getElementById('close-prompt');

    // Check if user has already dismissed or installed
    const hasPromptBeenShown = localStorage.getItem('pwaPromptShown');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;

        // Show the prompt if not previously dismissed or installed
        if (!hasPromptBeenShown) {
            pwaPrompt.style.display = 'block';
        }
    });

    installButton.addEventListener('click', (e) => {
        // Hide the prompt
        pwaPrompt.style.display = 'none';

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }

            // Mark as shown
            localStorage.setItem('pwaPromptShown', 'true');
            deferredPrompt = null;
        });
    });

    closePromptButton.addEventListener('click', () => {
        pwaPrompt.style.display = 'none';
        localStorage.setItem('pwaPromptShown', 'true');
    });

    // Check for app installed event
    window.addEventListener('appinstalled', (evt) => {
        console.log('App was installed');
        // Hide the prompt if visible
        pwaPrompt.style.display = 'none';
        localStorage.setItem('pwaPromptShown', 'true');
    });
</script>