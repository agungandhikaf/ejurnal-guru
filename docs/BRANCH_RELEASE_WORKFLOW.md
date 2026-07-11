# Workflow Branch Dev sampai Release Production

Dokumen ini menjadi checklist utama developer saat mengembangkan, menguji, merilis, dan melakukan rollback E-Jurnal Guru.

## 1. Struktur branch

```text
dev  → seluruh development dan pengujian
prod → source stabil yang siap dibangun dan dirilis
```

Aturan:

- Jangan coding langsung di `prod`.
- Perubahan masuk ke `prod` hanya melalui Pull Request dari `dev`.
- Setiap merge ke `prod` dianggap sebagai release production baru.
- Karena setiap merge membuat release, version harus dinaikkan sebelum PR.

Workflow `validate-prod-pr.yml` akan menolak PR ke `prod` apabila branch asal bukan `dev`.

## 2. Persiapan satu kali di GitHub

Selesaikan setup pada:

```text
docs/GITHUB_ACTIONS_SETUP.md
```

Minimal yang harus tersedia:

- Branch `dev` dan `prod`.
- GitHub Actions aktif.
- Branch protection untuk `prod`.
- Repository release dapat diakses updater.
- Repository Variables/Secrets jika memakai repository release terpisah.

## 3. Alur development harian

Masuk ke branch `dev`:

```bash
git checkout dev
git pull origin dev
nvm use
npm ci
npm run dev
```

Lakukan perubahan dan pengujian pada database dev. Data development tersimpan terpisah dari data production.

Sebelum commit:

```bash
npm run typecheck
npm run build
```

Untuk menguji packaging Apple Silicon secara lokal:

```bash
npm run dist:dev
```

Build lokal bersifat opsional karena PR workflow juga memvalidasi package macOS arm64.

## 4. Menentukan kenaikan version

Gunakan semantic versioning:

```text
PATCH  1.0.0 → 1.0.1  bugfix kecil
MINOR  1.0.1 → 1.1.0  fitur baru yang kompatibel
MAJOR  1.1.0 → 2.0.0  perubahan besar/tidak kompatibel
```

Command yang tersedia:

```bash
npm run version:patch
npm run version:minor
npm run version:major
```

Command tersebut hanya mengubah `package.json` dan `package-lock.json`; command tidak membuat tag dan tidak membuat release.

Periksa perubahan:

```bash
git diff package.json package-lock.json
```

Version wajib dinaikkan **di branch `dev` sebelum membuat PR**.

## 5. Commit dan push ke dev

```bash
git add .
git commit -m "feat: tambahkan fitur ..."
git push origin dev
```

Pastikan perubahan version ikut di-commit.

## 6. Membuat Pull Request dev ke prod

Di GitHub:

1. Buka tab **Pull requests**.
2. Klik **New pull request**.
3. Base branch: `prod`.
4. Compare branch: `dev`.
5. Tulis ringkasan perubahan dan cara pengujian.
6. Buat PR sebagai draft jika belum siap.
7. Ubah menjadi **Ready for review** saat siap divalidasi.

Workflow berikut otomatis berjalan:

```text
.github/workflows/validate-prod-pr.yml
```

Proses yang dilakukan:

1. Memastikan PR berasal dari `dev`.
2. Membaca version pada branch `prod`.
3. Memastikan version kandidat lebih tinggi.
4. Menjalankan Node dari `.nvmrc`.
5. Menjalankan `npm ci`.
6. Menjalankan TypeScript typecheck.
7. Menjalankan build aplikasi.
8. Membuat package dev macOS arm64 untuk memastikan native dependency dapat dipaketkan.

PR tidak boleh di-merge jika workflow merah.

## 7. Checklist sebelum merge

Periksa:

- Seluruh fitur utama telah diuji pada mode dev.
- Tahun ajaran dan semester tidak tercampur.
- Data siswa tetap tertaut per tahun.
- Presensi, nilai, dan jurnal terpisah per semester.
- Import Excel siswa berhasil.
- Backup dan SQL patch berhasil.
- Migration baru tidak mengubah migration lama.
- Version sudah dinaikkan.
- Status check GitHub Actions hijau.
- Tidak ada file database, `.env.local`, atau secret yang ikut commit.

Setelah seluruh checklist selesai, merge PR.

## 8. Apa yang terjadi setelah merge ke prod

Push hasil merge ke `prod` memicu:

```text
.github/workflows/release-prod.yml
```

Workflow production melakukan:

