# E-Jurnal Guru Web Server

Versi web menjalankan React, API HTTP, dan SQLite pada satu laptop server. Browser pengguna tidak mengakses file database secara langsung.

## Persyaratan

- Node.js 22 (`nvm use 22`)
- Laptop server tetap menyala dan tidak sleep
- Semua perintah dijalankan dari root repository

## Persiapan pertama

```bash
nvm use 22
npm install
npm run setup:web
npm run build:web
```

Driver SQLite mempunyai binary berbeda untuk Node dan Electron. Jalankan `npm run setup:web` sebelum memakai server web. Jika ingin kembali menjalankan versi Electron, jalankan `npm run setup:desktop` terlebih dahulu.

## Menjalankan server

Kode admin web wajib berbeda dari kode bawaan dan minimal delapan karakter:

```bash
export EJURNAL_ADMIN_CODE='ganti-dengan-kode-rahasia-yang-kuat'
npm run start:web
```

Kemudian buka <http://127.0.0.1:3000>. Data tersimpan pada `web-data/data/ejurnal.db` dan tidak dilacak Git.

Jangan menyimpan `EJURNAL_ADMIN_CODE` dalam repository atau membagikannya kepada pengguna lain.

## Memulai dari backup desktop

Gunakan file backup `.db` yang dibuat melalui halaman Maintenance versi desktop. Impor hanya dilakukan jika database web belum tersedia:

```bash
export EJURNAL_ADMIN_CODE='ganti-dengan-kode-rahasia-yang-kuat'
export EJURNAL_IMPORT_DB='/lokasi/backup/ejurnal-backup.db'
npm run start:web
```

Setelah berhasil, variabel `EJURNAL_IMPORT_DB` tidak diperlukan lagi. Jangan menjalankan desktop dan web pada file database yang sama.

## Konfigurasi opsional

```bash
export PORT=3000
export HOST=127.0.0.1
export EJURNAL_DATA_DIR='/lokasi/data-web'
```

Untuk ngrok, pertahankan `HOST=127.0.0.1`. Ngrok berjalan pada laptop yang sama dan meneruskan koneksi ke port tersebut.

## Backup

Admin dapat membuka Maintenance dan memilih **Unduh Backup**. Simpan backup di media lain secara rutin. Server juga membuat backup internal sebelum migrasi schema dan SQL patch.

## Catatan keamanan

- Session disimpan di server dan cookie bersifat `HttpOnly`.
- Konteks tahun ajaran, semester, dan ID pengguna guru diambil dari session server.
- Endpoint admin memeriksa role di server.
- Login dibatasi maksimal 20 percobaan per alamat IP setiap 10 menit.
- Jangan membuka port 3000 langsung pada router. Gunakan tunnel HTTPS seperti ngrok.
