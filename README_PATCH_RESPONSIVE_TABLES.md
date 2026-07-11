# Patch Responsive Table Height

Patch ini mengubah layout tabel agar memanfaatkan seluruh sisa tinggi jendela aplikasi.

## File yang berubah

- `src/renderer/src/styles.css`
- `src/renderer/src/pages/teacher/TeacherLayout.tsx`
- `src/renderer/src/pages/admin/AdminLayout.tsx`
- `docs/UI_COMPONENTS_AND_YEAR_FORMAT.md`

## Cara menerapkan

```bash
cd /Users/afa/Documents/ejurnal-guru
unzip -o ~/Downloads/ejurnal-responsive-table-layout-v1.zip -d .
rm -rf out
npm run typecheck
npm run dev
```

Tidak diperlukan `npm install` karena patch ini tidak menambah dependency.

## Hasil yang diharapkan

- Card tabel memanjang hingga bagian bawah area konten.
- Lebih banyak baris terlihat saat jendela tinggi atau layar besar.
- Tabel mengecil secara otomatis saat tinggi jendela berkurang.
- Scroll terjadi di dalam tabel.
- Halaman non-tabel tetap dapat di-scroll secara normal.
