import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { app, dialog } from 'electron'
import bcrypt from 'bcryptjs'
import ExcelJS from 'exceljs'
import type { AppDatabase } from '../db/database'
import { buildGradeExportFileName, createGradeExportWorkbook } from './gradeExportService'
import { formatAcademicYearLabel } from '../../shared/academicYear'
import type {
  AcademicYear,
  AttendanceRow,
  DashboardData,
  GradeExportType,
  GradeSheetRow,
  LoginSession,
  MaintenanceInfo,
  SchoolClass,
  Semester,
  Student,
  SummativeGroup,
  Teacher,
  TeachingJournal
} from '../../shared/types'

interface LoginInput {
  role: 'ADMIN' | 'GURU'
  username: string
  code: string
  academicYearId?: number
  semesterId?: number
}

interface StudentImportRow {
  nisn: string
  namaSiswa: string
  jenisKelamin: 'L' | 'P'
}

export class AppService {
  constructor(private readonly database: AppDatabase, private readonly environment: string) {}

  getLoginOptions(): { years: Array<AcademicYear & { semesters: Semester[] }> } {
    const years = this.database.db
      .prepare(`SELECT id, label, start_year AS startYear, end_year AS endYear, is_active AS isActive
                FROM academic_years WHERE is_active = 1 ORDER BY start_year DESC`)
      .all() as AcademicYear[]
    const semesterStmt = this.database.db.prepare(
      `SELECT id, academic_year_id AS academicYearId, name, is_active AS isActive
       FROM semesters WHERE academic_year_id = ? AND is_active = 1 ORDER BY CASE name WHEN 'GANJIL' THEN 1 ELSE 2 END`
    )
    return {
      years: years.map((year) => ({ ...year, semesters: semesterStmt.all(year.id) as Semester[] }))
    }
  }

  login(input: LoginInput): LoginSession {
    const user = this.database.db
      .prepare(`SELECT id, username, code_hash AS codeHash, nama_guru AS namaGuru, jabatan, role, is_active AS isActive
                FROM users WHERE username = ? AND role = ?`)
      .get(input.username.trim(), input.role) as
      | { id: number; username: string; codeHash: string; namaGuru: string; jabatan: string; role: 'ADMIN' | 'GURU'; isActive: number }
      | undefined

    if (!user || !user.isActive || !bcrypt.compareSync(input.code, user.codeHash)) {
      throw new Error('Username atau kode tidak valid.')
    }

    if (input.role === 'ADMIN') {
      return {
        userId: user.id,
        username: user.username,
        namaGuru: user.namaGuru,
        jabatan: user.jabatan,
        role: user.role
      }
    }

    if (!input.academicYearId || !input.semesterId) {
      throw new Error('Tahun ajaran dan semester wajib dipilih.')
    }

    const context = this.database.db
      .prepare(`SELECT ay.id AS academicYearId, ay.label AS academicYearLabel,
                       s.id AS semesterId, s.name AS semesterName
                FROM academic_years ay
                JOIN semesters s ON s.academic_year_id = ay.id
                WHERE ay.id = ? AND s.id = ? AND ay.is_active = 1 AND s.is_active = 1`)
      .get(input.academicYearId, input.semesterId) as
      | { academicYearId: number; academicYearLabel: string; semesterId: number; semesterName: 'GANJIL' | 'GENAP' }
      | undefined
    if (!context) throw new Error('Konteks tahun ajaran atau semester tidak valid.')

    return {
      userId: user.id,
      username: user.username,
      namaGuru: user.namaGuru,
      jabatan: user.jabatan,
      role: user.role,
      ...context
    }
  }

  listTeachers(): Teacher[] {
    return this.database.db
      .prepare(`SELECT id, username, nama_guru AS namaGuru, jabatan, is_active AS isActive, created_at AS createdAt
                FROM users WHERE role = 'GURU' ORDER BY nama_guru`)
      .all() as Teacher[]
  }

  createTeacher(input: { username: string; code: string; namaGuru: string; jabatan: string }): void {
    if (!input.username.trim() || !input.code.trim() || !input.namaGuru.trim()) {
      throw new Error('Username, kode, dan nama guru wajib diisi.')
    }
    const hash = bcrypt.hashSync(input.code, 12)
    this.database.db
      .prepare(`INSERT INTO users(username, code_hash, nama_guru, jabatan, role)
                VALUES (?, ?, ?, ?, 'GURU')`)
      .run(input.username.trim(), hash, input.namaGuru.trim(), input.jabatan.trim() || 'Guru')
  }

  toggleTeacher(id: number): void {
    this.database.db
      .prepare(`UPDATE users SET is_active = CASE is_active WHEN 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND role = 'GURU'`)
      .run(id)
  }

  listAcademicYears(): Array<AcademicYear & { semesters: Semester[] }> {
    const years = this.database.db
      .prepare(`SELECT id, label, start_year AS startYear, end_year AS endYear, is_active AS isActive
                FROM academic_years ORDER BY start_year DESC`)
      .all() as AcademicYear[]
    const stmt = this.database.db.prepare(
      `SELECT id, academic_year_id AS academicYearId, name, is_active AS isActive
       FROM semesters WHERE academic_year_id = ? ORDER BY CASE name WHEN 'GANJIL' THEN 1 ELSE 2 END`
    )
    return years.map((year) => ({ ...year, semesters: stmt.all(year.id) as Semester[] }))
  }

