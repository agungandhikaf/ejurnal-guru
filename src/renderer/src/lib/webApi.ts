import { IPC } from '@shared/channels'
import type { ApiResponse, UpdateStatus } from '@shared/types'
import type { DesktopApi } from '../../../preload'

const headers = { 'Content-Type': 'application/json', 'X-EJurnal-Request': '1' }

async function invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`/api/invoke/${encodeURIComponent(channel)}`, {
      method: 'POST', credentials: 'same-origin', headers, body: JSON.stringify({ args })
    })
    return await response.json() as ApiResponse<T>
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Server tidak dapat dihubungi.' }
  }
}

function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function download(channel: string, fileName: string, ...args: unknown[]): Promise<ApiResponse<string | null>> {
  try {
    const response = await fetch(`/api/download/${encodeURIComponent(channel)}`, {
      method: 'POST', credentials: 'same-origin', headers, body: JSON.stringify({ args })
    })
    if (!response.ok) return await response.json() as ApiResponse<string | null>
    const disposition = response.headers.get('Content-Disposition') ?? ''
    const serverName = disposition.match(/filename="([^"]+)"/)?.[1]
    const resolvedName = serverName || fileName
    saveBlob(await response.blob(), resolvedName)
    return { ok: true, data: resolvedName }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'File gagal diunduh.' }
  }
}

function chooseFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.addEventListener('cancel', () => resolve(null), { once: true })
    input.click()
  })
}

async function upload<T>(channel: string, accept: string, payload: unknown): Promise<ApiResponse<T>> {
  const file = await chooseFile(accept)
  if (!file) return { ok: true, data: { canceled: true, inserted: 0, updated: 0, skipped: 0, issues: [] } as T }
  try {
    const body = new FormData()
    body.append('payload', JSON.stringify(payload ?? {}))
    body.append('file', file)
    const response = await fetch(`/api/upload/${encodeURIComponent(channel)}`, {
      method: 'POST', credentials: 'same-origin', headers: { 'X-EJurnal-Request': '1' }, body
    })
    return await response.json() as ApiResponse<T>
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'File gagal diunggah.' }
  }
}

const webApi = {
  auth: {
    options: () => invoke(IPC.AUTH_OPTIONS),
    login: (payload: unknown) => invoke(IPC.AUTH_LOGIN, payload),
    logout: () => invoke(IPC.AUTH_LOGOUT),
    session: () => invoke(IPC.AUTH_SESSION)
  },
  admin: {
    listTeachers: () => invoke(IPC.ADMIN_TEACHERS_LIST),
    createTeacher: (payload: unknown) => invoke(IPC.ADMIN_TEACHERS_CREATE, payload),
    updateTeacher: (payload: unknown) => invoke(IPC.ADMIN_TEACHERS_UPDATE, payload),
    toggleTeacher: (id: number) => invoke(IPC.ADMIN_TEACHERS_TOGGLE, id),
    listYears: () => invoke(IPC.ADMIN_YEARS_LIST),
    createYear: (payload: unknown) => invoke(IPC.ADMIN_YEARS_CREATE, payload),
    listClasses: (academicYearId: number, includeInactive = false) => invoke(IPC.ADMIN_CLASSES_LIST, academicYearId, includeInactive),
    createClass: (payload: unknown) => invoke(IPC.ADMIN_CLASSES_CREATE, payload),
    updateClass: (payload: unknown) => invoke(IPC.ADMIN_CLASSES_UPDATE, payload),
    toggleClass: (id: number) => invoke(IPC.ADMIN_CLASSES_TOGGLE, id),
    listStudents: (payload: unknown) => invoke(IPC.ADMIN_STUDENTS_LIST, payload),
    createStudent: (payload: unknown) => invoke(IPC.ADMIN_STUDENTS_CREATE, payload),
    updateStudent: (payload: unknown) => invoke(IPC.ADMIN_STUDENTS_UPDATE, payload),
    deleteStudent: (payload: unknown) => invoke(IPC.ADMIN_STUDENTS_DELETE, payload),
    createStudentTemplate: () => download(IPC.ADMIN_STUDENTS_TEMPLATE, 'template-import-siswa.xlsx'),
    importStudents: (payload: unknown) => upload(IPC.ADMIN_STUDENTS_IMPORT, '.xlsx', payload)
  },
  teacher: {
    dashboard: (payload: unknown) => invoke(IPC.TEACHER_DASHBOARD, payload),
    classes: (academicYearId: number) => invoke(IPC.TEACHER_CLASSES, academicYearId)
  },
  attendance: {
    form: (payload: unknown) => invoke(IPC.ATTENDANCE_FORM, payload),
    save: (payload: unknown) => invoke(IPC.ATTENDANCE_SAVE, payload),
    daily: (payload: unknown) => invoke(IPC.ATTENDANCE_DAILY, payload),
    recap: (payload: unknown) => invoke(IPC.ATTENDANCE_RECAP, payload),
    exportRecap: (payload: unknown) => download(IPC.ATTENDANCE_EXPORT, 'rekap-absensi.xlsx', payload)
  },
  grades: {
    getConfig: (payload: unknown) => invoke(IPC.GRADES_CONFIG_GET, payload),
    saveConfig: (payload: unknown) => invoke(IPC.GRADES_CONFIG_SAVE, payload),
    getSheet: (payload: unknown) => invoke(IPC.GRADES_SHEET_GET, payload),
    saveScores: (payload: unknown) => invoke(IPC.GRADES_SCORES_SAVE, payload),
    export: (payload: unknown) => download(IPC.GRADES_EXPORT, 'rekap-nilai.xlsx', payload)
  },
  journals: {
    list: (payload: unknown) => invoke(IPC.JOURNALS_LIST, payload),
    create: (payload: unknown) => invoke(IPC.JOURNALS_CREATE, payload),
    update: (payload: unknown) => invoke(IPC.JOURNALS_UPDATE, payload),
    delete: (id: number) => invoke(IPC.JOURNALS_DELETE, id)
  },
  maintenance: {
    info: () => invoke(IPC.MAINTENANCE_INFO),
    backup: () => download(IPC.MAINTENANCE_BACKUP, 'ejurnal-backup.db'),
    openDataFolder: () => invoke(IPC.MAINTENANCE_OPEN_DATA_FOLDER),
    applySqlPatch: () => upload(IPC.MAINTENANCE_SQL_PATCH, '.sql,.ejpatch', {})
  },
  updater: {
    check: () => invoke(IPC.UPDATER_CHECK),
    download: () => invoke(IPC.UPDATER_DOWNLOAD),
    install: () => invoke(IPC.UPDATER_INSTALL),
    onStatus: (_callback: (status: UpdateStatus) => void) => () => undefined
  }
} satisfies DesktopApi

export function installWebApi(): void {
  if (!window.api) window.api = webApi
}
