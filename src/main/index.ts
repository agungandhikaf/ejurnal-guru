import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { AppDatabase } from './db/database'
import { AppService } from './services/appService'
import { IPC } from '../shared/channels'
import type { ApiResponse, UpdateStatus } from '../shared/types'

const environment = process.env.APP_ENV === 'prod' ? 'prod' : 'dev'
const productName = environment === 'prod' ? 'E-Jurnal Guru' : 'E-Jurnal Guru Dev'
app.setName(productName)
// Keep dev and production data in stable, explicit folders on every run.
app.setPath('userData', join(app.getPath('appData'), productName))

let mainWindow: BrowserWindow | null = null
let database: AppDatabase
let service: AppService

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    title: productName,
    backgroundColor: '#f8fafc',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function ok<T>(data?: T): ApiResponse<T> {
  return { ok: true, data }
}

function fail(error: unknown): ApiResponse {
  const message = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.'
  return { ok: false, error: message }
}

function handle<TArgs extends unknown[], TResult>(channel: string, fn: (...args: TArgs) => TResult | Promise<TResult>): void {
  ipcMain.handle(channel, async (_event, ...args: TArgs) => {
    try {
      return ok(await fn(...args))
    } catch (error) {
      console.error(`[${channel}]`, error)
      return fail(error)
    }
  })
}

