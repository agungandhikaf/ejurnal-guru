import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { AppDatabase } from '../main/db/database'
import { AppService } from '../main/services/appService'
import { IPC } from '../shared/channels'
import type { ApiResponse, LoginSession } from '../shared/types'

type InvokeBody = { args?: unknown[] }
type SessionRecord = { value: LoginSession; expiresAt: number }

const rootDir = path.resolve(process.env.EJURNAL_ROOT_DIR || process.cwd())
const dataRoot = path.resolve(process.env.EJURNAL_DATA_DIR || path.join(rootDir, 'web-data'))
const publicDir = path.resolve(process.env.EJURNAL_PUBLIC_DIR || path.join(rootDir, 'dist-web'))
const templatesDir = path.join(rootDir, 'resources', 'templates')
const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '127.0.0.1'
const sessionTtlMs = 12 * 60 * 60 * 1000
const cookieName = 'ejurnal_session'
const adminCode = process.env.EJURNAL_ADMIN_CODE

if (!adminCode || adminCode.length < 8) {
  throw new Error('EJURNAL_ADMIN_CODE wajib diisi dan minimal 8 karakter sebelum server web dijalankan.')
}

fs.mkdirSync(dataRoot, { recursive: true })
const importedDatabase = process.env.EJURNAL_IMPORT_DB
const databaseTarget = path.join(dataRoot, 'data', 'ejurnal.db')
if (importedDatabase && !fs.existsSync(databaseTarget)) {
  if (!fs.existsSync(importedDatabase)) throw new Error(`Database sumber tidak ditemukan: ${importedDatabase}`)
  fs.mkdirSync(path.dirname(databaseTarget), { recursive: true })
  fs.copyFileSync(importedDatabase, databaseTarget)
}
const database = new AppDatabase(dataRoot)
database.setAdminCode(adminCode)
const service = new AppService(database, 'web', process.env.npm_package_version || '1.0.0', templatesDir)
const sessions = new Map<string, SessionRecord>()
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

const app = Fastify({ logger: true, trustProxy: true, bodyLimit: 2 * 1024 * 1024 })
async function start(): Promise<void> {
await app.register(fastifyMultipart, { limits: { files: 1, fileSize: 10 * 1024 * 1024 } })

function apiOk<T>(data?: T): ApiResponse<T> {
  return { ok: true, data }
}

function apiFail(error: unknown): ApiResponse {
  return { ok: false, error: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.' }
}

function parseCookies(header?: string): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(header.split(';').map((part) => {
    const index = part.indexOf('=')
    return index < 0 ? [part.trim(), ''] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))]
  }))
}

function getSession(request: FastifyRequest): { id: string; record: SessionRecord } | null {
  const id = parseCookies(request.headers.cookie)[cookieName]
  if (!id) return null
  const record = sessions.get(id)
  if (!record || record.expiresAt <= Date.now()) {
    sessions.delete(id)
    return null
  }
  record.expiresAt = Date.now() + sessionTtlMs
  return { id, record }
}

function setSessionCookie(request: FastifyRequest, reply: FastifyReply, id: string): void {
  const secure = request.protocol === 'https'
  reply.header('Set-Cookie', `${cookieName}=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionTtlMs / 1000}${secure ? '; Secure' : ''}`)
}

function clearSessionCookie(request: FastifyRequest, reply: FastifyReply): void {
  const secure = request.protocol === 'https'
  reply.header('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`)
}

const publicChannels = new Set<string>([IPC.AUTH_OPTIONS, IPC.AUTH_LOGIN, IPC.AUTH_LOGOUT, IPC.AUTH_SESSION])
const adminChannels = new Set<string>([
  IPC.ADMIN_TEACHERS_LIST, IPC.ADMIN_TEACHERS_CREATE, IPC.ADMIN_TEACHERS_UPDATE, IPC.ADMIN_TEACHERS_TOGGLE,
  IPC.ADMIN_YEARS_LIST, IPC.ADMIN_YEARS_CREATE, IPC.ADMIN_CLASSES_LIST, IPC.ADMIN_CLASSES_CREATE,
  IPC.ADMIN_CLASSES_UPDATE, IPC.ADMIN_CLASSES_TOGGLE, IPC.MAINTENANCE_INFO, IPC.MAINTENANCE_BACKUP,
  IPC.MAINTENANCE_OPEN_DATA_FOLDER, IPC.MAINTENANCE_SQL_PATCH
])

function authorize(request: FastifyRequest, channel: string): LoginSession | null {
  if (publicChannels.has(channel)) return getSession(request)?.record.value ?? null
  const session = getSession(request)?.record.value
  if (!session) throw new Error('Sesi berakhir. Silakan login kembali.')
  if (adminChannels.has(channel) && session.role !== 'ADMIN') throw new Error('Akses administrator diperlukan.')
  return session
}

function withTrustedContext(value: unknown, session: LoginSession | null): unknown {
  if (!session || !value || typeof value !== 'object' || Array.isArray(value)) return value
  const payload: Record<string, unknown> = { ...(value as Record<string, unknown>), userId: session.userId }
  if (session.role === 'GURU') {
    payload.academicYearId = session.academicYearId
    payload.semesterId = session.semesterId
  }
  return payload
}

function checkLoginRateLimit(request: FastifyRequest): void {
  const key = request.ip
  const now = Date.now()
  const current = loginAttempts.get(key)
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 })
    return
  }
  if (current.count >= 20) throw new Error('Terlalu banyak percobaan login. Coba lagi beberapa menit.')
  current.count += 1
}

