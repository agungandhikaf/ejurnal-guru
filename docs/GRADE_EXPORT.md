# Export Nilai Sumatif dan PAS

## Tujuan

Fitur export digunakan untuk membantu guru menyalin nilai ke file Excel resmi milik web internal sekolah. File hasil export tidak dimaksudkan untuk langsung diunggah ke web internal karena aplikasi E-Jurnal tidak memiliki ID siswa internal sekolah.

Kolom yang diisi otomatis:

- No
- NISN
- Nama siswa
- Nilai
- Kelas/Mapel

Kolom yang sengaja dikosongkan:

- ID Siswa
- NIS
- Nama pada bagian identitas
- Materi
- KKTP

## Alur penggunaan

1. Login sebagai guru dengan tahun ajaran dan semester yang benar.
2. Buka **Rekap & Input Nilai**.
3. Pilih kelas dan mata pelajaran.
4. Isi nilai, lalu klik **Simpan Nilai**.
5. Klik **Export Excel**.
6. Pilih **Sumatif** atau **PAS**.
7. Klik **Export Excel** dan pilih lokasi penyimpanan.

Export selalu memakai nilai terakhir yang sudah tersimpan di database.

## Export Sumatif

- Satu Sumatif menghasilkan satu worksheet.
- Nama worksheet mengikuti template: `SUM 1`, `SUM 2`, dan seterusnya.
- Hanya worksheet sesuai jumlah Sumatif yang dikonfigurasi yang dipertahankan.
- Template mendukung maksimal 10 Sumatif.
- Nilai setiap Sumatif adalah rata-rata seluruh komponennya.
- Hasil rata-rata dibulatkan ke bilangan bulat terdekat menggunakan `Math.round`.
- Jika ada satu komponen yang belum diisi pada satu siswa, export dibatalkan dan aplikasi menampilkan siswa serta komponen yang belum lengkap.

Contoh:

```text
TGS 1 = 80
TGS 2 = 85
UH 1  = 83
Rata-rata = 82,67
Nilai export = 83
```

Nama file:

```text
Sumatif-VII.A-Pendidikan Pancasila.xlsx
```

## Export PAS

- Nilai diambil dari kolom PAS yang sudah disimpan.
- Jika satu siswa belum memiliki nilai PAS, export dibatalkan.

Nama file:

```text
PAS-VII.B-Pendidikan Pancasila.xlsx
```

## Konversi kelas

```text
7A  → VII.A
7B  → VII.B
8C  → VIII.C
9D  → IX.D
10A → X.A
11B → XI.B
12C → XII.C
```

## Template aplikasi

File template berada di:

```text
resources/templates/Template Sumatif.xlsx
resources/templates/Template PAS.xlsx
```

Pada build Electron, kedua file disalin ke:

```text
Contents/Resources/templates/
```

Konfigurasi packaging terdapat pada:

```text
electron-builder.dev.yml
electron-builder.prod.yml
```

Jangan mengubah nama file template tanpa menyesuaikan nama file di `AppService.exportGrades()`.
