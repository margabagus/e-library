<?php
// Login page for E-Library
require_once 'includes/functions.php';

// Check if user is already logged in
if (isLoggedIn()) {
    header('Location: index.php');
    exit;
}

// Get redirect parameter if present
$redirect = isset($_GET['redirect']) ? $_GET['redirect'] : '';

// Process login form submission
$error = '';
$email = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = sanitize($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    // Validate input
    if (empty($email) || empty($password)) {
        $error = 'Email dan password diperlukan.';
    } else {
        // Attempt login
        $user = loginUser($email, $password);

        if ($user) {
            // Login successful
            // Redirect to requested page or home
            if (!empty($redirect)) {
                header('Location: index.php?page=' . $redirect);
            } else {
                header('Location: index.php');
            }
            exit;
        } else {
            $error = 'Email atau password salah.';
        }
    }
}
?>

<div class="main-content">
    <div class="container">
        <div class="auth-container">
            <div class="form-container login-form">
                <h2 class="form-title">Masuk ke E-Library</h2>

                <?php if (!empty($error)): ?>
                    <div class="alert alert-danger"><?php echo $error; ?></div>
                <?php endif; ?>

                <form action="index.php?page=login<?php echo !empty($redirect) ? '&redirect=' . urlencode($redirect) : ''; ?>" method="post">
                    <div class="form-group">
                        <label for="email" class="form-label">Email</label>
                        <input type="email" id="email" name="email" class="form-input" value="<?php echo htmlspecialchars($email); ?>" required>
                    </div>

                    <div class="form-group">
                        <label for="password" class="form-label">Password</label>
                        <input type="password" id="password" name="password" class="form-input" required>
                    </div>

                    <div class="form-group form-checkbox">
                        <label class="checkbox-label">
                            <input type="checkbox" name="remember" checked>
                            <span class="checkbox-text">Ingat saya di perangkat ini</span>
                        </label>
                    </div>

                    <button type="submit" class="btn btn-primary form-btn">Masuk</button>
                </form>

                <div class="auth-links">
                    <p>Belum punya akun? <a href="index.php?page=register<?php echo !empty($redirect) ? '&redirect=' . urlencode($redirect) : ''; ?>">Daftar sekarang</a></p>
                </div>
            </div>

            <div class="auth-benefits">
                <h3>Keuntungan Bergabung dengan E-Library</h3>
                <ul class="benefits-list">
                    <li>
                        <div class="benefit-icon"><i class="fas fa-book-reader"></i></div>
                        <div class="benefit-text">
                            <h4>Akses Ribuan Buku</h4>
                            <p>Baca buku dari berbagai kategori kapan saja dan di mana saja.</p>
                        </div>
                    </li>
                    <li>
                        <div class="benefit-icon"><i class="fas fa-mobile-alt"></i></div>
                        <div class="benefit-text">
                            <h4>Baca di Semua Perangkat</h4>
                            <p>Nikmati buku favoritmu di smartphone, tablet, atau komputer.</p>
                        </div>
                    </li>
                    <li>
                        <div class="benefit-icon"><i class="fas fa-wifi-slash"></i></div>
                        <div class="benefit-text">
                            <h4>Mode Offline</h4>
                            <p>Simpan buku untuk dibaca saat tidak ada koneksi internet.</p>
                        </div>
                    </li>
                    <li>
                        <div class="benefit-icon"><i class="fas fa-bookmark"></i></div>
                        <div class="benefit-text">
                            <h4>Simpan Progres</h4>
                            <p>Lanjutkan membaca dari halaman terakhir yang kamu baca.</p>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</div>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Check if we're offline
        if (!navigator.onLine) {
            const form = document.querySelector('form');
            const offlineMsg = document.createElement('div');
            offlineMsg.className = 'alert alert-info';
            offlineMsg.innerHTML = 'Anda sedang offline. Masuk memerlukan koneksi internet.';
            form.appendChild(offlineMsg);

            // Disable form
            const inputs = form.querySelectorAll('input, button');
            inputs.forEach(input => {
                input.disabled = true;
            });
        }
    });
</script>