async function invoke(channel: string, args: unknown[], request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
  const session = authorize(request, channel)
  const payload = withTrustedContext(args[0], session)
  switch (channel) {
    case IPC.AUTH_OPTIONS: return service.getLoginOptions()
    case IPC.AUTH_LOGIN: {
      checkLoginRateLimit(request)
      const value = service.login(payload as never)
      const id = crypto.randomBytes(32).toString('base64url')
      sessions.set(id, { value, expiresAt: Date.now() + sessionTtlMs })
      loginAttempts.delete(request.ip)
      setSessionCookie(request, reply, id)
      return value
    }
    case IPC.AUTH_LOGOUT: {
      const current = getSession(request)
      if (current) sessions.delete(current.id)
      clearSessionCookie(request, reply)
      return undefined
    }
    case IPC.AUTH_SESSION: return session
    case IPC.ADMIN_TEACHERS_LIST: return service.listTeachers()
    case IPC.ADMIN_TEACHERS_CREATE: return service.createTeacher(payload as never)
    case IPC.ADMIN_TEACHERS_UPDATE: return service.updateTeacher(payload as never)
    case IPC.ADMIN_TEACHERS_TOGGLE: return service.toggleTeacher(Number(args[0]))
    case IPC.ADMIN_YEARS_LIST: return service.listAcademicYears()
    case IPC.ADMIN_YEARS_CREATE: return service.createAcademicYear(payload as never)
    case IPC.ADMIN_CLASSES_LIST: return service.listClasses(Number(args[0]), Boolean(args[1]))
    case IPC.ADMIN_CLASSES_CREATE: return service.createClass(payload as never)
    case IPC.ADMIN_CLASSES_UPDATE: return service.updateClass(payload as never)
    case IPC.ADMIN_CLASSES_TOGGLE: return service.toggleClass(Number(args[0]))
    case IPC.ADMIN_STUDENTS_LIST: return service.listStudents(payload as never)
    case IPC.ADMIN_STUDENTS_CREATE: return service.createStudent(payload as never)
    case IPC.ADMIN_STUDENTS_UPDATE: return service.updateStudent(payload as never)
    case IPC.ADMIN_STUDENTS_DELETE: return service.deleteStudent(payload as never)
    case IPC.TEACHER_DASHBOARD: return service.getDashboard(payload as never)
    case IPC.TEACHER_CLASSES: return service.listClasses(session?.role === 'GURU' ? Number(session.academicYearId) : Number(args[0]))
    case IPC.ATTENDANCE_FORM: return service.getAttendanceForm(payload as never)
    case IPC.ATTENDANCE_SAVE: return service.saveAttendance(payload as never)
    case IPC.ATTENDANCE_DAILY: return service.getDailyAttendance(payload as never)
    case IPC.ATTENDANCE_RECAP: return service.getAttendanceRecap(payload as never)
    case IPC.GRADES_CONFIG_GET: return service.getGradeConfig(payload as never)
    case IPC.GRADES_CONFIG_SAVE: return service.saveGradeConfig(payload as never)
    case IPC.GRADES_SHEET_GET: return service.getGradeSheet(payload as never)
    case IPC.GRADES_SCORES_SAVE: return service.saveGradeScores(payload as never)
    case IPC.JOURNALS_LIST: return service.listJournals(payload as never)
    case IPC.JOURNALS_CREATE: return service.createJournal(payload as never)
    case IPC.JOURNALS_UPDATE: return service.updateJournal(payload as never)
    case IPC.JOURNALS_DELETE: return service.deleteJournal(Number(args[0]))
    case IPC.MAINTENANCE_INFO: return service.getMaintenanceInfo()
    case IPC.MAINTENANCE_OPEN_DATA_FOLDER: throw new Error('Folder data hanya dapat dibuka langsung dari laptop server.')
    case IPC.UPDATER_CHECK: throw new Error('Versi web diperbarui oleh administrator server.')
    case IPC.UPDATER_DOWNLOAD:
    case IPC.UPDATER_INSTALL: return undefined
    default: throw new Error('Operasi API tidak dikenal.')
  }
}