  createAcademicYear(input: { startYear: number }): void {
    const start = Number(input.startYear)
    if (!Number.isInteger(start) || start < 2000 || start > 2200) {
      throw new Error('Tahun awal ajaran tidak valid.')
    }

    const end = start + 1
    const label = formatAcademicYearLabel(start)
    const existing = this.database.db
      .prepare('SELECT id FROM academic_years WHERE start_year = ? OR label = ?')
      .get(start, label)

    if (existing) {
      throw new Error(`Tahun ajaran ${label} sudah tersedia.`)
    }

    const transaction = this.database.db.transaction(() => {
      const result = this.database.db
        .prepare(`INSERT INTO academic_years(label, start_year, end_year) VALUES (?, ?, ?)`)
        .run(label, start, end)
      this.database.db
        .prepare(`INSERT INTO semesters(academic_year_id, name) VALUES (?, 'GANJIL'), (?, 'GENAP')`)
        .run(result.lastInsertRowid, result.lastInsertRowid)
    })
    transaction()
  }

  listClasses(academicYearId: number): SchoolClass[] {
    return this.database.db
      .prepare(`SELECT id, academic_year_id AS academicYearId, class_name AS className,
                       subject_name AS subjectName, is_active AS isActive
                FROM classes WHERE academic_year_id = ? ORDER BY class_name, subject_name`)
      .all(academicYearId) as SchoolClass[]
  }

  createClass(input: { academicYearId: number; className: string; subjectName: string }): void {
    if (!input.className.trim() || !input.subjectName.trim()) throw new Error('Kelas dan mata pelajaran wajib diisi.')
    this.database.db
      .prepare(`INSERT INTO classes(academic_year_id, class_name, subject_name) VALUES (?, ?, ?)`)
      .run(input.academicYearId, input.className.trim().toUpperCase(), input.subjectName.trim())
  }

  listStudents(input: { academicYearId: number; classId?: number; search?: string }): Student[] {
    const params: unknown[] = [input.academicYearId]
    let where = `se.academic_year_id = ? AND s.is_active = 1`
    if (input.classId) {
      where += ' AND se.class_id = ?'
      params.push(input.classId)
    }
    if (input.search?.trim()) {
      where += ' AND (s.nisn LIKE ? OR s.nama_siswa LIKE ?)'
      const q = `%${input.search.trim()}%`
      params.push(q, q)
    }
    return this.database.db
      .prepare(`SELECT s.id, s.nisn, s.nama_siswa AS namaSiswa, s.jenis_kelamin AS jenisKelamin,
                       c.id AS classId, c.class_name AS className
                FROM students s
                JOIN student_enrollments se ON se.student_id = s.id
                JOIN classes c ON c.id = se.class_id
                WHERE ${where}
                ORDER BY c.class_name, s.nama_siswa`)
      .all(...params) as Student[]
  }

  createStudent(input: { academicYearId: number; classId: number; nisn: string; namaSiswa: string; jenisKelamin: 'L' | 'P' }): void {
    this.validateStudent(input)
    const transaction = this.database.db.transaction(() => {
      this.database.db
        .prepare(`INSERT INTO students(nisn, nama_siswa, jenis_kelamin)
                  VALUES (?, ?, ?)
                  ON CONFLICT(nisn) DO UPDATE SET nama_siswa = excluded.nama_siswa,
                    jenis_kelamin = excluded.jenis_kelamin, updated_at = CURRENT_TIMESTAMP`)
        .run(input.nisn.trim(), input.namaSiswa.trim(), input.jenisKelamin)
      const student = this.database.db.prepare('SELECT id FROM students WHERE nisn = ?').get(input.nisn.trim()) as { id: number }
      this.assignStudentToClassName(input.academicYearId, student.id, input.classId)
    })
    transaction()
  }

