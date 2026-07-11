# Patch: Tabel Dikunci ke Tinggi Maksimal Jendela

Patch ini memperbaiki perilaku layout tabel agar halaman tidak ikut scroll. Tabel otomatis memakai sisa tinggi jendela Electron, baik pada ukuran normal maupun fullscreen. Jika data lebih panjang, scroll hanya muncul di dalam tabel.

## Instalasi

Dari root project:

```bash
unzip -o ~/Downloads/ejurnal-viewport-table-fix-v2.zip -d .
rm -rf out
npm run typecheck
npm run dev
```

Tidak perlu menjalankan `npm install`.

## File yang berubah

- `src/renderer/src/styles.css`
- `docs/RESPONSIVE_TABLE_VIEWPORT.md`
