#!/usr/bin/env bash
set -euo pipefail

BASE="$HOME/Library/Application Support"

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 tidak ditemukan di Mac ini."
  exit 1
fi

found=0
while IFS= read -r -d '' db; do
  found=1
  echo
  echo "============================================================"
  echo "Database : $db"
  echo "Ukuran   : $(du -h "$db" | awk '{print $1}')"
  echo "Integritas: $(sqlite3 "$db" 'PRAGMA integrity_check;' 2>/dev/null || echo 'gagal dibaca')"

  has_journals="$(sqlite3 "$db" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='teaching_journals';" 2>/dev/null || echo 0)"
  if [[ "$has_journals" == "1" ]]; then
    echo "Jurnal per semester:"
    sqlite3 -header -column "$db" \
      "SELECT s.id AS semester_id,
              ay.label AS tahun,
              s.name AS semester,
              COUNT(tj.id) AS jumlah_jurnal
       FROM semesters s
       JOIN academic_years ay ON ay.id = s.academic_year_id
       LEFT JOIN teaching_journals tj ON tj.semester_id = s.id
       GROUP BY s.id, ay.label, s.name
       ORDER BY ay.start_year DESC, CASE s.name WHEN 'GANJIL' THEN 1 ELSE 2 END;" \
      2>/dev/null || true
  else
    echo "Tabel teaching_journals belum ada."
  fi
done < <(find "$BASE" -type f -name 'ejurnal.db' -print0 2>/dev/null)

if [[ "$found" == "0" ]]; then
  echo "Tidak ditemukan file ejurnal.db di: $BASE"
fi
