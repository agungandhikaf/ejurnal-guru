-- Contoh SQL patch. Uji di environment dev terlebih dahulu.
-- Aplikasi akan membuat backup dan membungkus file ini dalam transaksi.

INSERT INTO students (nisn, nama_siswa, jenis_kelamin)
VALUES ('0012345678', 'Ahmad Fauzan', 'L')
ON CONFLICT(nisn) DO UPDATE SET
  nama_siswa = excluded.nama_siswa,
  jenis_kelamin = excluded.jenis_kelamin,
  updated_at = CURRENT_TIMESTAMP;

-- Hapus penempatan lama pada tahun yang sama, lalu daftarkan ke seluruh
-- mata pelajaran yang memakai nama kelas fisik 7A.
DELETE FROM student_enrollments
WHERE academic_year_id = (SELECT id FROM academic_years WHERE label = '2026/2027')
  AND student_id = (SELECT id FROM students WHERE nisn = '0012345678');

INSERT INTO student_enrollments (academic_year_id, student_id, class_id)
SELECT ay.id, s.id, c.id
FROM academic_years ay
JOIN students s ON s.nisn = '0012345678'
JOIN classes c ON c.academic_year_id = ay.id
WHERE ay.label = '2026/2027'
  AND c.class_name = '7A'
ON CONFLICT(academic_year_id, student_id, class_id) DO UPDATE SET
  status = 'AKTIF';
