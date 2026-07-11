# Test Report Source Package

Tanggal paket: 10 Juli 2026

## Lulus

- TypeScript type-check untuk main, preload, shared, dan renderer.
- Build Electron Vite untuk main, preload, dan renderer.
- Pembuatan schema SQLite 18 tabel melalui smoke test.
- Integrity check SQLite menghasilkan `ok`.
- Pengujian model satu kelas fisik dengan dua mata pelajaran.
- Pengujian ExcelJS menulis dan membaca NISN dengan nol di depan.
- `npm audit --omit=dev` menghasilkan 0 vulnerability pada dependency production.
- Validasi bahwa ZIP source tidak memuat database, `node_modules`, atau hasil build.

## Belum dapat diuji di environment pembuat paket

- Build DMG Apple Silicon.
- Code signing dan notarization Apple.
- Auto-update nyata dari GitHub Release.
- Runtime native `better-sqlite3` di Electron macOS.

Alasannya: paket disusun pada container Linux x64, sedangkan target aplikasi adalah macOS Apple Silicon. Pengujian tersebut harus dilakukan di Mac melalui langkah pada `USER_MANUAL_ADMIN_DEV.md`.

## GitHub Actions automation patch

File yang ditambahkan/diperbarui:

```text
.github/workflows/validate-prod-pr.yml
.github/workflows/release-prod.yml
.npmrc
electron-builder.prod.yml
package.json
package-lock.json
README.md
docs/BRANCH_RELEASE_WORKFLOW.md
docs/GITHUB_ACTIONS_SETUP.md
docs/USER_MANUAL_ADMIN_DEV.md
docs/TEST_REPORT.md
```

Pemeriksaan lokal pada patch:

- JSON `package.json` valid.
- JSON `package-lock.json` valid dan seluruh URL package memakai registry npm publik.
- YAML workflow dapat diparse.
- Konfigurasi electron-builder production dapat diparse sebagai YAML.
- Path artifact production konsisten dengan `release/prod`.
- Workflow PR memvalidasi source branch, version bump, typecheck, build, dan package arm64.
- Workflow production memvalidasi version unik, build DMG/ZIP, `latest-mac.yml`, artifact, dan GitHub Release.
- Instalasi dependency dengan `npm ci --ignore-scripts` berhasil pada Node 22.
- TypeScript typecheck setelah patch berhasil.
- Electron Vite build setelah patch berhasil.
- `npm audit --omit=dev` tetap menghasilkan 0 vulnerability production.
- Audit penuh masih melaporkan vulnerability pada dependency tooling/development transitif; jangan menjalankan `npm audit fix --force` tanpa pengujian karena dapat mengubah versi build tool secara breaking.

Catatan: workflow GitHub Actions dan publishing release hanya dapat diuji penuh setelah file di-commit ke repository GitHub dan Repository Variables/Secrets disiapkan.


## Export nilai Excel

Pengujian yang dilakukan pada implementasi export:

- TypeScript typecheck berhasil.
- Electron Vite build berhasil.
- Template Sumatif berhasil dibaca dan hanya menyisakan jumlah sheet sesuai konfigurasi.
- Template PAS berhasil diisi.
- Kelas `7A` dikonversi menjadi `VII.A`.
- Kelas/Mapel terisi pada `E2` tanpa mengisi kolom Nama identitas.
- Kolom ID Siswa dan NIS kosong.
- NISN mempertahankan nol di depan.
- Nama dan jumlah siswa sesuai sumber data.
- Rata-rata Sumatif dibulatkan dengan aturan pembulatan normal.
- Baris otomatis bertambah untuk 105 siswa.
- Export Sumatif ditolak ketika satu komponen kosong.
- Export PAS ditolak ketika satu nilai PAS kosong.
- Nama file mengikuti format `Sumatif-VII.A-Mapel.xlsx` dan `PAS-VII.A-Mapel.xlsx`.
