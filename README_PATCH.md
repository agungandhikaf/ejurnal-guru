# Patch pemisahan database Dev dan Prod

Patch ini hanya mengubah konfigurasi build. Tidak ada file database, migration, atau seed data di dalam ZIP.

## File yang berubah

- `electron.vite.config.ts`
- `electron-builder.dev.yml`
- `package.json`

## Hasil yang diharapkan

- Dev:
  `~/Library/Application Support/E-Jurnal Guru Dev/data/ejurnal.db`
- Prod:
  `~/Library/Application Support/E-Jurnal Guru/data/ejurnal.db`

Build dev juga menghasilkan DMG dan ZIP dengan nama aplikasi `E-Jurnal Guru Dev`.

## Terapkan patch

```bash
cd /Users/afa/Documents/ejurnal-guru

git checkout dev
git pull origin dev

unzip -o ~/Downloads/ejurnal-guru-pisah-db-dev-prod.zip -d .

npm run typecheck
rm -rf out release/dev release/prod

npm run dist:dev
npm run dist:prod
```

## Cek hasil build

```bash
ls -lah release/dev
ls -lah release/prod
```

Jalankan build dev:

```bash
"release/dev/mac-arm64/E-Jurnal Guru Dev.app/Contents/MacOS/E-Jurnal Guru Dev"
```

Log yang diharapkan:

```text
[E-Jurnal] environment=dev
[E-Jurnal] userData=/Users/.../Library/Application Support/E-Jurnal Guru Dev
```

Tutup dev, lalu jalankan prod:

```bash
"release/prod/mac-arm64/E-Jurnal Guru.app/Contents/MacOS/E-Jurnal Guru"
```

Log yang diharapkan:

```text
[E-Jurnal] environment=prod
[E-Jurnal] userData=/Users/.../Library/Application Support/E-Jurnal Guru
```

Cek kedua database:

```bash
find "$HOME/Library/Application Support"   -path "*E-Jurnal Guru*/data/ejurnal.db"   -print
```

## Setelah tes berhasil

Naikkan versi release dari 1.0.2 menjadi 1.0.3:

```bash
npm run version:patch

git add electron.vite.config.ts electron-builder.dev.yml package.json package-lock.json
git commit -m "fix: separate dev and prod application data"
git push origin dev
```

Lalu buat PR dari `dev` ke `prod`.

## Catatan data

- Jangan hapus folder `E-Jurnal Guru Dev` atau `E-Jurnal Guru` saat pengujian.
- Versi prod lama yang terkena bug mungkin sebelumnya menyimpan data di folder Dev.
- Setelah patch, prod akan memakai folder Prod yang benar.
- Jika data lama hanya data uji, biarkan terpisah. Jika ada data penting, backup sebelum migrasi.
