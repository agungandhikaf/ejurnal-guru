export interface Migration {
  version: number
  name: string
  sql: string
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        code_hash TEXT NOT NULL,
        nama_guru TEXT NOT NULL,
        jabatan TEXT NOT NULL DEFAULT 'Guru',
        role TEXT NOT NULL CHECK(role IN ('ADMIN','GURU')),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS academic_years (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL UNIQUE,
        start_year INTEGER NOT NULL,
        end_year INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS semesters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        academic_year_id INTEGER NOT NULL,
        name TEXT NOT NULL CHECK(name IN ('GANJIL','GENAP')),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(academic_year_id, name),
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        academic_year_id INTEGER NOT NULL,
        class_name TEXT NOT NULL,
        subject_name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(academic_year_id, class_name, subject_name),
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nisn TEXT NOT NULL UNIQUE,
        nama_siswa TEXT NOT NULL,
        jenis_kelamin TEXT NOT NULL CHECK(jenis_kelamin IN ('L','P')),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS student_enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        academic_year_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'AKTIF',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(academic_year_id, student_id, class_id),
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        semester_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        attendance_date TEXT NOT NULL,
        lesson_start INTEGER NOT NULL,
        lesson_end INTEGER NOT NULL,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(semester_id, class_id, attendance_date, lesson_start, lesson_end),
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS attendance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attendance_session_id INTEGER NOT NULL,
        student_enrollment_id INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('H','S','I','D','A')),
        note TEXT NOT NULL DEFAULT '',
        UNIQUE(attendance_session_id, student_enrollment_id),
        FOREIGN KEY (attendance_session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (student_enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS assessment_schemes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        semester_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        name TEXT NOT NULL DEFAULT 'Skema Nilai',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(semester_id, class_id),
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS summative_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_scheme_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        FOREIGN KEY (assessment_scheme_id) REFERENCES assessment_schemes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS assessment_components (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        summative_group_id INTEGER NOT NULL,
        component_type TEXT NOT NULL CHECK(component_type IN ('TGS','UH')),
        component_name TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        FOREIGN KEY (summative_group_id) REFERENCES summative_groups(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS student_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_component_id INTEGER NOT NULL,
        student_enrollment_id INTEGER NOT NULL,
        score INTEGER CHECK(score BETWEEN 0 AND 100),
        UNIQUE(assessment_component_id, student_enrollment_id),
        FOREIGN KEY (assessment_component_id) REFERENCES assessment_components(id) ON DELETE CASCADE,
        FOREIGN KEY (student_enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS pas_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_scheme_id INTEGER NOT NULL,
        student_enrollment_id INTEGER NOT NULL,
        score INTEGER CHECK(score BETWEEN 0 AND 100),
        UNIQUE(assessment_scheme_id, student_enrollment_id),
        FOREIGN KEY (assessment_scheme_id) REFERENCES assessment_schemes(id) ON DELETE CASCADE,
        FOREIGN KEY (student_enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS teaching_journals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        semester_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        journal_date TEXT NOT NULL,
        lesson_start INTEGER NOT NULL,
        lesson_end INTEGER NOT NULL,
        learning_material TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS applied_patches (
        patch_id TEXT PRIMARY KEY,
        patch_name TEXT NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_enrollment_year_class ON student_enrollments(academic_year_id, class_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_semester_date ON attendance_sessions(semester_id, attendance_date);
      CREATE INDEX IF NOT EXISTS idx_journal_semester_date ON teaching_journals(semester_id, journal_date);
    `
  },
  {
    version: 2,
    name: 'academic_year_label_uses_start_year',
    sql: `
      UPDATE academic_years
      SET label = CAST(start_year AS TEXT)
      WHERE label <> CAST(start_year AS TEXT);
    `
  },
  {
    version: 3,
    name: 'restore_academic_year_range_label',
    sql: `
      UPDATE academic_years
      SET label = CAST(start_year AS TEXT) || '/' || CAST(end_year AS TEXT)
      WHERE label <> (CAST(start_year AS TEXT) || '/' || CAST(end_year AS TEXT));
    `
  },
  {
    version: 4,
    name: 'add_dispensation_attendance_status',
    sql: `
      CREATE TABLE attendance_records_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attendance_session_id INTEGER NOT NULL,
        student_enrollment_id INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('H','S','I','D','A')),
        note TEXT NOT NULL DEFAULT '',
        UNIQUE(attendance_session_id, student_enrollment_id),
        FOREIGN KEY (attendance_session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (student_enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE
      );

      INSERT INTO attendance_records_new(
        id,
        attendance_session_id,
        student_enrollment_id,
        status,
        note
      )
      SELECT
        id,
        attendance_session_id,
        student_enrollment_id,
        status,
        note
      FROM attendance_records;

      DROP TABLE attendance_records;
      ALTER TABLE attendance_records_new RENAME TO attendance_records;
    `
  }
]
