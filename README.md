# E-Library - Perpustakaan Digital

E-Library adalah platform perpustakaan digital berbasis web yang memungkinkan pengguna untuk membaca e-book secara online dan offline.

## Fitur Utama

- **Autentikasi Pengguna**: Registrasi, login, logout dan manajemen sesi
- **Katalog Buku**: Tampilan visual berdasarkan kategori dengan fitur filter dan pencarian
- **E-Book Reader**: Pembaca untuk format PDF, EPUB, dan MOBI
- **Offline Reading**: Buku yang sudah pernah dibuka bisa dibaca kembali saat offline
- **Analytics**: Pelacakan aktivitas pengguna seperti buku yang dibaca, durasi, dan jumlah halaman
- **Responsif Mobile**: Desain 100% adaptif untuk semua ukuran layar
- **Progressive Web App (PWA)**: Bisa diinstal sebagai shortcut di home screen dengan dukungan offline

## Teknologi yang Digunakan

- **Backend**: Rust dengan framework Actix Web
- **Frontend**: PHP, JavaScript, CSS, HTML
- **Database**: PostgreSQL
- **Server**: cPanel dengan dukungan Rust

## Struktur Proyek

```
e-library/
├── backend/           # API backend (Rust)
├── frontend/          # Frontend UI (PHP, JS, CSS)
├── database/          # Skema dan migrasi database
└── deployment/        # Skrip dan konfigurasi deployment
```

## Instalasi

### Prasyarat

- Rust (minimal versi 1.56.0)
- PostgreSQL (minimal versi 12)
- PHP (minimal versi 7.4)
- cPanel dengan dukungan Rust (untuk deployment)

### Langkah Instalasi Lokal

1. **Clone repository:**
   ```
   git clone https://github.com/username/e-library.git
   cd e-library
   ```

2. **Setup database:**
   ```
   psql -U postgres
   CREATE DATABASE elibrary;
   CREATE USER elibrary_user WITH ENCRYPTED PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE elibrary TO elibrary_user;
   \q
   
   psql -U elibrary_user -d elibrary -f database/schema.sql
   psql -U elibrary_user -d elibrary -f database/seeds.sql
   ```

3. **Setup backend:**
   ```
   cd backend
   cp .env.example .env
   # Edit .env file with your configuration
   cargo build --release
   cargo run
   ```

4. **Setup frontend:**
   ```
   cd ../frontend
   # Configure your web server to point to this directory
   # Edit includes/config.php with your configuration
   ```

## Deployment

Untuk deployment ke server cPanel, gunakan skrip di folder `deployment/`:

1. **Persiapan server:**
   ```
   chmod +x deployment/setup.sh
   ./deployment/setup.sh
   ```

2. **Deploy aplikasi:**
   ```
   chmod +x deployment/deploy.sh
   ./deployment/deploy.sh
   ```

## Konfigurasi PWA

Untuk mengaktifkan fitur PWA, pastikan service worker dan manifest sudah terdaftar dengan benar:

1. Pastikan file `pwa/manifest.json` berisi konfigurasi yang sesuai
2. Pastikan service worker di `pwa/service-worker.js` terdaftar dengan benar di halaman
3. Buat ikon aplikasi dengan ukuran 192x192 dan 512x512 di `assets/icons/`

## Fitur Offline

E-Library menggunakan kombinasi service worker dan IndexedDB untuk menyimpan:

1. **Konten Buku**: Buku disimpan untuk akses offline
2. **Progres Membaca**: Posisi halaman terakhir yang dibaca
3. **Data Analitik**: Data analitik disimpan saat offline dan disinkronkan saat online

## Berkontribusi

Silakan buat issue atau pull request untuk berkontribusi pada proyek ini.

## Lisensi

[MIT License](LICENSE)