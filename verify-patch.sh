#!/usr/bin/env bash
set -euo pipefail

echo "Memeriksa patch..."
grep -q "Ingat username" src/renderer/src/pages/LoginPage.tsx
grep -q "Template baru:" src/main/services/gradeExportService.ts
test -f "resources/templates/Template PAS.xlsx"
test -f "resources/templates/Template Sumatif.xlsx"

echo "Patch terpasang:"
grep -n "Ingat username" src/renderer/src/pages/LoginPage.tsx
grep -n "Template baru:" src/main/services/gradeExportService.ts

echo
echo "Menjalankan typecheck..."
npm run typecheck

echo
echo "Selesai. Jalankan: npm run dev"
