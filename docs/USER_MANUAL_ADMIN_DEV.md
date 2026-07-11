# User Manual Admin & Developer — E-Jurnal Guru

## 1. Teknologi

- Electron
- React + Vite + TypeScript
- Tailwind CSS
- SQLite melalui `better-sqlite3`
- Excel import/export melalui `ExcelJS`
- Build melalui `electron-builder`
- Auto-update melalui `electron-updater` + GitHub Releases
- Otomatisasi melalui GitHub Actions
- Target production: macOS Apple Silicon (`arm64`)

## 2. Akun admin awal

```text
Username: root
Kode: 0102
```

Kode disimpan dalam bentuk hash pada SQLite, bukan di frontend. Untuk penggunaan production jangka panjang, tambahkan fitur ubah kode admin atau ubah seed sesuai kebijakan.

## 3. Environment dev dan prod

Aplikasi menggunakan dua environment:

```text
APP_ENV=dev  → E-Jurnal Guru Dev
APP_ENV=prod → E-Jurnal Guru
```

Folder data macOS terpisah:

```text
~/Library/Application Support/E-Jurnal Guru Dev/
~/Library/Application Support/E-Jurnal Guru/
```

Database:

```text
.../data/ejurnal.db
```

Backup:

```text
.../backups/
```

Dengan pemisahan ini, testing dev tidak menyentuh database production.

## 4. Node.js pada Mac developer

Proyek memakai versi Node dari `.nvmrc` dan membutuhkan minimal Node `22.12.0`.

```bash
nvm install
nvm use
node --version
```

Proyek lain yang memakai Node 20 tidak terpengaruh selama proyek tersebut mempunyai `.nvmrc` sendiri atau developer menjalankan `nvm use 20` pada folder proyek tersebut.

Setelah berganti versi Node, native dependency harus diinstal ulang:

```bash
rm -rf node_modules
npm ci
```

## 5. Menjalankan source code di Mac

Prasyarat:

- Mac Apple Silicon
- NVM dan Node sesuai `.nvmrc`
- Git
- Xcode Command Line Tools

Instal command line tools jika belum ada:

```bash
xcode-select --install
```

Jalankan:

```bash
npm ci
npm run dev
```

Mode ini tidak menginstal aplikasi ke Applications. Electron dibuka langsung dari source code.

## 6. Testing lokal

Validasi cepat:

```bash
npm run typecheck
npm run build
```

Atau:

```bash
npm run verify
```

Build dev Apple Silicon:

```bash
npm run dist:dev
```

Build production lokal bersifat opsional karena GitHub Actions akan membangun production setelah merge ke `prod`:

```bash
export GH_RELEASE_OWNER="username-github"
export GH_RELEASE_REPO="repository-release"
npm run dist:prod
```

Untuk testing auto-update, aplikasi harus dipasang dan dijalankan dari Applications. Auto-update tidak dapat diuji hanya dengan `npm run dev`.

## 7. Pendaftaran data master

Urutan setup:

1. Login admin.
2. Buka **Tahun Ajaran**.
3. Isi **tahun awal ajaran**. Contoh: input `2026` akan membuat `2026/2027`.
4. Semester Ganjil dan Genap dibuat otomatis.
5. Buat kelas dan mata pelajaran.
6. Daftarkan guru.
7. Import siswa melalui Excel.
8. Guru login menggunakan tahun ajaran dan semester.

Konsep kalender akademik:

```text
Juli–Desember 2026  → 2026/2027 • Semester Ganjil
Januari–Juni 2027   → 2026/2027 • Semester Genap
```

Pada Januari–Juni, rekomendasi tahun awal adalah tahun kalender dikurangi satu. Pada Juli–Desember, rekomendasi tahun awal sama dengan tahun kalender. Login guru otomatis memilih rekomendasi tersebut jika datanya tersedia, tetapi pilihan tetap dapat diubah.

Relasi data:

```text
Siswa dan kelas     → per tahun ajaran
Presensi            → per semester
Nilai               → per semester
Jurnal mengajar     → per semester
```

## 8. Update data siswa secara massal

Jalur normal adalah **Import Excel**, bukan input satu per satu dan bukan query bebas.

1. Unduh template pada menu Data Siswa.
2. Isi data siswa.
3. Pilih tahun ajaran dan kelas tujuan.
4. Import file.

Aplikasi menggunakan upsert berdasarkan NISN:

- NISN baru → insert.
- NISN lama → nama dan jenis kelamin diperbarui.
- Penempatan kelas untuk tahun tersebut dibuat atau diperbarui.

