# Troubleshooting E-Jurnal Guru

## Electron muncul tetapi jendela aplikasi tidak tampil

Periksa terminal yang menjalankan `npm run dev`.

### Error `no such table: app_settings`

Penyebabnya adalah proses backup pra-migrasi terpanggil pada database development yang baru dibuat, sebelum migration awal membuat tabel `app_settings`.

Perbaikan terdapat pada:

```text
src/main/db/database.ts
```

Perubahan yang diterapkan:

1. Database baru tidak dianggap sebagai database lama hanya karena file SQLite sudah memiliki ukuran.
2. Backup pra-migrasi hanya dijalankan jika schema/data aplikasi memang sudah ada.
3. Pencatatan `last_backup_at` hanya dilakukan jika tabel `app_settings` sudah tersedia.
4. Nama file backup memakai timestamp hingga milidetik agar tidak bentrok.

Setelah mengganti file, jalankan:

```bash
rm -rf out
npm run dev
```

Database development yang gagal pada percobaan sebelumnya biasanya tidak perlu dihapus. Migration akan dilanjutkan otomatis karena tabel `schema_migrations` belum mencatat versi 1.

Jika masih ingin memulai development dari data kosong, tutup aplikasi lalu hapus folder data **E-Jurnal Guru Dev**, bukan database production. Lokasi umumnya:

```text
~/Library/Application Support/E-Jurnal Guru Dev/
```

Jangan pernah menghapus:

```text
~/Library/Application Support/E-Jurnal Guru/
```

karena folder tersebut adalah data production.

## Startup error di masa depan

`src/main/index.ts` sekarang menampilkan dialog error apabila inisialisasi database gagal. Salin isi pesan dialog dan terminal untuk dikirim kepada developer.

## Lokasi database dan data yang terlihat hilang

Aplikasi memakai folder data yang dipisahkan secara eksplisit:

```text
Development : ~/Library/Application Support/E-Jurnal Guru Dev/data/ejurnal.db
Production  : ~/Library/Application Support/E-Jurnal Guru/data/ejurnal.db
```

Lokasi aktif dapat dilihat dari:

```text
Login Admin → Maintenance → Informasi Database
```

Gunakan tombol **Buka Folder Data** untuk membuka Finder langsung pada file database aktif.

Terminal development juga mencetak:

```text
[E-Jurnal] environment=dev
[E-Jurnal] userData=...
[E-Jurnal] database=...
```

Jurnal, presensi, dan nilai selalu difilter berdasarkan semester yang dipilih saat login. Data Semester Ganjil tidak tampil ketika login ke Semester Genap, dan sebaliknya. Data siswa tetap tertaut ke tahun ajaran.

Untuk mencari seluruh database E-Jurnal yang pernah dibuat pada Mac, tutup aplikasi lalu jalankan:

```bash
find "$HOME/Library/Application Support" -type f -name ejurnal.db -print
```

Jangan menyalin atau mengganti database aktif ketika aplikasi masih terbuka. Jangan pernah menghapus folder `E-Jurnal Guru Dev` apabila data development masih dibutuhkan.

Developer juga dapat menjalankan utilitas berikut untuk menampilkan seluruh database dan jumlah jurnal per semester:

```bash
bash scripts/inspect-local-databases.sh
```

Jalankan ketika aplikasi sedang ditutup. Script hanya membaca database dan tidak mengubah data.