  updateStudent(input: { id: number; academicYearId: number; classId: number; nisn: string; namaSiswa: string; jenisKelamin: 'L' | 'P' }): void {
    this.validateStudent(input)
    const transaction = this.database.db.transaction(() => {
      this.database.db
        .prepare(`UPDATE students SET nisn = ?, nama_siswa = ?, jenis_kelamin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(input.nisn.trim(), input.namaSiswa.trim(), input.jenisKelamin, input.id)
      this.assignStudentToClassName(input.academicYearId, input.id, input.classId)
    })
    transaction()
  }

  private validateStudent(input: { nisn: string; namaSiswa: string; jenisKelamin: string }): void {
    if (!input.nisn.trim() || !input.namaSiswa.trim()) throw new Error('NISN dan nama siswa wajib diisi.')
    if (!/^\d{5,20}$/.test(input.nisn.trim())) throw new Error('NISN harus berupa 5–20 digit.')
    if (!['L', 'P'].includes(input.jenisKelamin)) throw new Error('Jenis kelamin harus L atau P.')
  }

  async createStudentTemplate(): Promise<string | null> {
    const result = await dialog.showSaveDialog({
      title: 'Simpan Template Import Siswa',
      defaultPath: 'template-import-siswa.xlsx',
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    if (result.canceled || !result.filePath) return null
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Siswa')
    sheet.columns = [
      { header: 'NISN', key: 'nisn', width: 18 },
      { header: 'Nama Siswa', key: 'namaSiswa', width: 34 },
      { header: 'Jenis Kelamin', key: 'jenisKelamin', width: 18 }
    ]
    sheet.addRows([
      { nisn: '0012345678', namaSiswa: 'Contoh Siswa', jenisKelamin: 'L' },
      { nisn: '0012345679', namaSiswa: 'Contoh Siswi', jenisKelamin: 'P' }
    ])
    sheet.getRow(1).font = { bold: true }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    await workbook.xlsx.writeFile(result.filePath)
    return result.filePath
  }

  async importStudents(input: { academicYearId: number; classId: number }): Promise<{ inserted: number; updated: number; skipped: number }> {
    const result = await dialog.showOpenDialog({
      title: 'Pilih File Excel Siswa',
      properties: ['openFile'],
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return { inserted: 0, updated: 0, skipped: 0 }

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(result.filePaths[0])
    const sheet = workbook.worksheets[0]
    if (!sheet) throw new Error('File Excel tidak memiliki worksheet.')

    const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '')
    const headerMap = new Map<string, number>()
    sheet.getRow(1).eachCell((cell, columnNumber) => headerMap.set(normalize(cell.text), columnNumber))
    const nisnColumn = headerMap.get('nisn')
    const nameColumn = headerMap.get('namasiswa') ?? headerMap.get('nama')
    const genderColumn = headerMap.get('jeniskelamin') ?? headerMap.get('gender')
    if (!nisnColumn || !nameColumn || !genderColumn) {
      throw new Error('Kolom wajib: NISN, Nama Siswa, dan Jenis Kelamin.')
    }

    const rows: StudentImportRow[] = []
    let skipped = 0
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber)
      const nisn = row.getCell(nisnColumn).text.trim()
      const namaSiswa = row.getCell(nameColumn).text.trim()
      const genderRaw = row.getCell(genderColumn).text.trim().toUpperCase()
      if (!nisn && !namaSiswa && !genderRaw) continue
      const jenisKelamin = genderRaw.startsWith('P') ? 'P' : genderRaw.startsWith('L') ? 'L' : null
      if (!/^\d{5,20}$/.test(nisn) || !namaSiswa || !jenisKelamin) {
        skipped += 1
        continue
      }
      rows.push({ nisn, namaSiswa, jenisKelamin })
    }

    let inserted = 0
    let updated = 0
    const transaction = this.database.db.transaction(() => {
      const find = this.database.db.prepare('SELECT id FROM students WHERE nisn = ?')
      const upsertStudent = this.database.db.prepare(`INSERT INTO students(nisn, nama_siswa, jenis_kelamin)
        VALUES (?, ?, ?)
        ON CONFLICT(nisn) DO UPDATE SET nama_siswa = excluded.nama_siswa,
          jenis_kelamin = excluded.jenis_kelamin, updated_at = CURRENT_TIMESTAMP`)
      const findAfter = this.database.db.prepare('SELECT id FROM students WHERE nisn = ?')
      for (const row of rows) {
        const existing = find.get(row.nisn)
        upsertStudent.run(row.nisn, row.namaSiswa, row.jenisKelamin)
        const student = findAfter.get(row.nisn) as { id: number }
        this.assignStudentToClassName(input.academicYearId, student.id, input.classId)
        existing ? updated++ : inserted++
      }
    })
    transaction()
    return { inserted, updated, skipped }
  }

  private assignStudentToClassName(academicYearId: number, studentId: number, selectedClassId: number): void {
    const selected = this.database.db
      .prepare(`SELECT class_name AS className FROM classes WHERE id = ? AND academic_year_id = ?`)
      .get(selectedClassId, academicYearId) as { className: string } | undefined
    if (!selected) throw new Error('Kelas tujuan tidak ditemukan.')

    this.database.db
      .prepare('DELETE FROM student_enrollments WHERE academic_year_id = ? AND student_id = ?')
      .run(academicYearId, studentId)
    this.database.db
      .prepare(`INSERT INTO student_enrollments(academic_year_id, student_id, class_id)
                SELECT ?, ?, id FROM classes
                WHERE academic_year_id = ? AND class_name = ? AND is_active = 1
                ON CONFLICT(academic_year_id, student_id, class_id)
                DO UPDATE SET status = 'AKTIF'`)
      .run(academicYearId, studentId, academicYearId, selected.className)
  }

  getDashboard(input: { academicYearId: number; semesterId: number }): DashboardData {
    const totals = this.database.db
      .prepare(`SELECT
        (SELECT COUNT(*) FROM classes WHERE academic_year_id = ? AND is_active = 1) AS totalClasses,
        (SELECT COUNT(DISTINCT student_id) FROM student_enrollments WHERE academic_year_id = ? AND status = 'AKTIF') AS totalStudents,
        (SELECT COUNT(*) FROM attendance_sessions WHERE semester_id = ? AND attendance_date = date('now','localtime')) AS attendanceToday,
        (SELECT COUNT(*) FROM teaching_journals WHERE semester_id = ?) AS totalJournals`)
      .get(input.academicYearId, input.academicYearId, input.semesterId, input.semesterId) as Omit<DashboardData, 'classes'>
    const classes = this.database.db
      .prepare(`SELECT c.id, c.class_name AS className, c.subject_name AS subjectName,
                       COUNT(DISTINCT se.student_id) AS studentCount
                FROM classes c
                LEFT JOIN student_enrollments se ON se.class_id = c.id AND se.academic_year_id = c.academic_year_id
                WHERE c.academic_year_id = ? AND c.is_active = 1
                GROUP BY c.id ORDER BY c.class_name, c.subject_name`)
      .all(input.academicYearId) as DashboardData['classes']
    return { ...totals, classes }
  }

  getAttendanceForm(input: {
    academicYearId: number
    semesterId: number
    classId: number
    date: string
    lessonStart: number
    lessonEnd: number
  }): AttendanceRow[] {
    const rows = this.database.db
      .prepare(`SELECT s.id, s.nisn, s.nama_siswa AS namaSiswa, s.jenis_kelamin AS jenisKelamin,
                       c.id AS classId, c.class_name AS className,
                       COALESCE(ar.status, 'H') AS status, COALESCE(ar.note, '') AS note
                FROM student_enrollments se
                JOIN students s ON s.id = se.student_id
                JOIN classes c ON c.id = se.class_id
                LEFT JOIN attendance_sessions ats ON ats.semester_id = ? AND ats.class_id = se.class_id
                  AND ats.attendance_date = ? AND ats.lesson_start = ? AND ats.lesson_end = ?
                LEFT JOIN attendance_records ar ON ar.attendance_session_id = ats.id AND ar.student_enrollment_id = se.id
                WHERE se.academic_year_id = ? AND se.class_id = ? AND se.status = 'AKTIF'
                ORDER BY s.nama_siswa`)
      .all(input.semesterId, input.date, input.lessonStart, input.lessonEnd, input.academicYearId, input.classId) as AttendanceRow[]
    return rows
  }

  saveAttendance(input: {
    userId: number
    academicYearId: number
    semesterId: number
    classId: number
    date: string
    lessonStart: number
    lessonEnd: number
    rows: Array<{ studentId: number; status: string; note: string }>
  }): void {
    const validStatuses = new Set(['H', 'S', 'I', 'D', 'A'])
    const transaction = this.database.db.transaction(() => {
      this.database.db
        .prepare(`INSERT INTO attendance_sessions(semester_id, class_id, attendance_date, lesson_start, lesson_end, created_by)
                  VALUES (?, ?, ?, ?, ?, ?)
                  ON CONFLICT(semester_id, class_id, attendance_date, lesson_start, lesson_end)
                  DO UPDATE SET updated_at = CURRENT_TIMESTAMP`)
        .run(input.semesterId, input.classId, input.date, input.lessonStart, input.lessonEnd, input.userId)
      const session = this.database.db
        .prepare(`SELECT id FROM attendance_sessions WHERE semester_id = ? AND class_id = ?
                  AND attendance_date = ? AND lesson_start = ? AND lesson_end = ?`)
        .get(input.semesterId, input.classId, input.date, input.lessonStart, input.lessonEnd) as { id: number }
      const enrollmentStmt = this.database.db.prepare(
        `SELECT id FROM student_enrollments WHERE academic_year_id = ? AND class_id = ? AND student_id = ?`
      )
      const upsert = this.database.db.prepare(`INSERT INTO attendance_records(attendance_session_id, student_enrollment_id, status, note)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(attendance_session_id, student_enrollment_id)
        DO UPDATE SET status = excluded.status, note = excluded.note`)
      for (const row of input.rows) {
        if (!validStatuses.has(row.status)) throw new Error('Status presensi tidak valid.')
        const enrollment = enrollmentStmt.get(input.academicYearId, input.classId, row.studentId) as { id: number } | undefined
        if (!enrollment) continue
        upsert.run(session.id, enrollment.id, row.status, row.note ?? '')
      }
    })
    transaction()
  }

  getDailyAttendance(input: { semesterId: number; academicYearId: number; date: string }): Array<Record<string, unknown>> {
    return this.database.db
      .prepare(`SELECT c.id AS classId, c.class_name AS className, c.subject_name AS subjectName,
                       ats.id AS sessionId, ats.lesson_start AS lessonStart, ats.lesson_end AS lessonEnd,
                       CASE WHEN ats.id IS NULL THEN 'BELUM' ELSE 'SUDAH' END AS status
                FROM classes c
                LEFT JOIN attendance_sessions ats ON ats.class_id = c.id AND ats.semester_id = ? AND ats.attendance_date = ?
                WHERE c.academic_year_id = ? AND c.is_active = 1
                ORDER BY c.class_name, c.subject_name, ats.lesson_start`)
      .all(input.semesterId, input.date, input.academicYearId) as Array<Record<string, unknown>>
  }

  getAttendanceRecap(input: { semesterId: number; academicYearId: number; classId: number; startDate: string; endDate: string }): Array<Record<string, unknown>> {
    return this.database.db
      .prepare(`SELECT s.id, s.nisn, s.nama_siswa AS namaSiswa,
        SUM(CASE WHEN ats.id IS NOT NULL AND ar.status = 'H' THEN 1 ELSE 0 END) AS hadir,
        SUM(CASE WHEN ats.id IS NOT NULL AND ar.status = 'S' THEN 1 ELSE 0 END) AS sakit,
        SUM(CASE WHEN ats.id IS NOT NULL AND ar.status = 'I' THEN 1 ELSE 0 END) AS izin,
        SUM(CASE WHEN ats.id IS NOT NULL AND ar.status = 'D' THEN 1 ELSE 0 END) AS dispen,
        SUM(CASE WHEN ats.id IS NOT NULL AND ar.status = 'A' THEN 1 ELSE 0 END) AS alpa,
        COUNT(ats.id) AS total,
        CASE WHEN COUNT(ats.id) = 0 THEN 0 ELSE ROUND(
          SUM(CASE WHEN ats.id IS NOT NULL AND ar.status IN ('H', 'D') THEN 1.0 ELSE 0 END)
          / COUNT(ats.id) * 100,
          1
        ) END AS skor
      FROM student_enrollments se
      JOIN students s ON s.id = se.student_id
      LEFT JOIN attendance_records ar ON ar.student_enrollment_id = se.id
      LEFT JOIN attendance_sessions ats ON ats.id = ar.attendance_session_id AND ats.semester_id = ?
        AND ats.attendance_date BETWEEN ? AND ?
      WHERE se.academic_year_id = ? AND se.class_id = ? AND se.status = 'AKTIF'
      GROUP BY s.id ORDER BY s.nama_siswa`)
      .all(input.semesterId, input.startDate, input.endDate, input.academicYearId, input.classId) as Array<Record<string, unknown>>
  }

  async exportAttendanceRecap(input: { semesterId: number; academicYearId: number; classId: number; startDate: string; endDate: string }): Promise<string | null> {
    const recap = this.getAttendanceRecap(input)
    const context = this.database.db
      .prepare(`SELECT c.class_name AS className, c.subject_name AS subjectName,
                       ay.label AS academicYearLabel, s.name AS semesterName
                FROM classes c
                JOIN academic_years ay ON ay.id = c.academic_year_id
                JOIN semesters s ON s.id = ? AND s.academic_year_id = ay.id
                WHERE c.id = ?`)
      .get(input.semesterId, input.classId) as
      | { className: string; subjectName: string; academicYearLabel: string; semesterName: string }
      | undefined
    if (!context) throw new Error('Konteks kelas tidak ditemukan.')

    const result = await dialog.showSaveDialog({
      title: 'Export Rekap Absensi',
      defaultPath: `rekap-absensi-${context.className}-${input.startDate}-${input.endDate}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    if (result.canceled || !result.filePath) return null

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'E-Jurnal Guru'
    const summary = workbook.addWorksheet('Ringkasan')
    summary.columns = [{ width: 26 }, { width: 36 }]
    summary.addRows([
      ['REKAP ABSENSI SISWA', ''],
      ['Mata Pelajaran', context.subjectName],
      ['Kelas', context.className],
      ['Tahun Ajaran', context.academicYearLabel],
      ['Semester', context.semesterName === 'GANJIL' ? 'Ganjil' : 'Genap'],
      ['Periode', `${input.startDate} s.d. ${input.endDate}`],
      ['Jumlah Siswa', recap.length],
      ['Total Hadir', recap.reduce((sum, row) => sum + Number(row.hadir), 0)],
      ['Total Sakit', recap.reduce((sum, row) => sum + Number(row.sakit), 0)],
      ['Total Izin', recap.reduce((sum, row) => sum + Number(row.izin), 0)],
      ['Total Dispen', recap.reduce((sum, row) => sum + Number(row.dispen), 0)],
      ['Total Alpa', recap.reduce((sum, row) => sum + Number(row.alpa), 0)],
      ['Rata-rata Kehadiran', recap.length ? `${(recap.reduce((sum, row) => sum + Number(row.skor), 0) / recap.length).toFixed(1)}%` : '0%'],
      ['Rumus Skor', '(Hadir + Dispen) ÷ Total Pertemuan × 100']
    ])
    summary.getRow(1).font = { bold: true, size: 14 }
    summary.getColumn(1).font = { bold: true }

    const recapSheet = workbook.addWorksheet('Rekap Siswa')
    recapSheet.columns = [
      { header: 'No', key: 'no', width: 8 },
      { header: 'NISN', key: 'nisn', width: 18 },
      { header: 'Nama Siswa', key: 'namaSiswa', width: 34 },
      { header: 'Hadir', key: 'hadir', width: 12 },
      { header: 'Sakit', key: 'sakit', width: 12 },
      { header: 'Izin', key: 'izin', width: 12 },
      { header: 'Dispen', key: 'dispen', width: 12 },
      { header: 'Alpa', key: 'alpa', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Skor Kehadiran (%)', key: 'skor', width: 22 }
    ]
    recap.forEach((row, index) => recapSheet.addRow({ no: index + 1, ...row }))
    recapSheet.getRow(1).font = { bold: true }
    recapSheet.views = [{ state: 'frozen', ySplit: 1 }]
    recapSheet.autoFilter = { from: 'A1', to: 'J1' }

    const detail = workbook.addWorksheet('Detail Harian')
    detail.columns = [
      { header: 'Tanggal', key: 'date', width: 16 },
      { header: 'Jam', key: 'lesson', width: 14 },
      { header: 'NISN', key: 'nisn', width: 18 },
      { header: 'Nama Siswa', key: 'namaSiswa', width: 34 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Catatan', key: 'note', width: 40 }
    ]
    const details = this.database.db
      .prepare(`SELECT ats.attendance_date AS date,
                       ('Jam ' || ats.lesson_start || CASE WHEN ats.lesson_end <> ats.lesson_start THEN '-' || ats.lesson_end ELSE '' END) AS lesson,
                       st.nisn, st.nama_siswa AS namaSiswa,
                       CASE ar.status
                         WHEN 'H' THEN 'Hadir'
                         WHEN 'S' THEN 'Sakit'
                         WHEN 'I' THEN 'Izin'
                         WHEN 'D' THEN 'Dispen'
                         WHEN 'A' THEN 'Alpa'
                         ELSE ar.status
                       END AS status,
                       ar.note
                FROM attendance_sessions ats
                JOIN attendance_records ar ON ar.attendance_session_id = ats.id
                JOIN student_enrollments se ON se.id = ar.student_enrollment_id
                JOIN students st ON st.id = se.student_id
                WHERE ats.semester_id = ? AND ats.class_id = ?
                  AND ats.attendance_date BETWEEN ? AND ?
                ORDER BY ats.attendance_date, ats.lesson_start, st.nama_siswa`)
      .all(input.semesterId, input.classId, input.startDate, input.endDate) as Array<Record<string, unknown>>
    details.forEach((row) => detail.addRow(row))
    detail.getRow(1).font = { bold: true }
    detail.views = [{ state: 'frozen', ySplit: 1 }]
    detail.autoFilter = { from: 'A1', to: 'F1' }

    await workbook.xlsx.writeFile(result.filePath)
    return result.filePath
  }

  getGradeConfig(input: { semesterId: number; classId: number }): { schemeId?: number; groups: SummativeGroup[] } {
    const scheme = this.database.db
      .prepare('SELECT id FROM assessment_schemes WHERE semester_id = ? AND class_id = ?')
      .get(input.semesterId, input.classId) as { id: number } | undefined
    if (!scheme) return { groups: [] }
    const groups = this.database.db
      .prepare(`SELECT id, name, sort_order AS sortOrder FROM summative_groups
                WHERE assessment_scheme_id = ? ORDER BY sort_order`)
      .all(scheme.id) as Array<Omit<SummativeGroup, 'components'>>
    const componentStmt = this.database.db.prepare(`SELECT id, component_type AS type, component_name AS name, sort_order AS sortOrder
      FROM assessment_components WHERE summative_group_id = ? ORDER BY sort_order`)
    return {
      schemeId: scheme.id,
      groups: groups.map((group) => ({ ...group, components: componentStmt.all(group.id) as SummativeGroup['components'] }))
    }
  }

  saveGradeConfig(input: { semesterId: number; classId: number; groups: SummativeGroup[] }): void {
    if (input.groups.length === 0) throw new Error('Minimal harus ada satu sumatif.')
    for (const group of input.groups) {
      if (!group.name.trim() || group.components.length === 0) throw new Error('Setiap sumatif harus memiliki nama dan minimal satu komponen.')
    }
    const transaction = this.database.db.transaction(() => {
      this.database.db
        .prepare(`INSERT INTO assessment_schemes(semester_id, class_id) VALUES (?, ?)
                  ON CONFLICT(semester_id, class_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`)
        .run(input.semesterId, input.classId)
      const scheme = this.database.db
        .prepare('SELECT id FROM assessment_schemes WHERE semester_id = ? AND class_id = ?')
        .get(input.semesterId, input.classId) as { id: number }
      const groupIds: number[] = []
      const componentIds: number[] = []
      input.groups.forEach((group, groupIndex) => {
        let groupId = group.id
        if (groupId) {
          this.database.db
            .prepare(`UPDATE summative_groups SET name = ?, sort_order = ? WHERE id = ? AND assessment_scheme_id = ?`)
            .run(group.name.trim(), groupIndex + 1, groupId, scheme.id)
        } else {
          const result = this.database.db
            .prepare(`INSERT INTO summative_groups(assessment_scheme_id, name, sort_order) VALUES (?, ?, ?)`)
            .run(scheme.id, group.name.trim(), groupIndex + 1)
          groupId = Number(result.lastInsertRowid)
        }
        groupIds.push(groupId)
        group.components.forEach((component, componentIndex) => {
          let componentId = component.id
          if (componentId) {
            this.database.db
              .prepare(`UPDATE assessment_components SET component_type = ?, component_name = ?, sort_order = ?
                        WHERE id = ? AND summative_group_id = ?`)
              .run(component.type, component.name.trim(), componentIndex + 1, componentId, groupId)
          } else {
            const result = this.database.db
              .prepare(`INSERT INTO assessment_components(summative_group_id, component_type, component_name, sort_order)
                        VALUES (?, ?, ?, ?)`)
              .run(groupId, component.type, component.name.trim(), componentIndex + 1)
            componentId = Number(result.lastInsertRowid)
          }
          componentIds.push(componentId)
        })
      })
      if (componentIds.length > 0) {
        const placeholders = componentIds.map(() => '?').join(',')
        this.database.db
          .prepare(`DELETE FROM assessment_components WHERE summative_group_id IN
                    (SELECT id FROM summative_groups WHERE assessment_scheme_id = ?)
                    AND id NOT IN (${placeholders})`)
          .run(scheme.id, ...componentIds)
      }
      if (groupIds.length > 0) {
        const placeholders = groupIds.map(() => '?').join(',')
        this.database.db
          .prepare(`DELETE FROM summative_groups WHERE assessment_scheme_id = ? AND id NOT IN (${placeholders})`)
          .run(scheme.id, ...groupIds)
      }
    })
    transaction()
  }

  getGradeSheet(input: { academicYearId: number; semesterId: number; classId: number }): { groups: SummativeGroup[]; rows: GradeSheetRow[] } {
    const config = this.getGradeConfig(input)
    const students = this.listStudents({ academicYearId: input.academicYearId, classId: input.classId })
    if (!config.schemeId) return { groups: config.groups, rows: students.map((student) => ({ ...student, scores: {}, pas: null, finalScore: null })) }
    const scoreStmt = this.database.db.prepare(`SELECT ac.id AS componentId, ss.score
      FROM student_enrollments se
      JOIN student_scores ss ON ss.student_enrollment_id = se.id
      JOIN assessment_components ac ON ac.id = ss.assessment_component_id
      JOIN summative_groups sg ON sg.id = ac.summative_group_id
      WHERE se.academic_year_id = ? AND se.student_id = ? AND sg.assessment_scheme_id = ?`)
    const pasStmt = this.database.db.prepare(`SELECT ps.score FROM student_enrollments se
      JOIN pas_scores ps ON ps.student_enrollment_id = se.id
      WHERE se.academic_year_id = ? AND se.student_id = ? AND ps.assessment_scheme_id = ?`)
    const rows = students.map((student) => {
      const scoreRows = scoreStmt.all(input.academicYearId, student.id, config.schemeId) as Array<{ componentId: number; score: number }>
      const scores: Record<string, number | null> = {}
      scoreRows.forEach((score) => (scores[String(score.componentId)] = score.score))
      const pas = pasStmt.get(input.academicYearId, student.id, config.schemeId) as { score: number } | undefined
      const finalScore = this.calculateFinal(config.groups, scores, pas?.score ?? null)
      return { ...student, scores, pas: pas?.score ?? null, finalScore }
    })
    return { groups: config.groups, rows }
  }

  saveGradeScores(input: {
    academicYearId: number
    semesterId: number
    classId: number
    rows: Array<{ studentId: number; scores: Record<string, number | null>; pas: number | null }>
  }): void {
    const scheme = this.database.db
      .prepare('SELECT id FROM assessment_schemes WHERE semester_id = ? AND class_id = ?')
      .get(input.semesterId, input.classId) as { id: number } | undefined
    if (!scheme) throw new Error('Atur komponen nilai terlebih dahulu.')
    const transaction = this.database.db.transaction(() => {
      const enrollmentStmt = this.database.db.prepare(
        'SELECT id FROM student_enrollments WHERE academic_year_id = ? AND class_id = ? AND student_id = ?'
      )
      const upsertScore = this.database.db.prepare(`INSERT INTO student_scores(assessment_component_id, student_enrollment_id, score)
        VALUES (?, ?, ?) ON CONFLICT(assessment_component_id, student_enrollment_id) DO UPDATE SET score = excluded.score`)
      const deleteScore = this.database.db.prepare(
        'DELETE FROM student_scores WHERE assessment_component_id = ? AND student_enrollment_id = ?'
      )
      const upsertPas = this.database.db.prepare(`INSERT INTO pas_scores(assessment_scheme_id, student_enrollment_id, score)
        VALUES (?, ?, ?) ON CONFLICT(assessment_scheme_id, student_enrollment_id) DO UPDATE SET score = excluded.score`)
      const deletePas = this.database.db.prepare(
        'DELETE FROM pas_scores WHERE assessment_scheme_id = ? AND student_enrollment_id = ?'
      )
      for (const row of input.rows) {
        const enrollment = enrollmentStmt.get(input.academicYearId, input.classId, row.studentId) as { id: number } | undefined
        if (!enrollment) continue
        for (const [componentId, score] of Object.entries(row.scores)) {
          if (score === null || score === undefined || Number.isNaN(score)) deleteScore.run(Number(componentId), enrollment.id)
          else {
            this.assertScore(score)
            upsertScore.run(Number(componentId), enrollment.id, score)
          }
        }
        if (row.pas === null || row.pas === undefined || Number.isNaN(row.pas)) deletePas.run(scheme.id, enrollment.id)
        else {
          this.assertScore(row.pas)
          upsertPas.run(scheme.id, enrollment.id, row.pas)
        }
      }
    })
    transaction()
  }


  async exportGrades(input: {
    type: GradeExportType
    academicYearId: number
    semesterId: number
    classId: number
  }): Promise<string | null> {
    const context = this.database.db
      .prepare(`SELECT class_name AS className, subject_name AS subjectName
                FROM classes WHERE id = ? AND academic_year_id = ?`)
      .get(input.classId, input.academicYearId) as { className: string; subjectName: string } | undefined
    if (!context) throw new Error('Kelas dan mata pelajaran yang dipilih tidak ditemukan.')

    const templateName = input.type === 'SUMATIF' ? 'Template Sumatif.xlsx' : 'Template PAS.xlsx'
    const templatePath = app.isPackaged
      ? path.join(process.resourcesPath, 'templates', templateName)
      : path.join(app.getAppPath(), 'resources', 'templates', templateName)
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template export tidak ditemukan: ${templateName}`)
    }

    const sheet = this.getGradeSheet(input)
    const workbook = await createGradeExportWorkbook({
      type: input.type,
      templatePath,
      context,
      groups: sheet.groups,
      rows: sheet.rows
    })

    const fileName = buildGradeExportFileName(input.type, context)
    const result = await dialog.showSaveDialog({
      title: input.type === 'SUMATIF' ? 'Export Nilai Sumatif' : 'Export Nilai PAS',
      defaultPath: path.join(app.getPath('documents'), fileName),
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    if (result.canceled || !result.filePath) return null

    await workbook.xlsx.writeFile(result.filePath)
    return result.filePath
  }

  private assertScore(score: number): void {
    if (!Number.isInteger(score) || score < 0 || score > 100) throw new Error('Nilai harus bilangan bulat 0–100.')
  }

  private calculateFinal(groups: SummativeGroup[], scores: Record<string, number | null>, pas: number | null): number | null {
    if (pas === null || groups.length === 0) return null
    const groupAverages: number[] = []
    for (const group of groups) {
      const values = group.components.map((component) => scores[String(component.id)]).filter((v): v is number => v !== null && v !== undefined)
      if (values.length !== group.components.length) return null
      groupAverages.push(values.reduce((sum, value) => sum + value, 0) / values.length)
    }
    const summative = groupAverages.reduce((sum, value) => sum + value, 0) / groupAverages.length
    return Math.round(summative * 0.75 + pas * 0.25)
  }

  listJournals(input: { semesterId: number; classId?: number; search?: string; date?: string }): TeachingJournal[] {
    const params: unknown[] = [input.semesterId]
    let where = 'tj.semester_id = ?'
    if (input.classId) {
      where += ' AND tj.class_id = ?'
      params.push(input.classId)
    }
    if (input.search?.trim()) {
      where += ' AND tj.learning_material LIKE ?'
      params.push(`%${input.search.trim()}%`)
    }
    if (input.date) {
      where += ' AND tj.journal_date = ?'
      params.push(input.date)
    }
    return this.database.db
      .prepare(`SELECT tj.id, tj.semester_id AS semesterId, tj.class_id AS classId,
                       c.class_name AS className, c.subject_name AS subjectName,
                       tj.journal_date AS journalDate, tj.lesson_start AS lessonStart,
                       tj.lesson_end AS lessonEnd, tj.learning_material AS learningMaterial,
                       tj.created_at AS createdAt
                FROM teaching_journals tj JOIN classes c ON c.id = tj.class_id
                WHERE ${where} ORDER BY tj.journal_date DESC, tj.lesson_start DESC`)
      .all(...params) as TeachingJournal[]
  }

  createJournal(input: {
    semesterId: number
    classId: number
    userId: number
    journalDate: string
    lessonStart: number
    lessonEnd: number
    learningMaterial: string
  }): void {
    if (!input.learningMaterial.trim()) throw new Error('Materi pembelajaran wajib diisi.')
    this.database.db
      .prepare(`INSERT INTO teaching_journals(semester_id, class_id, journal_date, lesson_start, lesson_end, learning_material, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(input.semesterId, input.classId, input.journalDate, input.lessonStart, input.lessonEnd, input.learningMaterial.trim(), input.userId)
  }

  updateJournal(input: { id: number; classId: number; journalDate: string; lessonStart: number; lessonEnd: number; learningMaterial: string }): void {
    if (!input.learningMaterial.trim()) throw new Error('Materi pembelajaran wajib diisi.')
    this.database.db
      .prepare(`UPDATE teaching_journals SET class_id = ?, journal_date = ?, lesson_start = ?, lesson_end = ?,
                learning_material = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(input.classId, input.journalDate, input.lessonStart, input.lessonEnd, input.learningMaterial.trim(), input.id)
  }

  deleteJournal(id: number): void {
    this.database.db.prepare('DELETE FROM teaching_journals WHERE id = ?').run(id)
  }

  getMaintenanceInfo(): MaintenanceInfo {
    const count = (table: string): number => {
      const row = this.database.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }
      return row.count
    }
    const lastBackup = this.database.db.prepare("SELECT value FROM app_settings WHERE key = 'last_backup_at'").get() as { value: string } | undefined
    return {
      appVersion: app.getVersion(),
      environment: this.environment,
      databasePath: this.database.dbPath,
      databaseSizeBytes: fs.existsSync(this.database.dbPath) ? fs.statSync(this.database.dbPath).size : 0,
      schemaVersion: this.database.getSchemaVersion(),
      integrityStatus: this.database.integrityCheck(),
      lastBackupAt: lastBackup?.value ?? null,
      counts: {
        guru: count('users') - 1,
        siswa: count('students'),
        kelas: count('classes'),
        presensi: count('attendance_records'),
        nilai: count('student_scores') + count('pas_scores'),
        jurnal: count('teaching_journals')
      }
    }
  }

  async createBackup(): Promise<string | null> {
    const source = this.database.createBackup('manual')
    const result = await dialog.showSaveDialog({
      title: 'Simpan Backup Database',
      defaultPath: path.basename(source),
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    })
    if (result.canceled || !result.filePath) return source
    fs.copyFileSync(source, result.filePath)
    return result.filePath
  }

  async applySqlPatch(): Promise<{ patchId: string; patchName: string; backupPath: string }> {
    const result = await dialog.showOpenDialog({
      title: 'Pilih SQL Patch',
      properties: ['openFile'],
      filters: [{ name: 'SQL Patch', extensions: ['sql', 'ejpatch'] }]
    })
    if (result.canceled || result.filePaths.length === 0) throw new Error('Tidak ada file patch yang dipilih.')
    const filePath = result.filePaths[0]
    const sql = fs.readFileSync(filePath, 'utf8')
    if (!sql.trim()) throw new Error('File patch kosong.')
    const checksum = crypto.createHash('sha256').update(sql).digest('hex')
    const patchId = checksum.slice(0, 16)
    const patchName = path.basename(filePath)
    const existing = this.database.db.prepare('SELECT patch_id FROM applied_patches WHERE patch_id = ?').get(patchId)
    if (existing) throw new Error('Patch ini sudah pernah diterapkan.')
    const backupPath = this.database.createBackup(`pre-patch-${patchId}`)
    const transaction = this.database.db.transaction(() => {
      this.database.db.exec(sql)
      this.database.db
        .prepare(`INSERT INTO applied_patches(patch_id, patch_name, checksum, status) VALUES (?, ?, ?, 'SUCCESS')`)
        .run(patchId, patchName, checksum)
    })
    transaction()
    const integrity = this.database.integrityCheck()
    if (integrity !== 'ok') throw new Error(`Patch diterapkan tetapi integrity check gagal: ${integrity}`)
    return { patchId, patchName, backupPath }
  }
}
