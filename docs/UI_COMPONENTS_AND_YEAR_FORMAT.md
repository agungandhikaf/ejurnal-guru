# Dropdown, Date Picker, dan Konsep Tahun Ajaran

## Komponen antarmuka

Semua elemen `<select>` native pada renderer menggunakan komponen `Select` khusus aplikasi. Semua input tanggal menggunakan komponen `DatePicker` berbahasa Indonesia.

Lokasi komponen:

```text
src/renderer/src/components/Select.tsx
src/renderer/src/components/DatePicker.tsx
```

## Konsep tahun ajaran

Tahun ajaran disimpan sebagai rentang dua tahun:

```text
2026/2027
```

Admin tetap cukup menginput **tahun awal**, misalnya `2026`. Aplikasi otomatis membentuk:

```text
Tahun awal  : 2026
Tahun akhir : 2027
Label       : 2026/2027
```

Pembagian semester:

```text
Juli–Desember 2026  → Tahun Ajaran 2026/2027, Semester Ganjil
Januari–Juni 2027   → Tahun Ajaran 2026/2027, Semester Genap
```

Rumus rekomendasi otomatis berdasarkan tanggal perangkat:

```text
Jika bulan Juli–Desember:
  tahun awal = tahun kalender saat ini
  semester   = Ganjil

Jika bulan Januari–Juni:
  tahun awal = tahun kalender saat ini - 1
  semester   = Genap
```

Contoh:

| Tanggal perangkat | Saran tahun ajaran | Saran semester |
|---|---|---|
| Januari 2026 | 2025/2026 | Genap |
| Juli 2026 | 2026/2027 | Ganjil |
| Januari 2027 | 2026/2027 | Genap |
| Juli 2027 | 2027/2028 | Ganjil |

Saran hanya menjadi pilihan awal pada login. Guru tetap dapat memilih tahun ajaran atau semester lain.

## Relasi data tetap sama

```text
Siswa dan kelas  → per tahun ajaran
Presensi         → per semester
Nilai            → per semester
Jurnal mengajar  → per semester
```

Pergantian semester tidak membuat siswa pindah kelas. Penempatan siswa tetap mengikuti tahun ajaran.

## Migration database

Migration versi 3 mengembalikan label lama yang sempat berbentuk satu tahun menjadi rentang:

```text
2026 → 2026/2027
2027 → 2027/2028
```

Migration hanya memperbarui label `academic_years`. ID tahun ajaran dan seluruh relasi siswa, kelas, presensi, nilai, serta jurnal tidak berubah.

## Pemeriksaan setelah replace file

```bash
rm -rf out
npm run typecheck
npm run dev
```

Periksa:

1. Menu Admin → Tahun Ajaran menampilkan rentang, misalnya `2026/2027`.
2. Modal tambah tahun meminta **Tahun Awal Ajaran**.
3. Input `2026` menghasilkan preview `2026/2027`.
4. Login pada Juli 2026 otomatis menyarankan `2026/2027 • Ganjil` jika data tersedia.
5. Login pada Januari 2027 otomatis menyarankan `2026/2027 • Genap` jika data tersedia.
6. Data siswa tetap sama pada Ganjil dan Genap, sedangkan presensi, nilai, dan jurnal tetap terpisah.

## Layout tabel responsif terhadap tinggi jendela

Semua halaman yang memiliki `.card` berisi `.table-wrap` memakai tinggi jendela yang tersedia secara dinamis. Tidak ada lagi batas tetap seperti `max-h-[520px]` atau `max-h-[560px]` yang menentukan tinggi efektif tabel.

Mekanismenya:

- `TeacherLayout` dan `AdminLayout` memakai `app-main` serta `page-host`.
- Root halaman tetap dapat di-scroll untuk halaman non-tabel atau ketika tinggi jendela sangat kecil.
- Card yang memiliki tabel otomatis tumbuh mengisi sisa tinggi halaman.
- Header halaman, filter, ringkasan, dan tombol aksi tetap terlihat.
- Area tabel memakai scroll internal ketika jumlah baris melebihi tinggi yang tersedia.
- Saat tinggi jendela diperbesar, lebih banyak baris langsung terlihat tanpa perubahan kode halaman.

Struktur yang dikenali otomatis:

```tsx
<div className="space-y-6">
  <div>Header halaman</div>
  <div className="card p-6">
    <div>Filter</div>
    <div className="table-wrap mt-5 max-h-[520px]">
      <table className="table-base">...</table>
    </div>
  </div>
</div>
```

Walaupun class `max-h-[...]` lama masih ada pada beberapa halaman, aturan global responsive mengesampingkannya. Ini sengaja dilakukan supaya patch tidak menimpa logika halaman yang sudah berjalan dan tidak menimbulkan regresi pada fitur lain.

