# Tabel Mengikuti Tinggi Jendela Electron

## Perilaku yang diharapkan

- Halaman aplikasi tidak memiliki scroll vertikal.
- Judul, tombol, filter, dan informasi di atas tabel tetap terlihat.
- Card tabel mengambil seluruh sisa tinggi jendela Electron.
- Jika jendela diperbesar atau masuk fullscreen, area tabel ikut membesar.
- Jika jendela diperkecil, area tabel ikut mengecil.
- Ketika jumlah baris melebihi area yang tersedia, hanya area tabel yang memiliki scroll.
- Header tabel tetap sticky saat isi tabel digulir.

## Implementasi

Layout menggunakan rantai flex dengan `min-height: 0` dan `overflow: hidden` dari root aplikasi sampai host halaman. Card yang berisi `.table-wrap` menggunakan sisa ruang melalui `flex: 1`. `.table-wrap` menjadi satu-satunya area dengan `overflow: auto`.

Jangan menambahkan `overflow-y-auto` pada `.page-host`, root halaman, atau card tabel karena akan membuat seluruh halaman ikut scroll.

Kelas `max-h-[...]` lama pada `.table-wrap` masih boleh ada di file halaman karena stylesheet global menimpanya dengan `max-height: none !important` untuk layout desktop Electron.