## 9. Menjalankan SQL patch

Gunakan SQL patch untuk koreksi teknis atau perubahan data yang tidak tersedia melalui UI.

Alur:

1. Buat file `.sql` atau `.ejpatch`.
2. Login admin → Maintenance.
3. Klik **Terapkan SQL Patch**.
4. Pilih file.
5. Aplikasi membuat backup otomatis.
6. Query dijalankan dalam satu transaksi.
7. Patch dicatat berdasarkan checksum dan tidak dapat diterapkan dua kali.
8. Integrity check dijalankan setelah patch.

Jangan menaruh `BEGIN` atau `COMMIT` pada file patch karena aplikasi sudah membungkus patch dalam transaksi.

Contoh patch ada di:

```text
scripts/patches/
```

Update data dan update aplikasi adalah dua proses berbeda:

```text
Update aplikasi → merge prod → build/release GitHub
Update data      → Import Excel atau SQL patch
```


## 10. Export nilai menggunakan template sekolah

Template sumber berada di:

```text
resources/templates/Template Sumatif.xlsx
resources/templates/Template PAS.xlsx
```

Build development dan production memasukkan template melalui `extraResources` pada file konfigurasi electron-builder. Pada aplikasi terpasang, template berada di `Contents/Resources/templates/`.

Alur teknis:

```text
UI GradesPage
→ IPC grades:export
→ AppService.exportGrades
→ validasi kelengkapan nilai
→ isi template dengan ExcelJS
→ Save dialog
→ tulis file .xlsx
```

Aturan penting:

- Export membaca nilai yang sudah tersimpan di SQLite, bukan perubahan yang belum disimpan di UI.
- ID Siswa dan NIS selalu kosong.
- NISN ditulis sebagai teks agar nol di depan tidak hilang.
- Jumlah baris template diperluas otomatis bila siswa melebihi kapasitas awal.
- Sumatif maksimal 10 karena template menyediakan `SUM 1` sampai `SUM 10`.
- Sheet Sumatif yang tidak digunakan dihapus dari hasil export.
- File template tidak boleh dihapus dari repository atau dari konfigurasi `extraResources`.

Panduan lengkap terdapat di `docs/GRADE_EXPORT.md`.

## 11. Perubahan schema database

Jika struktur database berubah, tambahkan migration baru di:

```text
src/main/db/migrations.ts
```

Aturan migration:

- Jangan mengubah migration lama yang sudah pernah dirilis.
- Tambahkan version migration baru.
- Migration berjalan otomatis saat aplikasi baru dibuka.
- Backup dibuat sebelum migration.
- Uji migration dengan salinan database versi sebelumnya.

Installer/update aplikasi tidak membawa database kosong dan tidak menimpa database guru.

## 12. Branch dan release

Branch resmi:

```text
dev  → development dan test
prod → production release
```

Alur:

```text
Coding pada dev
→ test lokal
→ naikkan version
→ push dev
→ PR dev ke prod
→ GitHub Actions validation
→ merge setelah hijau
→ GitHub Actions build DMG/ZIP arm64
→ GitHub Release otomatis
→ aplikasi guru mendeteksi update
```

Panduan lengkap:

```text
docs/BRANCH_RELEASE_WORKFLOW.md
docs/GITHUB_ACTIONS_SETUP.md
```

## 13. Menaikkan version

Gunakan:

```bash
npm run version:patch
npm run version:minor
npm run version:major
```

Panduan:

```text
patch → bugfix
minor → fitur baru kompatibel
major → perubahan besar/tidak kompatibel
```

Version harus dinaikkan pada branch `dev` sebelum PR. GitHub Actions menolak version yang sama atau lebih rendah daripada `prod`.

## 14. Validasi PR otomatis

File:

```text
.github/workflows/validate-prod-pr.yml
```

Workflow berjalan untuk PR menuju `prod` dan melakukan:

- Memastikan source branch adalah `dev`.
- Memastikan version lebih tinggi.
- Setup Node dari `.nvmrc`.
- `npm ci`.
- TypeScript typecheck.
- Build aplikasi.
- Packaging dev macOS arm64.

PR jangan di-merge jika status check merah.

## 15. Release production otomatis

File:

```text
.github/workflows/release-prod.yml
```

Workflow berjalan setelah merge/push ke `prod` dan melakukan:

- Memastikan release version belum ada.
- Instal dependency sesuai lockfile.
- Typecheck.
- Build DMG dan ZIP macOS arm64.
- Validasi `latest-mac.yml`.
- Simpan artifact build selama 30 hari.
- Buat GitHub Release `vX.Y.Z`.

