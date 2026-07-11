# Patch Status Presensi D / Dispen

## Instalasi

Dari root project:

```bash
unzip -o ~/Downloads/ejurnal-attendance-dispen-v1.zip -d .
rm -rf out
npm run typecheck
npm run dev
```

Tidak ada dependency baru, jadi `npm install` tidak perlu dijalankan ulang.

## Perubahan

- Menambahkan status `D` / `Dispen` pada input presensi.
- Menambahkan hitungan Dispen pada ringkasan dan tabel rekap.
- Menambahkan kolom Dispen pada export Excel.
- Sheet Detail Harian memakai nama status lengkap.
- Skor kehadiran memakai rumus `(Hadir + Dispen) ÷ Total Pertemuan × 100`.
- Migration database versi 4 memperbarui constraint status tanpa menghapus data presensi lama.

## Pemeriksaan setelah patch

1. Jalankan aplikasi dan login pada tahun/semester yang memiliki kelas.
2. Buka **Input Presensi** dan pastikan tombol `D` muncul.
3. Simpan satu siswa sebagai Dispen.
4. Buka **Rekap Absen** dan pastikan kolom `D` bertambah.
5. Export Excel dan periksa sheet Ringkasan, Rekap Siswa, serta Detail Harian.