app.post<{ Params: { channel: string }; Body: InvokeBody }>('/api/invoke/:channel', async (request, reply) => {
  if (request.headers['x-ejurnal-request'] !== '1') return reply.code(403).send(apiFail(new Error('Permintaan ditolak.')))
  try {
    return apiOk(await invoke(request.params.channel, request.body?.args ?? [], request, reply))
  } catch (error) {
    request.log.warn({ error, channel: request.params.channel }, 'API request failed')
    return reply.code(error instanceof Error && error.message.includes('Sesi berakhir') ? 401 : 400).send(apiFail(error))
  }
})

app.post<{ Params: { channel: string }; Body: InvokeBody }>('/api/download/:channel', async (request, reply) => {
  if (request.headers['x-ejurnal-request'] !== '1') return reply.code(403).send(apiFail(new Error('Permintaan ditolak.')))
  try {
    const session = authorize(request, request.params.channel)
    const payload = withTrustedContext(request.body?.args?.[0], session)
    let fileName: string
    let data: Buffer
    if (request.params.channel === IPC.ADMIN_STUDENTS_TEMPLATE) {
      authorize(request, IPC.ADMIN_STUDENTS_LIST)
      fileName = 'template-import-siswa.xlsx'
      data = await service.createStudentTemplate()
    } else if (request.params.channel === IPC.ATTENDANCE_EXPORT) {
      ;({ fileName, data } = await service.exportAttendanceRecap(payload as never))
    } else if (request.params.channel === IPC.GRADES_EXPORT) {
      ;({ fileName, data } = await service.exportGrades(payload as never))
    } else if (request.params.channel === IPC.MAINTENANCE_BACKUP) {
      authorize(request, IPC.MAINTENANCE_BACKUP)
      const filePath = service.createBackup()
      fileName = path.basename(filePath)
      data = fs.readFileSync(filePath)
    } else {
      throw new Error('Operasi download tidak dikenal.')
    }
    reply.header('Content-Type', 'application/octet-stream')
    reply.header('Content-Disposition', `attachment; filename="${fileName.replace(/[^a-zA-Z0-9._-]/g, '-')}"`)
    return reply.send(data)
  } catch (error) {
    return reply.code(400).send(apiFail(error))
  }
})

app.post<{ Params: { channel: string } }>('/api/upload/:channel', async (request, reply) => {
  if (request.headers['x-ejurnal-request'] !== '1') return reply.code(403).send(apiFail(new Error('Permintaan ditolak.')))
  try {
    const session = authorize(request, request.params.channel)
    const part = await request.file()
    if (!part) throw new Error('File belum dipilih.')
    const fields = part.fields as Record<string, { value?: unknown }>
    const payload = JSON.parse(String(fields.payload?.value || '{}')) as Record<string, unknown>
    const file = await part.toBuffer()
    if (request.params.channel === IPC.ADMIN_STUDENTS_IMPORT) {
      return apiOk(await service.importStudents({ ...(withTrustedContext(payload, session) as object), file } as never))
    }
    if (request.params.channel === IPC.MAINTENANCE_SQL_PATCH) {
      authorize(request, IPC.MAINTENANCE_SQL_PATCH)
      return apiOk(service.applySqlPatch({ sql: file.toString('utf8'), patchName: part.filename }))
    }
    throw new Error('Operasi upload tidak dikenal.')
  } catch (error) {
    return reply.code(400).send(apiFail(error))
  }
})

app.get('/api/health', async () => ({ ok: true, data: { status: 'ready' } }))

if (!fs.existsSync(path.join(publicDir, 'index.html'))) {
  throw new Error(`Frontend web belum dibangun. Jalankan npm run build:web terlebih dahulu (${publicDir}).`)
}
await app.register(fastifyStatic, { root: publicDir, wildcard: false })
app.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api/')) return reply.code(404).send(apiFail(new Error('Endpoint tidak ditemukan.')))
  return reply.sendFile('index.html')
})

const cleanup = (): void => {
  database.close()
}
process.once('SIGINT', () => { cleanup(); process.exit(0) })
process.once('SIGTERM', () => { cleanup(); process.exit(0) })

await app.listen({ port, host })
}

void start().catch((error) => {
  app.log.error(error)
  database.close()
  process.exitCode = 1
})
