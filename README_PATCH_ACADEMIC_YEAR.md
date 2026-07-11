# Patch Konsep Tahun Ajaran

Patch ini mengembalikan label tahun ajaran ke format rentang, misalnya `2026/2027`, tanpa mengubah relasi data.

## File yang berubah

```text
src/shared/academicYear.ts
src/main/db/migrations.ts
src/main/services/appService.ts
src/renderer/src/pages/LoginPage.tsx
src/renderer/src/pages/admin/YearsAdminPage.tsx
README.md
docs/UI_COMPONENTS_AND_YEAR_FORMAT.md
docs/USER_MANUAL_ADMIN_DEV.md
docs/USER_MANUAL_GURU.md
```

## Cara pasang

Ekstrak ZIP ke root project, lalu:

```bash
rm -rf out
npm run typecheck
npm run dev
```

Tidak perlu menjalankan `npm install` karena patch tidak menambah dependency.

## Hasil yang diharapkan

- Input tahun awal `2026` membuat tahun ajaran `2026/2027`.
- Juli 2026 menyarankan `2026/2027 • Ganjil`.
- Januari 2027 menyarankan `2026/2027 • Genap`.
- Januari 2026 menyarankan `2025/2026 • Genap`.
- Data siswa/kelas tetap per tahun ajaran.
- Presensi/nilai/jurnal tetap per semester.