function registerIpc(): void {
  handle(IPC.AUTH_OPTIONS, () => service.getLoginOptions())
  handle(IPC.AUTH_LOGIN, (payload) => service.login(payload as never))
  handle(IPC.ADMIN_TEACHERS_LIST, () => service.listTeachers())
  handle(IPC.ADMIN_TEACHERS_CREATE, (payload) => service.createTeacher(payload as never))
  handle(IPC.ADMIN_TEACHERS_UPDATE, (payload) => service.updateTeacher(payload as never))
  handle(IPC.ADMIN_TEACHERS_TOGGLE, (id) => service.toggleTeacher(Number(id)))
  handle(IPC.ADMIN_YEARS_LIST, () => service.listAcademicYears())
  handle(IPC.ADMIN_YEARS_CREATE, (payload) => service.createAcademicYear(payload as never))
  handle(IPC.ADMIN_CLASSES_LIST, (academicYearId, includeInactive) => service.listClasses(Number(academicYearId), Boolean(includeInactive)))
  handle(IPC.ADMIN_CLASSES_CREATE, (payload) => service.createClass(payload as never))
  handle(IPC.ADMIN_CLASSES_UPDATE, (payload) => service.updateClass(payload as never))
  handle(IPC.ADMIN_CLASSES_TOGGLE, (id) => service.toggleClass(Number(id)))
  handle(IPC.ADMIN_STUDENTS_LIST, (payload) => service.listStudents(payload as never))
  handle(IPC.ADMIN_STUDENTS_CREATE, (payload) => service.createStudent(payload as never))
  handle(IPC.ADMIN_STUDENTS_UPDATE, (payload) => service.updateStudent(payload as never))
  handle(IPC.ADMIN_STUDENTS_DELETE, (payload) => service.deleteStudent(payload as never))
  handle(IPC.ADMIN_STUDENTS_TEMPLATE, () => service.createStudentTemplate())
  handle(IPC.ADMIN_STUDENTS_IMPORT, (payload) => service.importStudents(payload as never))
  handle(IPC.TEACHER_DASHBOARD, (payload) => service.getDashboard(payload as never))
  handle(IPC.TEACHER_CLASSES, (academicYearId) => service.listClasses(Number(academicYearId)))
  handle(IPC.ATTENDANCE_FORM, (payload) => service.getAttendanceForm(payload as never))
  handle(IPC.ATTENDANCE_SAVE, (payload) => service.saveAttendance(payload as never))
  handle(IPC.ATTENDANCE_DAILY, (payload) => service.getDailyAttendance(payload as never))
  handle(IPC.ATTENDANCE_RECAP, (payload) => service.getAttendanceRecap(payload as never))
  handle(IPC.ATTENDANCE_EXPORT, (payload) => service.exportAttendanceRecap(payload as never))
  handle(IPC.GRADES_CONFIG_GET, (payload) => service.getGradeConfig(payload as never))
  handle(IPC.GRADES_CONFIG_SAVE, (payload) => service.saveGradeConfig(payload as never))
  handle(IPC.GRADES_SHEET_GET, (payload) => service.getGradeSheet(payload as never))
  handle(IPC.GRADES_SCORES_SAVE, (payload) => service.saveGradeScores(payload as never))
  handle(IPC.GRADES_EXPORT, (payload) => service.exportGrades(payload as never))
  handle(IPC.JOURNALS_LIST, (payload) => service.listJournals(payload as never))
  handle(IPC.JOURNALS_CREATE, (payload) => service.createJournal(payload as never))
  handle(IPC.JOURNALS_UPDATE, (payload) => service.updateJournal(payload as never))
  handle(IPC.JOURNALS_DELETE, (id) => service.deleteJournal(Number(id)))
  handle(IPC.MAINTENANCE_INFO, () => service.getMaintenanceInfo())
  handle(IPC.MAINTENANCE_BACKUP, () => service.createBackup())
  handle(IPC.MAINTENANCE_OPEN_DATA_FOLDER, () => {
    shell.showItemInFolder(database.dbPath)
    return database.dbPath
  })
  handle(IPC.MAINTENANCE_SQL_PATCH, () => service.applySqlPatch())
  handle(IPC.UPDATER_CHECK, async () => {
    if (environment !== 'prod' || is.dev) throw new Error('Pemeriksaan update hanya aktif pada build production.')
    await autoUpdater.checkForUpdates()
  })
  handle(IPC.UPDATER_DOWNLOAD, async () => {
    if (environment !== 'prod' || is.dev) throw new Error('Unduhan update hanya aktif pada build production.')
    await autoUpdater.downloadUpdate()
  })
  handle(IPC.UPDATER_INSTALL, () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

function sendUpdate(status: UpdateStatus): void {
  mainWindow?.webContents.send(IPC.UPDATER_STATUS, status)
}

function configureUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => sendUpdate({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => sendUpdate({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => sendUpdate({ state: 'not-available' }))
  autoUpdater.on('download-progress', (progress) =>
    sendUpdate({ state: 'downloading', percent: Math.round(progress.percent) })
  )
  autoUpdater.on('update-downloaded', (info) => sendUpdate({ state: 'downloaded', version: info.version }))
  autoUpdater.on('error', (error) => sendUpdate({ state: 'error', message: error.message }))
}

app.whenReady().then(() => {
  try {
    electronApp.setAppUserModelId(environment === 'prod' ? 'com.ejurnal.guru' : 'com.ejurnal.guru.dev')
    app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
    console.info(`[E-Jurnal] environment=${environment}`)
    console.info(`[E-Jurnal] userData=${app.getPath('userData')}`)
    database = new AppDatabase(app.getPath('userData'))
    console.info(`[E-Jurnal] database=${database.dbPath}`)
    service = new AppService(database, environment)
    registerIpc()
    configureUpdater()
    createWindow()

    if (environment === 'prod' && !is.dev) {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch((error) => console.error('Auto update check failed:', error))
      }, 15000)
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Application startup failed:', error)
    dialog.showErrorBox(
      'E-Jurnal Guru gagal dimulai',
      `Aplikasi tidak dapat menyiapkan database.\n\n${message}\n\nSilakan kirim pesan ini kepada admin/developer.`
    )
    app.quit()
  }
})

app.on('before-quit', () => {
  try {
    database?.createBackup('auto-exit')
  } catch (error) {
    console.error('Automatic backup failed:', error)
  }
  database?.close()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
