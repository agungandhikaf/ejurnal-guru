# Patch Export Nilai Sumatif dan PAS

## Cara memasang

Ekstrak ZIP patch ke root project:

```bash
cd /Users/afa/Documents/ejurnal-guru
unzip -o ~/Downloads/ejurnal-grade-export-v1.zip -d .
rm -rf out
npm run typecheck
npm run dev
```

Tidak ada dependency baru, sehingga `npm install` tidak perlu dijalankan ulang.

## File template wajib ikut Git

Pastikan dua file berikut tercatat di repository:

```text
resources/templates/Template Sumatif.xlsx
resources/templates/Template PAS.xlsx
```

## Sebelum PR ke prod

1. Uji export Sumatif dengan seluruh komponen lengkap.
2. Uji export Sumatif dengan satu komponen kosong dan pastikan export dibatalkan.
3. Uji export PAS dengan seluruh PAS lengkap.
4. Uji export PAS dengan satu PAS kosong dan pastikan export dibatalkan.
5. Buka file hasil export dan cek Kelas/Mapel, NISN, nama, jumlah siswa, nilai, serta jumlah worksheet.
6. Jalankan `npm run typecheck` dan `npm run build`.
7. Naikkan version sebelum PR ke `prod`.
