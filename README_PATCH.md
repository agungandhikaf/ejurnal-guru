# Patch UI Popover, Komponen Nilai, dan Lokasi Database

Patch ini dibuat dari source aktual `ejurnal-current.zip`.

## File yang berubah

```text
src/renderer/src/components/Select.tsx
src/renderer/src/components/DatePicker.tsx
src/renderer/src/pages/teacher/GradesPage.tsx
src/renderer/src/pages/admin/MaintenancePage.tsx
src/main/index.ts
src/preload/index.ts
src/shared/channels.ts
docs/UI_COMPONENTS_AND_YEAR_FORMAT.md
docs/TROUBLESHOOTING.md
docs/USER_MANUAL_ADMIN_DEV.md
scripts/inspect-local-databases.sh
```

## Menjalankan setelah replace

```bash
rm -rf out
npm run typecheck
npm run dev
```

Tidak ada dependency baru dan tidak perlu menjalankan `npm install` ulang.
