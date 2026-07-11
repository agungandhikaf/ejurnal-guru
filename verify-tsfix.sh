#!/usr/bin/env bash
set -euo pipefail

grep -q "sourceColumn.hidden !== undefined" src/main/services/gradeExportService.ts
grep -q "sourceColumn.style ?? {}" src/main/services/gradeExportService.ts

echo "TypeScript fix terpasang."
npm run typecheck
