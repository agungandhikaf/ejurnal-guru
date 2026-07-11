# Fix first-run database

Ekstrak ZIP ini ke root project E-Jurnal Guru agar struktur berikut terganti/ditambahkan:

```text
src/main/db/database.ts
src/main/index.ts
docs/TROUBLESHOOTING.md
```

Kemudian jalankan:

```bash
rm -rf out
npm run dev
```

Tidak perlu menjalankan `npm install` ulang untuk patch ini.
