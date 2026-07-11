# Database dan SQL Patch

## Model data semester

```text
Tahun Ajaran
├── kelas
├── siswa dan penempatan kelas
├── Semester Ganjil
│   ├── presensi
│   ├── nilai
│   └── jurnal
└── Semester Genap
    ├── presensi
    ├── nilai
    └── jurnal
```

## Query pemeriksaan

```sql
PRAGMA integrity_check;
SELECT MAX(version) FROM schema_migrations;
SELECT * FROM applied_patches ORDER BY applied_at DESC;
```

## Aturan SQL patch

- Patch hanya dijalankan melalui menu Maintenance.
- Gunakan key stabil seperti NISN, label tahun, dan nama kelas. Satu nama kelas dapat memiliki beberapa mata pelajaran; penempatan siswa dibuat untuk seluruh record mata pelajaran dengan nama kelas fisik yang sama.
- Hindari ID numerik hardcoded jika data asal tidak diketahui.
- Gunakan `ON CONFLICT` agar patch idempotent secara data.
- Jangan menyertakan `BEGIN`, `COMMIT`, `VACUUM`, atau `ATTACH DATABASE`.
- Uji patch pada database dev atau salinan backup terlebih dahulu.

## Contoh insert/update siswa

Lihat `scripts/patches/sample-update-student.sql`.
