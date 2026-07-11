# User Manual Guru — E-Jurnal Guru

## 1. Instalasi pertama

1. Buka file `E-Jurnal Guru-x.x.x-arm64.dmg`.
2. Seret ikon **E-Jurnal Guru** ke folder **Applications**.
3. Buka aplikasi dari Applications.
4. Apabila build belum ditandatangani Apple, klik kanan aplikasi → **Open** → **Open**. Untuk produksi, developer sebaiknya menandatangani dan melakukan notarization.

## 2. Login

Login guru membutuhkan:

- Username
- Kode akses
- Tahun ajaran
- Semester Ganjil atau Genap

Siswa dan kelas mengikuti tahun ajaran. Presensi, nilai, dan jurnal mengikuti semester yang dipilih saat login.

Format tahun ajaran menggunakan rentang, misalnya `2026/2027`:

```text
Juli–Desember 2026  → 2026/2027 • Semester Ganjil
Januari–Juni 2027   → 2026/2027 • Semester Genap
```

Aplikasi menyarankan tahun ajaran dan semester berdasarkan tanggal perangkat. Guru tetap dapat mengganti pilihan sebelum masuk.

## 3. Input presensi

1. Buka **Input Presensi**.
2. Pilih kelas, tanggal, jam mulai, dan jam selesai.
3. Semua siswa otomatis berstatus **Hadir**.
4. Ubah siswa yang Sakit, Izin, Dispen, atau Alpa.
5. Tambahkan catatan bila diperlukan.
6. Klik **Simpan Presensi**.

Jika kombinasi kelas, tanggal, dan jam sudah pernah diisi, halaman membuka data lama untuk diedit. Status **D/Dispen** digunakan untuk siswa yang mendapat dispensasi resmi; pada skor kehadiran, Dispen diperlakukan setara Hadir.

## 4. Absensi harian dan rekap

- **Absensi Harian** menunjukkan kelas yang sudah atau belum diisi pada tanggal tertentu.
- **Rekap Absen** menampilkan H, S, I, D, A, total pertemuan, dan skor kehadiran.

Rumus skor:

```text
Skor kehadiran = (Jumlah Hadir + Jumlah Dispen) ÷ Total Pertemuan × 100
```

## 5. Input nilai

1. Buka **Rekap & Input Nilai**.
2. Pilih kelas.
3. Klik **Atur Komponen**.
4. Tambahkan Sumatif sesuai kebutuhan.
5. Pada setiap Sumatif, tambahkan komponen TGS atau UH.
6. Simpan konfigurasi.
7. Isi nilai siswa dan PAS.
8. Klik **Simpan Nilai**.

Rumus:

```text
Nilai tiap Sumatif = rata-rata komponen di dalam Sumatif
Nilai Sumatif = rata-rata semua Sumatif
Nilai Akhir = (Nilai Sumatif × 75%) + (PAS × 25%)
```

Nilai akhir dibulatkan ke bilangan bulat terdekat. Nilai kosong berbeda dengan nilai 0. Nilai akhir akan menampilkan **Belum lengkap** sampai seluruh komponen dan PAS terisi.

### Export nilai ke Excel

1. Pastikan nilai sudah disimpan.
2. Pilih kelas dan mata pelajaran yang akan diekspor.
3. Klik **Export Excel**.
4. Pilih **Sumatif** atau **PAS**.
5. Klik **Export Excel** dan tentukan lokasi file.

Export Sumatif membuat satu worksheet untuk setiap Sumatif yang dikonfigurasi. Export PAS memakai nilai PAS yang tersimpan. Jika ada komponen atau PAS yang belum lengkap, export dibatalkan dan aplikasi menampilkan data yang perlu dilengkapi.

Kolom ID Siswa dan NIS sengaja dibiarkan kosong. Nama pada identitas, Materi, dan KKTP diisi manual oleh guru. File ini digunakan untuk memudahkan copy-paste nilai ke template resmi web internal sekolah.

Contoh nama file:

```text
Sumatif-VII.A-Pendidikan Pancasila.xlsx
PAS-VII.B-Pendidikan Pancasila.xlsx
```

## 6. Kelola siswa

### Tambah satu siswa

1. Pilih kelas.
2. Klik **Tambah Siswa**.
3. Isi NISN, nama, dan jenis kelamin.
4. Simpan.

### Import banyak siswa

1. Klik **Template** untuk mengunduh format Excel.
2. Isi kolom NISN, Nama Siswa, dan Jenis Kelamin.
3. Pilih kelas tujuan.
4. Klik **Import Excel**.
5. Pilih file Excel.

NISN yang sudah ada akan diperbarui, bukan dibuat duplikat.

## 7. Jurnal mengajar

1. Buka **Jurnal Mengajar**.
2. Klik **Tambah Jurnal**.
3. Isi tanggal, kelas, jam mulai, jam selesai, dan materi.
4. Simpan.

Gunakan pencarian dan filter kelas/tanggal untuk menemukan jurnal lama.

## 8. Backup

Backup teknis tersedia melalui login admin. Aplikasi juga membuat backup otomatis ketika aplikasi ditutup dan sebelum migration atau SQL patch dijalankan.

## 9. Update aplikasi

Build production memeriksa update GitHub secara otomatis setelah aplikasi dibuka. Admin juga dapat membuka menu Maintenance dan menekan **Periksa Update**.

Jika versi baru tersedia:

1. Klik **Unduh Update**.
2. Tunggu sampai selesai.
3. Klik **Restart & Instal**.

Database tidak ikut ditimpa oleh update aplikasi.
