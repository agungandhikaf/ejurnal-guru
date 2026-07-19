export type Role = 'ADMIN' | 'GURU'
export type SemesterName = 'GANJIL' | 'GENAP'
export type AttendanceStatus = 'H' | 'S' | 'I' | 'D' | 'A'
export type GradeExportType = 'SUMATIF' | 'PAS'
export type ComponentType = 'TGS' | 'UH'

export interface LoginSession {
  userId: number
  username: string
  namaGuru: string
  jabatan: string
  role: Role
  academicYearId?: number
  academicYearLabel?: string
  semesterId?: number
  semesterName?: SemesterName
}

export interface AcademicYear {
  id: number
  label: string
  startYear: number
  endYear: number
  isActive: number
}

export interface Semester {
  id: number
  academicYearId: number
  name: SemesterName
  isActive: number
}

export interface Teacher {
  id: number
  username: string
  namaGuru: string
  jabatan: string
  isActive: number
  createdAt: string
}

export interface SchoolClass {
  id: number
  academicYearId: number
  className: string
  subjectName: string
  isActive: number
}

export interface Student {
  id: number
  nisn: string
  namaSiswa: string
  namaPanggilan?: string
  jenisKelamin: 'L' | 'P'
  classId?: number
  className?: string
}

export interface StudentImportIssue {
  rowNumber: number
  nisn: string
  reason: string
}

export interface StudentImportResult {
  inserted: number
  updated: number
  skipped: number
  issues: StudentImportIssue[]
  canceled: boolean
}

export interface AttendanceRow extends Student {
  status: AttendanceStatus
  note: string
}

export interface SummativeComponent {
  id?: number
  type: ComponentType
  name: string
  sortOrder: number
}

export interface SummativeGroup {
  id?: number
  name: string
  sortOrder: number
  components: SummativeComponent[]
}

export interface GradeSheetRow extends Student {
  scores: Record<string, number | null>
  pas: number | null
  finalScore: number | null
}

export interface TeachingJournal {
  id: number
  scheduleId?: number
  semesterId: number
  classId: number
  className: string
  subjectName: string
  journalDate: string
  lessonStart: number
  lessonEnd: number
  learningMaterial: string
  createdAt: string
}

export interface TeachingSchedule {
  id: number
  userId: number
  semesterId: number
  dayOfWeek: number
  classId: number
  className: string
  subjectName: string
  lessonStart: number
  lessonEnd: number
  isActive: number
}

export interface DashboardData {
  totalClasses: number
  totalStudents: number
  attendanceToday: number
  totalJournals: number
  classes: Array<{ id: number; className: string; subjectName: string; studentCount: number }>
}

export interface MaintenanceInfo {
  appVersion: string
  environment: string
  databasePath: string
  databaseSizeBytes: number
  schemaVersion: number
  integrityStatus: string
  lastBackupAt: string | null
  counts: Record<string, number>
}

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  message?: string
}

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}
