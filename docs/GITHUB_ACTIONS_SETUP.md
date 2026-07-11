# Setup GitHub Actions dan Auto-Release

Dokumen ini dijalankan satu kali ketika repository E-Jurnal Guru pertama kali disiapkan.

## 1. Pastikan struktur file

Repository harus mempunyai:

```text
.github/workflows/validate-prod-pr.yml
.github/workflows/release-prod.yml
.nvmrc
package.json
package-lock.json
electron-builder.prod.yml
```

## 2. Buat branch

Apabila baru mempunyai satu branch:

```bash
git checkout -b dev
git push -u origin dev

git checkout -b prod
git push -u origin prod

git checkout dev
```

Development berikutnya dilakukan di `dev`.

## 3. Aktifkan GitHub Actions

Di repository:

```text
Settings → Actions → General
```

Pilih:

```text
Allow all actions and reusable workflows
```

Pada bagian Workflow permissions, pilih:

```text
Read and write permissions
```

Aktifkan opsi yang mengizinkan GitHub Actions membuat release menggunakan `GITHUB_TOKEN` jika release berada pada repository yang sama.

## 4. Pilih model repository release

### Model A — Source dan release pada repository yang sama

Ini paling sederhana.

Tidak perlu membuat Repository Variables. Workflow otomatis menggunakan:

```text
owner = pemilik repository saat ini
repo  = repository saat ini
```

Tidak perlu secret `RELEASE_TOKEN`; workflow memakai token bawaan GitHub.

Perhatian: updater Electron tidak dapat mengunduh release private tanpa autentikasi tambahan. Untuk auto-update yang sederhana, repository yang menyimpan release harus public.

### Model B — Source private, release public terpisah

Gunakan model ini apabila source code ingin private tetapi installer/update harus dapat diakses tanpa token di aplikasi.

Buat repository public, contoh:

```text
ejurnal-guru-releases
```

Repository release harus sudah mempunyai minimal satu commit, misalnya README.

Di repository source buka:

```text
Settings → Secrets and variables → Actions → Variables
```

Tambahkan:

```text
RELEASE_OWNER = username atau organisasi GitHub
RELEASE_REPO  = ejurnal-guru-releases
```

Buat fine-grained Personal Access Token yang hanya mempunyai akses ke repository release dan izin:

```text
Contents: Read and write
Metadata: Read
```

Simpan token pada repository source:

```text
Settings → Secrets and variables → Actions → Secrets
```

Nama secret:

```text
RELEASE_TOKEN
```

Jangan menaruh token di source code, `.env`, dokumentasi publik, atau aplikasi Electron.

## 5. Branch protection untuk prod

Buka:

```text
Settings → Branches → Add branch protection rule
```

Branch name pattern:

```text
prod
```

Aktifkan minimal:

- Require a pull request before merging.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Do not allow bypassing the above settings, jika sesuai.
- Block force pushes.
- Block deletions.

Setelah workflow pernah berjalan satu kali, pilih status check:

```text
Typecheck, build, and package validation
```

Workflow sendiri juga memastikan branch sumber PR adalah `dev`.

## 6. Node dan lockfile

Workflow membaca `.nvmrc`. Saat ini proyek memerlukan Node 22.

Developer lokal menjalankan:

```bash
nvm install
nvm use
npm ci
```

Jangan menghapus atau mengabaikan `package-lock.json`. GitHub Actions menggunakan `npm ci`, sehingga `package.json` dan lockfile harus sinkron.

## 7. Environment yang dimasukkan ke build production

`electron-builder.prod.yml` membaca:

```text
GH_RELEASE_OWNER
GH_RELEASE_REPO
```

GitHub Actions mengisi nilai tersebut dari Repository Variables atau repository saat ini. Nilai tersebut juga dimasukkan ke metadata updater dalam aplikasi production.

Untuk build lokal opsional:

```bash
export GH_RELEASE_OWNER="username-github"
export GH_RELEASE_REPO="ejurnal-guru-releases"
npm run dist:prod
```

## 8. Code signing Apple

Workflow dapat membaca secrets:

```text
CSC_LINK
CSC_KEY_PASSWORD
```

`CSC_LINK` berisi sertifikat Developer ID Application dalam format yang didukung electron-builder, biasanya file `.p12` yang disimpan sebagai secret/base64 sesuai prosedur internal.

Tanpa secrets tersebut:

- Workflow tetap dapat menghasilkan build unsigned.
- Instalasi awal mungkin memerlukan klik kanan → Open.
- Auto-update macOS tidak boleh dianggap stabil untuk production.

Untuk distribusi production yang baik, tambahkan code signing. Notarization Apple juga disarankan dan harus dikonfigurasi sebagai tahap lanjutan setelah akun Apple Developer tersedia.

## 9. Uji workflow

### Uji PR validation

1. Pada `dev`, naikkan version patch.
2. Commit dan push.
3. Buat PR `dev → prod`.
4. Pastikan workflow **Validate PR to prod** berjalan.
5. Pastikan status hijau sebelum merge.

### Uji release

1. Merge PR ke `prod`.
2. Buka tab Actions.
3. Buka workflow **Build and release prod**.
4. Pastikan DMG, ZIP, dan `latest-mac.yml` tervalidasi.
5. Buka tab Releases dan pastikan `vX.Y.Z` tersedia.

## 10. Masalah umum

### PR ditolak karena branch sumber

PR ke `prod` harus berasal dari `dev`.

### PR ditolak karena version

Naikkan version pada `dev`:

```bash
npm run version:patch
```

Commit `package.json` dan `package-lock.json`.

### Release gagal karena token

Untuk repository release yang sama, pastikan Workflow permissions mempunyai write access.

Untuk repository terpisah, periksa:

```text
RELEASE_OWNER
RELEASE_REPO
RELEASE_TOKEN
```

### Release berhasil tetapi updater tidak menemukan update

Periksa:

- Repository release public.
- Release bukan draft atau prerelease.
- `latest-mac.yml` tersedia.
- ZIP updater tersedia.
- Version release lebih tinggi daripada aplikasi terpasang.
- Aplikasi dijalankan dari Applications.
- Build production mempunyai metadata repository release yang benar.

### Build gagal pada native module

Periksa:

- Node sesuai `.nvmrc`.
- `package-lock.json` sinkron.
- Target arm64.
- `npmRebuild: true`.
- `better-sqlite3` tetap berada pada `dependencies`.

## 11. Keamanan

- Jangan commit Personal Access Token.
- Jangan commit sertifikat `.p12`.
- Jangan commit password signing.
- Jangan memasukkan token GitHub ke aplikasi guru.
- Jangan mengunggah database siswa ke GitHub Actions artifact atau GitHub Release.
- Artifact workflow hanya boleh berisi DMG, ZIP aplikasi, dan metadata updater.
