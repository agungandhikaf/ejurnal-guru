# Catatan Tema Warna E-Jurnal Guru

Catatan ini dibuat sebelum perubahan tema warna di-push dari branch `dev`.

## Tema original sebelum perubahan

Tema awal aplikasi menggunakan warna bawaan Tailwind tanpa override `colors` di `tailwind.config.js`.

| Bagian | Warna original |
| --- | --- |
| Primary dan focus state | Tailwind default `indigo-*` |
| Background dan teks netral | Tailwind default `slate-*` |
| Sidebar admin/guru | `#111625` |
| Panel kiri halaman login | `#111625` |
| Background root | `#F8FAFC` |
| Warna teks root | `#1E293B` |
| Shadow `soft` | `0 12px 30px rgba(15, 23, 42, 0.08)` |
| Dekorasi login utama | `indigo-600/30` |
| Dekorasi login sekunder | `fuchsia-600/20` |
| Banner dashboard | Gradient `indigo-700` ke `indigo-500` |

Konfigurasi original `tailwind.config.js` tidak mempunyai bagian `extend.colors`; hanya mempunyai `boxShadow.soft`.

## Tema aktif

| Peran | Warna | Penggunaan |
| --- | --- | --- |
| Aksen kuat | `#F283AE` | Elemen dekoratif dan highlight kuat |
| Background utama | `#FBF4EA` | Latar aplikasi dan permukaan netral |
| Soft surface | `#FBDAE5` | Selected state, tabel, badge, dan panel lembut |
| Primary | `#C43670` | Tombol utama, focus state, heading aksen, dan identitas utama |
| Aksen hangat | `#FFD592` | Ikon, badge, dan penyeimbang warna pink |

Warna semantik seperti merah untuk error/hapus, hijau untuk status berhasil, serta warna status presensi tetap dipertahankan sesuai fungsinya.

## File tema yang berubah

- `tailwind.config.js`
- `src/renderer/src/styles.css`
- `src/renderer/src/pages/LoginPage.tsx`
- `src/renderer/src/pages/teacher/DashboardPage.tsx`
- `src/renderer/src/pages/teacher/TeacherLayout.tsx`
- `src/renderer/src/pages/admin/AdminLayout.tsx`

## Cara commit yang disarankan

Simpan perubahan warna sebagai commit khusus agar mudah dikembalikan tanpa menyentuh fitur lain:

```bash
git add tailwind.config.js \
  src/renderer/src/styles.css \
  src/renderer/src/pages/LoginPage.tsx \
  src/renderer/src/pages/teacher/DashboardPage.tsx \
  src/renderer/src/pages/teacher/TeacherLayout.tsx \
  src/renderer/src/pages/admin/AdminLayout.tsx \
  docs/COLOR_THEME_NOTES.md

git commit -m "style: apply pink cream color palette"
git push
```

Catat hash commit setelah commit dibuat:

```bash
git log -1 --oneline
```

## Prompt untuk kembali ke tema original

Salin prompt berikut ke Codex:

```text
Kembalikan hanya tema warna E-Jurnal Guru ke tema original yang didokumentasikan di docs/COLOR_THEME_NOTES.md. Tema original memakai Tailwind default indigo dan slate tanpa override extend.colors, sidebar serta panel login #111625, background root #F8FAFC, teks root #1E293B, shadow soft rgba(15, 23, 42, 0.08), dekorasi login indigo/fuchsia, dan banner dashboard gradient indigo-700 ke indigo-500. Jangan ubah fitur, database, dependency, konfigurasi Electron, layout, copy, atau perubahan fitur yang dibuat setelah tema ini. Scope hanya file UI/theme yang tercatat dalam dokumen. Setelah selesai, jalankan npm run build dan tampilkan daftar file yang berubah.
```

Jika hash commit tema sudah diketahui, gunakan prompt yang lebih presisi:

```text
Kembalikan hanya perubahan visual dari commit tema <HASH_COMMIT_TEMA>, tanpa menghapus commit atau perubahan fitur setelahnya. Buat inverse patch terbatas pada file yang tercatat di docs/COLOR_THEME_NOTES.md. Jangan gunakan git reset. Setelah selesai, jalankan npm run build dan periksa git diff.
```

## Prompt untuk memasang kembali tema ini

Salin prompt berikut jika suatu saat ingin memakai palet ini lagi:

```text
Terapkan kembali tema warna E-Jurnal Guru berdasarkan docs/COLOR_THEME_NOTES.md. Gunakan #C43670 sebagai primary, #F283AE sebagai aksen kuat, #FBF4EA sebagai background utama, #FBDAE5 sebagai selected state/soft surface, dan #FFD592 sebagai aksen hangat. Terapkan konsisten melalui token Tailwind serta halaman login, dashboard guru, dan sidebar admin/guru. Pertahankan warna semantik untuk error, sukses, hapus, dan status presensi. Jangan ubah fitur, layout, database, dependency, atau konfigurasi Electron. Setelah selesai, jalankan npm run build dan tampilkan daftar file yang berubah.
```

## Rollback melalui Git

Jika commit tema benar-benar hanya berisi perubahan warna, cara paling sederhana adalah:

```bash
git revert <HASH_COMMIT_TEMA>
```

`git revert` membuat commit baru yang membatalkan tema sehingga riwayat tetap aman. Jangan memakai `git reset --hard` pada branch yang sudah di-push.
