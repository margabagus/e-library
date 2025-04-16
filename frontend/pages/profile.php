<?php
// Profile page for E-Library
require_once 'includes/functions.php';

// Check if user is logged in
if (!isLoggedIn()) {
    header('Location: index.php?page=login&redirect=profile');
    exit;
}

// Get section parameter if present
$section = isset($_GET['section']) ? sanitize($_GET['section']) : 'profile';

// Valid sections
$validSections = ['profile', 'recent', 'offline', 'settings'];
if (!in_array($section, $validSections)) {
    $section = 'profile';
}

// Get user data
$userId = getCurrentUserId();
$userData = apiRequest('/user/profile');

// Default to empty data if API request fails
if (!$userData || !isset($userData['data'])) {
    $userData = [
        'data' => [
            'username' => 'User',
            'email' => '',
            'created_at' => date('Y-m-d'),
            'stats' => [
                'books_read' => 0,
                'total_pages' => 0,
                'total_reading_time' => 0
            ]
        ]
    ];
}

$user = $userData['data'];
?>

<div class="main-content">
    <div class="container">
        <div class="profile-layout">
            <!-- Profile Sidebar -->
            <div class="profile-sidebar">
                <div class="profile-user-info">
                    <div class="profile-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <h3 class="profile-username"><?php echo htmlspecialchars($user['username']); ?></h3>
                </div>

                <nav class="profile-nav">
                    <ul>
                        <li class="<?php echo $section === 'profile' ? 'active' : ''; ?>">
                            <a href="index.php?page=profile&section=profile">
                                <i class="fas fa-user"></i> Profil Saya
                            </a>
                        </li>
                        <li class="<?php echo $section === 'recent' ? 'active' : ''; ?>">
                            <a href="index.php?page=profile&section=recent">
                                <i class="fas fa-book-open"></i> Baru Dibaca
                            </a>
                        </li>
                        <li class="<?php echo $section === 'offline' ? 'active' : ''; ?>">
                            <a href="index.php?page=profile&section=offline">
                                <i class="fas fa-download"></i> Buku Offline
                            </a>
                        </li>
                        <li class="<?php echo $section === 'settings' ? 'active' : ''; ?>">
                            <a href="index.php?page=profile&section=settings">
                                <i class="fas fa-cog"></i> Pengaturan
                            </a>
                        </li>
                        <li>
                            <a href="#" id="logout-button">
                                <i class="fas fa-sign-out-alt"></i> Keluar
                            </a>
                        </li>
                    </ul>
                </nav>

                <div class="online-status">
                    <div class="online-status-indicator online">Online</div>
                </div>
            </div>

            <!-- Profile Content -->
            <div class="profile-content">
                <?php if ($section === 'profile'): ?>
                    <div id="profile-container">
                        <h2 class="profile-section-title">Profil Saya</h2>

                        <div class="profile-card">
                            <div class="profile-header">
                                <h3>Informasi Profil</h3>
                                <button class="btn btn-secondary btn-sm" id="edit-profile-btn">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </div>
                            <div class="profile-info">
                                <div class="info-row">
                                    <span class="info-label">Username:</span>
                                    <span class="info-value"><?php echo htmlspecialchars($user['username']); ?></span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Email:</span>
                                    <span class="info-value"><?php echo htmlspecialchars($user['email']); ?></span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Anggota Sejak:</span>
                                    <span class="info-value"><?php echo formatDate($user['created_at']); ?></span>
                                </div>
                            </div>
                        </div>

                        <div class="profile-stats">
                            <h3>Statistik Membaca</h3>
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-value"><?php echo number_format($user['stats']['books_read']); ?></div>
                                    <div class="stat-label">Buku Dibaca</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value"><?php echo number_format($user['stats']['total_pages']); ?></div>
                                    <div class="stat-label">Halaman Dibaca</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value"><?php echo formatReadingTime($user['stats']['total_reading_time']); ?></div>
                                    <div class="stat-label">Waktu Membaca</div>
                                </div>
                            </div>
                        </div>

                        <div class="reading-history">
                            <h3>Aktivitas Membaca Terbaru</h3>
                            <div id="reading-history-container">
                                <div class="loader"></div>
                            </div>
                        </div>
                    </div>

                <?php elseif ($section === 'recent'): ?>
                    <h2 class="profile-section-title">Baru Dibaca</h2>
                    <div id="recent-books-container">
                        <div class="loader"></div>
                    </div>

                <?php elseif ($section === 'offline'): ?>
                    <h2 class="profile-section-title">Buku Offline</h2>
                    <p class="section-description">Buku yang tersedia untuk dibaca tanpa koneksi internet.</p>

                    <div id="offline-books-container">
                        <div class="loader"></div>
                    </div>

                <?php elseif ($section === 'settings'): ?>
                    <h2 class="profile-section-title">Pengaturan</h2>

                    <div class="settings-card">
                        <h3>Preferensi Pembaca</h3>
                        <form id="reader-settings-form" class="settings-form">
                            <div class="form-group">
                                <label class="form-label">Tema Default</label>
                                <div class="theme-options">
                                    <label class="theme-option">
                                        <input type="radio" name="default_theme" value="light" checked>
                                        <span class="theme-preview light-theme">Light</span>
                                    </label>
                                    <label class="theme-option">
                                        <input type="radio" name="default_theme" value="sepia">
                                        <span class="theme-preview sepia-theme">Sepia</span>
                                    </label>
                                    <label class="theme-option">
                                        <input type="radio" name="default_theme" value="dark">
                                        <span class="theme-preview dark-theme">Dark</span>
                                    </label>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Ukuran Font Default</label>
                                <select name="default_font_size" class="form-input">
                                    <option value="small">Kecil</option>
                                    <option value="medium" selected>Sedang</option>
                                    <option value="large">Besar</option>
                                    <option value="xlarge">Sangat Besar</option>
                                </select>
                            </div>

                            <button type="submit" class="btn btn-primary">Simpan Pengaturan</button>
                        </form>
                    </div>

                    <div class="settings-card">
                        <h3>Manajemen Penyimpanan</h3>
                        <div id="storage-info">
                            <div class="loader"></div>
                        </div>
                        <button id="clear-offline-books" class="btn btn-danger">Hapus Semua Buku Offline</button>
                    </div>

                    <div class="settings-card">
                        <h3>Ubah Password</h3>
                        <form id="change-password-form" class="settings-form">
                            <div class="form-group">
                                <label for="current_password" class="form-label">Password Saat Ini</label>
                                <input type="password" id="current_password" name="current_password" class="form-input" required>
                            </div>

                            <div class="form-group">
                                <label for="new_password" class="form-label">Password Baru</label>
                                <input type="password" id="new_password" name="new_password" class="form-input" required>
                            </div>

                            <div class="form-group">
                                <label for="confirm_password" class="form-label">Konfirmasi Password Baru</label>
                                <input type="password" id="confirm_password" name="confirm_password" class="form-input" required>
                            </div>

                            <button type="submit" class="btn btn-primary">Ubah Password</button>
                        </form>
                    </div>

                    <div class="settings-card danger-zone">
                        <h3>Zona Berbahaya</h3>
                        <p>Tindakan di bawah ini tidak dapat dibatalkan. Mohon berhati-hati.</p>
                        <button id="delete-account-btn" class="btn btn-danger">Hapus Akun Saya</button>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- Logout Confirmation Modal -->
