<?php
// Footer component for E-Library
$currentYear = date('Y');
?>

<!-- Footer -->
<footer class="footer">
    <div class="container footer-content">
        <div class="footer-logo-section">
            <div class="footer-logo">E-Library</div>
            <p class="footer-tagline">Perpustakaan digital untuk membaca e-book secara online dan offline</p>
            <div class="footer-social">
                <a href="#" class="social-link" title="Facebook"><i class="fab fa-facebook-f"></i></a>
                <a href="#" class="social-link" title="Twitter"><i class="fab fa-twitter"></i></a>
                <a href="#" class="social-link" title="Instagram"><i class="fab fa-instagram"></i></a>
            </div>
        </div>

        <div class="footer-links-section">
            <div class="footer-links-column">
                <h3>Navigasi</h3>
                <ul class="footer-links">
                    <li><a href="index.php">Beranda</a></li>
                    <li><a href="index.php?page=catalog">Katalog</a></li>
                    <li><a href="index.php?page=login">Masuk</a></li>
                    <li><a href="index.php?page=register">Daftar</a></li>
                </ul>
            </div>

            <div class="footer-links-column">
                <h3>Kategori</h3>
                <ul class="footer-links">
                    <?php
                    // Get top categories from API
                    $categories = getCategories();
                    $topCategories = array_slice($categories, 0, 4);

                    if (!empty($topCategories)):
                        foreach ($topCategories as $category):
                    ?>
                            <li><a href="index.php?page=catalog&category=<?php echo $category['id']; ?>"><?php echo $category['name']; ?></a></li>
                        <?php
                        endforeach;
                    else:
                        ?>
                        <li><a href="index.php?page=catalog">Semua Kategori</a></li>
                    <?php endif; ?>
                </ul>
            </div>

            <div class="footer-links-column">
                <h3>Informasi</h3>
                <ul class="footer-links">
                    <li><a href="#">Tentang Kami</a></li>
                    <li><a href="#">Syarat & Ketentuan</a></li>
                    <li><a href="#">Kebijakan Privasi</a></li>
                    <li><a href="#">Bantuan</a></li>
                </ul>
            </div>
        </div>
    </div>

    <div class="footer-bottom">
        <div class="container">
            <div class="copyright">
                &copy; <?php echo $currentYear; ?> E-Library. All rights reserved.
            </div>
            <div class="footer-app-info">
                <span class="pwa-badge">
                    <i class="fas fa-mobile-alt"></i> PWA Ready
                </span>
                <span class="offline-badge">
                    <i class="fas fa-wifi-slash"></i> Offline Support
                </span>
            </div>
        </div>
    </div>
</footer>

<!-- Back to top button -->
<button id="back-to-top" title="Back to top">
    <i class="fas fa-arrow-up"></i>
</button>

<!-- Scripts -->
<script src="/assets/js/offline.js"></script>
<script src="/assets/js/app.js"></script>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Back to top button
        const backToTopButton = document.getElementById('back-to-top');

        // Show button when page is scrolled
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        });

        // Scroll to top when button is clicked
        backToTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Check if service worker is registered
        if ('serviceWorker' in navigator) {
            const pwaBadge = document.querySelector('.pwa-badge');
            const offlineBadge = document.querySelector('.offline-badge');

            // Check if app is installed
            window.addEventListener('appinstalled', (e) => {
                if (pwaBadge) {
                    pwaBadge.classList.add('active');
                }
            });

            // Check if service worker is active
            navigator.serviceWorker.getRegistration().then(registration => {
                if (registration && pwaBadge) {
                    pwaBadge.classList.add('active');
                }
            });

            // Check for offline support
            if (window.offlineManager && offlineBadge) {
                offlineBadge.classList.add('active');
            }
        }
    });
</script>

</body>

</html>