Developer tidak perlu menjalankan command build atau upload release secara manual setelah workflow GitHub disiapkan.

## 16. Repository release

### Model sederhana

Source dan release berada pada repository yang sama. Workflow memakai token bawaan GitHub.

### Model yang cocok untuk source private

Gunakan repository source private dan repository release public terpisah.

Set pada repository source:

```text
Repository Variables:
RELEASE_OWNER
RELEASE_REPO

Repository Secret:
RELEASE_TOKEN
```

`RELEASE_TOKEN` hanya mempunyai hak `Contents: Read and write` pada repository release.

Updater harus mengambil installer dari repository yang dapat diakses tanpa token. Jangan menanam Personal Access Token ke aplikasi guru.

## 17. Mekanisme update pada aplikasi guru

Build production memakai mekanisme:

- Aplikasi otomatis memeriksa update setelah startup.
- Download tidak dimulai tanpa persetujuan pengguna.
- Setelah download selesai, pengguna memilih **Restart & Instal**.

Alur teknis:

```text
Aplikasi membaca latest-mac.yml
→ membandingkan version
→ update tersedia
→ pengguna memilih unduh
→ ZIP update diunduh
→ pengguna memilih Restart & Instal
→ aplikasi diperbarui
```

Database berada di folder user data dan tidak ikut diganti.

## 18. Code signing dan notarization

Workflow membaca secrets berikut jika tersedia:

```text
CSC_LINK
CSC_KEY_PASSWORD
```

Tanpa signing:

- Build internal masih dapat dibuat.
- Guru mungkin harus klik kanan → Open pada instalasi awal.
- Auto-update macOS belum layak dianggap stabil untuk production.

Untuk production yang baik:

- Gunakan Apple Developer Program.
- Gunakan sertifikat Developer ID Application.
- Tambahkan code signing.
- Tambahkan notarization sebagai tahap lanjutan.

Jangan commit file sertifikat atau password ke repository.

## 19. Backup dan pemulihan

Menu Maintenance menyediakan backup manual. Aplikasi juga membuat backup:

- Saat aplikasi ditutup.
- Sebelum migration.
- Sebelum SQL patch.

Backup menggunakan snapshot SQLite sehingga aman walau database memakai WAL.

Untuk restore darurat:

1. Tutup aplikasi.
2. Simpan database aktif sebagai arsip.
3. Pulihkan file backup ke folder data production.
4. Jalankan integrity check.
5. Buka aplikasi dan verifikasi data.

## 20. Checklist sebelum PR

- `nvm use` menunjukkan Node yang benar.
- `npm ci` berhasil.
- `npm run typecheck` berhasil.
- `npm run build` berhasil.
- Fitur diuji pada database dev.
- Migration baru diuji pada salinan database lama.
- Import Excel diuji.
- Presensi dan rekap diuji.
- Nilai dinamis dan pembulatan diuji.
- Jurnal diuji.
- Backup serta SQL patch diuji.
- Version sudah dinaikkan.
- `package.json` dan `package-lock.json` sinkron.
- Tidak ada database atau secret yang ikut commit.

## 21. Checklist setelah release

- Workflow **Build and release prod** hijau.
- Release `vX.Y.Z` tersedia.
- DMG arm64 tersedia.
- ZIP arm64 tersedia.
- `latest-mac.yml` tersedia.
- Versi lama dapat mendeteksi update.
- Upgrade diuji pada Mac staging.
- Database lama tetap ada.
- Migration production berhasil.
- Fitur utama tetap berfungsi.

## 22. Rollback

Jika release bermasalah:

1. Revert perubahan pada branch `dev`.
2. Naikkan patch version.
3. Buat PR baru `dev → prod`.
4. Merge setelah validation hijau.
5. Biarkan GitHub membuat release patch baru.

Jangan menghapus release lama atau menggunakan ulang version yang sama.

## 23. Warning dependency saat instalasi

Beberapa warning `deprecated` dapat berasal dari dependency transitif milik build tooling Electron. Pemeriksaan yang penting untuk aplikasi runtime:

```bash
npm audit --omit=dev
```

Pada paket ini, audit dependency production menghasilkan 0 vulnerability. Audit penuh dapat tetap menampilkan temuan pada tool development/transitif.

Jangan menjalankan:

```bash
npm audit fix --force
```

secara langsung pada branch `prod`. Perubahan paksa dapat menaikkan Electron/electron-builder secara breaking. Evaluasi dependency pada branch `dev`, jalankan seluruh test, lalu release melalui PR normal.