<div class="modal" id="logout-modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Konfirmasi Keluar</h3>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
            <p>Apakah Anda yakin ingin keluar?</p>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" id="cancel-logout">Batal</button>
            <button class="btn btn-primary" id="confirm-logout">Keluar</button>
        </div>
    </div>
</div>

<!-- Delete Account Confirmation Modal -->
<div class="modal" id="delete-account-modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Konfirmasi Hapus Akun</h3>
            <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
            <p>Apakah Anda benar-benar yakin ingin menghapus akun Anda? Tindakan ini tidak dapat dibatalkan dan Anda akan kehilangan semua data.</p>
            <div class="form-group">
                <label for="delete_confirm" class="form-label">Ketik "HAPUS" untuk mengkonfirmasi:</label>
                <input type="text" id="delete_confirm" class="form-input" required>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" id="cancel-delete">Batal</button>
            <button class="btn btn-danger" id="confirm-delete" disabled>Hapus Akun</button>
        </div>
    </div>
</div>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Logout functionality
        const logoutButton = document.getElementById('logout-button');
        const logoutModal = document.getElementById('logout-modal');
        const confirmLogout = document.getElementById('confirm-logout');
        const cancelLogout = document.getElementById('cancel-logout');
        const closeModal = document.querySelectorAll('.close-modal');

        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            logoutModal.style.display = 'flex';
        });

        confirmLogout.addEventListener('click', function() {
            // Clear auth token
            localStorage.removeItem('auth_token');
            // Redirect to home page
            window.location.href = 'index.php';
        });

        cancelLogout.addEventListener('click', function() {
            logoutModal.style.display = 'none';
        });

        closeModal.forEach(button => {
            button.addEventListener('click', function() {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', function(e) {
            document.querySelectorAll('.modal').forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Delete account functionality
        const deleteAccountBtn = document.getElementById('delete-account-btn');
        const deleteAccountModal = document.getElementById('delete-account-modal');
        const confirmDelete = document.getElementById('confirm-delete');
        const cancelDelete = document.getElementById('cancel-delete');
        const deleteConfirmInput = document.getElementById('delete_confirm');

        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', function() {
                deleteAccountModal.style.display = 'flex';
            });

            deleteConfirmInput.addEventListener('input', function() {
                confirmDelete.disabled = deleteConfirmInput.value !== 'HAPUS';
            });

            confirmDelete.addEventListener('click', function() {
                if (deleteConfirmInput.value === 'HAPUS') {
                    // Make API request to delete account
                    fetch('/api/user/delete', {
                            method: 'DELETE',
                            headers: {
                                'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                            }
                        })
                        .then(response => {
                            if (response.ok) {
                                // Clear auth token and redirect to home
                                localStorage.removeItem('auth_token');
                                window.location.href = 'index.php';
                            } else {
                                alert('Failed to delete account. Please try again.');
                            }
                        })
                        .catch(error => {
                            console.error('Error:', error);
                            alert('An error occurred. Please try again.');
                        });
                }
            });

            cancelDelete.addEventListener('click', function() {
                deleteAccountModal.style.display = 'none';
                deleteConfirmInput.value = '';
                confirmDelete.disabled = true;
            });
        }

        // Load storage info
        const storageInfo = document.getElementById('storage-info');
        const clearOfflineBooksBtn = document.getElementById('clear-offline-books');

        if (storageInfo) {
            // Only load if we have offlineManager available
            if (window.offlineManager) {
                window.offlineManager.checkStorageUsage()
                    .then(usage => {
                        if (usage) {
                            storageInfo.innerHTML = `
                            <div class="storage-info">
                                <div class="storage-bar">
                                    <div class="storage-used" style="width: ${usage.percentUsed}%"></div>
                                </div>
                                <div class="storage-details">
                                    <span>Storage Used: ${Math.round(usage.usage / (1024 * 1024))} MB of ${Math.round(usage.quota / (1024 * 1024))} MB</span>
                                    <span>${Math.round(usage.percentUsed)}%</span>
                                </div>
                            </div>
                        `;
                        } else {
                            storageInfo.innerHTML = '<p>Storage information not available.</p>';
                        }
                    })
                    .catch(error => {
                        console.error('Error getting storage info:', error);
                        storageInfo.innerHTML = '<p>Failed to load storage information.</p>';
                    });
            } else {
                storageInfo.innerHTML = '<p>Offline storage functionality not available.</p>';
            }
        }

        // Clear all offline books
        if (clearOfflineBooksBtn) {
            clearOfflineBooksBtn.addEventListener('click', function() {
                if (confirm('Are you sure you want to remove all offline books? This cannot be undone.')) {
                    if (window.offlineManager) {
                        window.offlineManager.getAllOfflineBooks()
                            .then(books => {
                                if (!books || books.length === 0) {
                                    alert('No offline books to remove.');
                                    return;
                                }

                                // Remove each book
                                const promises = books.map(book =>
                                    window.offlineManager.removeOfflineBook(book.id)
                                );

                                return Promise.all(promises);
                            })
                            .then(() => {
                                alert('All offline books have been removed.');
                                // Reload storage info
                                window.offlineManager.checkStorageUsage()
                                    .then(usage => {
                                        if (usage) {
                                            storageInfo.innerHTML = `
                                            <div class="storage-info">
                                                <div class="storage-bar">
                                                    <div class="storage-used" style="width: ${usage.percentUsed}%"></div>
                                                </div>
                                                <div class="storage-details">
                                                    <span>Storage Used: ${Math.round(usage.usage / (1024 * 1024))} MB of ${Math.round(usage.quota / (1024 * 1024))} MB</span>
                                                    <span>${Math.round(usage.percentUsed)}%</span>
                                                </div>
                                            </div>
                                        `;
                                        }
                                    });
                            })
                            .catch(error => {
                                console.error('Error clearing offline books:', error);
                                alert('Failed to remove all offline books. Please try again.');
                            });
                    } else {
                        alert('Offline storage functionality not available.');
                    }
                }
            });
        }

        // Handle online/offline status
        const onlineStatusIndicator = document.querySelector('.online-status-indicator');

        function updateOnlineStatus() {
            if (navigator.onLine) {
                onlineStatusIndicator.textContent = 'Online';
                onlineStatusIndicator.classList.remove('offline');
                onlineStatusIndicator.classList.add('online');
            } else {
                onlineStatusIndicator.textContent = 'Offline';
                onlineStatusIndicator.classList.remove('online');
                onlineStatusIndicator.classList.add('offline');
            }
        }

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        // Initial check
        updateOnlineStatus();

        // Save reader settings
        const readerSettingsForm = document.getElementById('reader-settings-form');

        if (readerSettingsForm) {
            // Load saved settings
            const defaultTheme = localStorage.getItem('reader-theme') || 'light';
            const defaultFontSize = localStorage.getItem('reader-font-size') || 'medium';

            // Set form values
            document.querySelector(`input[name="default_theme"][value="${defaultTheme}"]`).checked = true;
            document.querySelector(`select[name="default_font_size"]`).value = defaultFontSize;

            // Save settings on form submit
            readerSettingsForm.addEventListener('submit', function(e) {
                e.preventDefault();

                const theme = document.querySelector('input[name="default_theme"]:checked').value;
                const fontSize = document.querySelector('select[name="default_font_size"]').value;

                localStorage.setItem('reader-theme', theme);
                localStorage.setItem('reader-font-size', fontSize);

                alert('Settings saved successfully!');
            });
        }

        // Change password form
        const changePasswordForm = document.getElementById('change-password-form');

        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', function(e) {
                e.preventDefault();

                const currentPassword = document.getElementById('current_password').value;
                const newPassword = document.getElementById('new_password').value;
                const confirmPassword = document.getElementById('confirm_password').value;

                // Validate passwords
                if (newPassword !== confirmPassword) {
                    alert('New passwords do not match!');
                    return;
                }

                if (newPassword.length < 8) {
                    alert('New password must be at least 8 characters long');
                    return;
                }

                // Make API request to change password
                fetch('/api/user/change-password', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
                        },
                        body: JSON.stringify({
                            current_password: currentPassword,
                            new_password: newPassword
                        })
                    })
                    .then(response => {
                        if (response.ok) {
                            alert('Password changed successfully!');
                            changePasswordForm.reset();
                        } else {
                            alert('Failed to change password. Please check your current password and try again.');
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('An error occurred. Please try again.');
                    });
            });
        }
    });

    // Helper function to format reading time
    function formatReadingTime(seconds) {
        if (!seconds) return '0m';

        if (seconds < 60) {
            return `${seconds}s`;
        }

        if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            return `${minutes}m`;
        }

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        return `${hours}h ${minutes}m`;
    }
</script>