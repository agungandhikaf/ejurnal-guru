# Status Presensi D / Dispen

## Cakupan perubahan

Status presensi sekarang terdiri dari:

- `H` — Hadir
- `S` — Sakit
- `I` — Izin
- `D` — Dispen
- `A` — Alpa

Status `D` digunakan ketika siswa tidak mengikuti pembelajaran karena dispensasi resmi, misalnya mengikuti kegiatan sekolah.

## Rumus skor kehadiran

Dispen tidak mengurangi skor kehadiran:

```text
Skor = (Hadir + Dispen) ÷ Total Pertemuan × 100
```

Sakit, Izin, dan Alpa tetap dicatat terpisah.

## Database

Migration database versi 4 membangun ulang tabel `attendance_records` agar constraint status menerima `D`. Seluruh data H/S/I/A yang sudah ada disalin tanpa diubah. Sebelum migration, aplikasi membuat backup otomatis.

## Export Excel

Export rekap sekarang memuat:

- kolom Hadir;
- kolom Sakit;
- kolom Izin;
- kolom Dispen;
- kolom Alpa;
- total pertemuan;
- skor kehadiran.

Pada sheet Detail Harian, kode status diubah menjadi label lengkap seperti `Hadir`, `Dispen`, dan `Alpa`.
