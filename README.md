# E-Jurnal Guru

Aplikasi desktop offline untuk satu guru, dibangun dengan Electron, React, TypeScript, Tailwind CSS, dan SQLite. Target distribusi utama adalah macOS Apple Silicon.

## Fitur MVP

- Login guru: username, kode, tahun ajaran, dan semester.
- Login admin awal: `root` / `0102`.
- Data siswa dan penempatan kelas per tahun ajaran berformat rentang, misalnya `2026/2027`.
- Presensi, nilai, dan jurnal terpisah per semester; Ganjil berjalan Juli–Desember dan Genap Januari–Juni.
- Presensi harian dan rekap skor kehadiran.
- Komponen nilai dinamis: Sumatif → TGS/UH, PAS, dan nilai akhir 75% + 25%.
- Export nilai Sumatif dan PAS menggunakan template Excel sekolah.
- Kelola siswa serta import massal melalui Excel.
- Pendaftaran guru, tahun ajaran, semester, dan kelas.
- Backup SQLite dan eksekusi SQL patch dengan backup otomatis.
- Pemeriksaan update melalui GitHub Releases pada build production.
- Environment database terpisah untuk `dev` dan `prod`.
- GitHub Actions untuk validasi PR dan release production otomatis.

## Prasyarat development

Gunakan Node.js yang tercantum di `.nvmrc`:

```bash
nvm install
nvm use
node --version
```

Versi minimum proyek adalah Node.js `22.12.0`. Proyek lain yang masih menggunakan Node 20 tetap aman jika setiap proyek mempunyai `.nvmrc` masing-masing.

## Menjalankan di Mac Apple Silicon

```bash
npm ci
npm run dev
```

Mode development membuka Electron langsung dari source code dan tidak menginstal aplikasi ke folder Applications.

## Build lokal opsional

Build normal tidak perlu dilakukan manual jika GitHub Actions sudah disiapkan. Command berikut hanya untuk debugging atau pengujian lokal:

```bash
npm run dist:dev
npm run dist:prod
```

Hasil build lokal berada di:

```text
release/dev/
release/prod/
```

Untuk build production lokal, isi environment berikut terlebih dahulu:

```bash
export GH_RELEASE_OWNER="username-github"
export GH_RELEASE_REPO="nama-repository-release"
npm run dist:prod
```

## Alur release otomatis

```text
Coding dan testing pada branch dev
→ naikkan version di package.json
→ push dev
→ buat PR dev ke prod
→ GitHub Actions memvalidasi typecheck, build, dan package arm64
→ merge PR setelah semua check hijau
→ GitHub Actions membangun DMG + ZIP arm64
→ GitHub Release dibuat otomatis
→ aplikasi guru mendeteksi versi baru
```

PR ke `prod` akan gagal apabila:

- Branch sumber bukan `dev`.
- Version belum dinaikkan.
- TypeScript error.
- Build gagal.
- Package macOS arm64 gagal dibuat.

Release production akan gagal apabila version yang sama sudah pernah dirilis.

## File GitHub Actions

```text
.github/workflows/validate-prod-pr.yml
.github/workflows/release-prod.yml
```

Setup GitHub lengkap terdapat di:

- `docs/GITHUB_ACTIONS_SETUP.md`
- `docs/BRANCH_RELEASE_WORKFLOW.md`

## Dokumen lainnya

- `docs/USER_MANUAL_GURU.md`
- `docs/USER_MANUAL_ADMIN_DEV.md`
- `docs/DATABASE_AND_PATCH_GUIDE.md`
- `docs/GRADE_EXPORT.md`
- `docs/TEST_REPORT.md`

## Catatan production macOS

Build unsigned tetap dapat dibuat untuk pengujian internal. Untuk pengalaman instalasi dan auto-update macOS yang stabil, production build perlu code signing Apple; notarization juga disarankan. Lihat panduan admin/developer.
