import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/channels'
import type { ApiResponse, UpdateStatus } from '../shared/types'

const invoke = <T = unknown>(channel: string, ...args: unknown[]): Promise<ApiResponse<T>> =>
  ipcRenderer.invoke(channel, ...args)

const api = {
  auth: {
    options: () => invoke(IPC.AUTH_OPTIONS),
    login: (payload: unknown) => invoke(IPC.AUTH_LOGIN, payload)
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
    createStudentTemplate: () => invoke(IPC.ADMIN_STUDENTS_TEMPLATE),
    importStudents: (payload: unknown) => invoke(IPC.ADMIN_STUDENTS_IMPORT, payload)
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
    exportRecap: (payload: unknown) => invoke(IPC.ATTENDANCE_EXPORT, payload)
  },
  grades: {
    getConfig: (payload: unknown) => invoke(IPC.GRADES_CONFIG_GET, payload),
    saveConfig: (payload: unknown) => invoke(IPC.GRADES_CONFIG_SAVE, payload),
    getSheet: (payload: unknown) => invoke(IPC.GRADES_SHEET_GET, payload),
    saveScores: (payload: unknown) => invoke(IPC.GRADES_SCORES_SAVE, payload),
    export: (payload: unknown) => invoke(IPC.GRADES_EXPORT, payload)
  },
  journals: {
    list: (payload: unknown) => invoke(IPC.JOURNALS_LIST, payload),
    create: (payload: unknown) => invoke(IPC.JOURNALS_CREATE, payload),
    update: (payload: unknown) => invoke(IPC.JOURNALS_UPDATE, payload),
    delete: (id: number) => invoke(IPC.JOURNALS_DELETE, id)
  },
  maintenance: {
    info: () => invoke(IPC.MAINTENANCE_INFO),
    backup: () => invoke(IPC.MAINTENANCE_BACKUP),
    openDataFolder: () => invoke(IPC.MAINTENANCE_OPEN_DATA_FOLDER),
    applySqlPatch: () => invoke(IPC.MAINTENANCE_SQL_PATCH)
  },
  updater: {
    check: () => invoke(IPC.UPDATER_CHECK),
    download: () => invoke(IPC.UPDATER_DOWNLOAD),
    install: () => invoke(IPC.UPDATER_INSTALL),
    onStatus: (callback: (status: UpdateStatus) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: UpdateStatus): void => callback(status)
      ipcRenderer.on(IPC.UPDATER_STATUS, handler)
      return () => { ipcRenderer.removeListener(IPC.UPDATER_STATUS, handler) }
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
export type DesktopApi = typeof api