1. Checkout branch `prod`.
2. Menggunakan Node dari `.nvmrc`.
3. Membaca version pada `package.json`.
4. Memastikan release dengan version tersebut belum ada.
5. Menjalankan `npm ci`.
6. Menjalankan typecheck.
7. Membuat build production macOS arm64.
8. Memastikan DMG, ZIP, dan `latest-mac.yml` tersedia.
9. Menyimpan hasil build sebagai GitHub Actions artifact selama 30 hari.
10. Membuat GitHub Release `vX.Y.Z` secara otomatis.

File release:

```text
E-Jurnal Guru-X.Y.Z-arm64.dmg
E-Jurnal Guru-X.Y.Z-arm64.zip
latest-mac.yml
```

DMG digunakan untuk instalasi awal/manual. ZIP dan `latest-mac.yml` dipakai auto-updater.

## 9. Pemeriksaan setelah release

Buka:

```text
GitHub → Actions → Build and release prod
```

Pastikan seluruh step hijau.

Kemudian buka:

```text
GitHub → Releases → vX.Y.Z
```

Pastikan tersedia:

- Satu file DMG arm64.
- Satu file ZIP arm64.
- `latest-mac.yml`.
- Catatan source commit dan workflow run.

Pengujian release:

1. Install versi sebelumnya di Applications pada Mac testing.
2. Isi data dummy.
3. Jalankan pemeriksaan update.
4. Unduh dan instal update.
5. Pastikan version berubah.
6. Pastikan database dan data dummy tidak hilang.
7. Uji login, presensi, nilai, jurnal, import Excel, backup, dan SQL patch.

Jangan langsung menjadikan laptop guru sebagai perangkat pertama untuk menguji release baru.

## 10. Distribusi ke guru

Instalasi pertama:

```text
GitHub Release → download DMG → buka DMG → drag aplikasi ke Applications
```

Update berikutnya:

```text
Aplikasi memeriksa GitHub Release
→ update tersedia
→ guru memilih unduh
→ guru memilih Restart & Instal
```

Database tidak disimpan di dalam installer dan tidak ditimpa oleh update aplikasi.

## 11. Jika workflow release gagal

Jangan menaikkan version lagi sebelum mengetahui penyebabnya.

Periksa log GitHub Actions:

- Gagal `npm ci`: lockfile/dependency bermasalah.
- Gagal typecheck: perbaiki TypeScript pada `dev`.
- Gagal build native: periksa `better-sqlite3`, Electron, dan runner arm64.
- DMG/ZIP tidak ditemukan: periksa `electron-builder.prod.yml`.
- Gagal publish: periksa repository target dan token.
- Release sudah ada: version belum dinaikkan atau release pernah dibuat.

Perbaikan dilakukan di `dev`, naikkan version hanya jika release lama sudah benar-benar terpublikasi, lalu buat PR baru.

## 12. Revert setelah release sudah terpublikasi

Jangan menghapus release lama dan jangan mencoba memublikasikan ulang version yang sama.

Alur rollback:

```bash
git checkout dev
git pull origin dev
git revert <commit-yang-bermasalah>
npm run version:patch
git add .
git commit -m "revert: rollback perubahan bermasalah"
git push origin dev
```

Kemudian buat PR baru `dev → prod`. Setelah merge, GitHub menghasilkan release patch baru.

Contoh:

```text
Versi bermasalah : 1.2.0
Versi rollback   : 1.2.1
```

Mengembalikan source ke perilaku lama tetap harus memakai version baru agar updater mengenalinya sebagai pembaruan.

## 13. Workflow manual darurat

`release-prod.yml` mempunyai tombol **Run workflow** melalui `workflow_dispatch`. Gunakan hanya apabila:

- Source pada `prod` sudah benar.
- Release version tersebut belum ada.
- Build otomatis sebelumnya gagal karena gangguan GitHub, bukan karena kode.

Jika release dengan version yang sama sudah ada, workflow tetap menolak duplikasi.

## 14. Hal yang tidak dilakukan workflow

Workflow tidak:

- Mengubah atau mengunggah database guru.
- Menjalankan SQL patch pada laptop guru.
- Menaikkan version otomatis.
- Menggabungkan PR secara otomatis.
- Menghapus release lama.
- Menggantikan pengujian aplikasi pada Mac staging.

Update data siswa tetap melalui Import Excel atau SQL patch. Update aplikasi melalui GitHub Release.


### Checklist fitur export nilai

Jika release menyentuh modul nilai atau packaging, periksa:

- `resources/templates/Template Sumatif.xlsx` tersedia.
- `resources/templates/Template PAS.xlsx` tersedia.
- Export Sumatif menghasilkan jumlah sheet sesuai konfigurasi.
- Export PAS memakai nilai PAS tersimpan.
- Export ditolak saat nilai belum lengkap.
- Kolom ID Siswa dan NIS kosong, sedangkan NISN, nama, dan nilai benar.
- Build production membawa folder `Contents/Resources/templates/`.

