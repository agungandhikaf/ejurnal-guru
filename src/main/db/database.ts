import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { migrations } from './migrations'

export class AppDatabase {
  readonly db: Database.Database
  readonly dbPath: string
  readonly backupDir: string

  constructor(userDataPath: string) {
    const dataDir = path.join(userDataPath, 'data')
    this.backupDir = path.join(userDataPath, 'backups')
    fs.mkdirSync(dataDir, { recursive: true })
    fs.mkdirSync(this.backupDir, { recursive: true })
    this.dbPath = path.join(dataDir, 'ejurnal.db')
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('busy_timeout = 5000')
    this.runMigrations()
    this.seedAdmin()
  }

  private tableExists(tableName: string): boolean {
    const row = this.db
      .prepare(`SELECT 1
                FROM sqlite_master
                WHERE type = 'table' AND name = ?
                LIMIT 1`)
      .get(tableName)

    return Boolean(row)
  }

  private hasApplicationTables(): boolean {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS count
                FROM sqlite_master
                WHERE type = 'table'
                  AND name NOT LIKE 'sqlite_%'
                  AND name <> 'schema_migrations'`)
      .get() as { count: number }

    return row.count > 0
  }

  private runMigrations(): void {
    this.db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)

    const current = this.db
      .prepare('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations')
      .get() as { version: number }

    const pending = migrations.filter((migration) => migration.version > current.version)
    if (pending.length === 0) return

    // Database baru memang sudah mempunyai header SQLite dan tabel
    // schema_migrations. Itu belum berarti ada data lama yang perlu dibackup.
    // Backup pra-migrasi hanya dibuat ketika database benar-benar sudah
    // mempunyai schema/data aplikasi.
    if (current.version > 0 || this.hasApplicationTables()) {
      this.createBackup(`pre-migration-v${pending[0].version}`)
    }

    const apply = this.db.transaction(() => {
      for (const migration of pending) {
        this.db.exec(migration.sql)
        this.db
          .prepare('INSERT INTO schema_migrations(version, name) VALUES (?, ?)')
          .run(migration.version, migration.name)
      }
    })

    apply()
  }

  private seedAdmin(): void {
    const existing = this.db.prepare('SELECT id FROM users WHERE username = ?').get('root')
    if (existing) return

    const hash = bcrypt.hashSync('0102', 12)
    this.db
      .prepare(`INSERT INTO users(username, code_hash, nama_guru, jabatan, role)
                VALUES (?, ?, ?, ?, 'ADMIN')`)
      .run('root', hash, 'Administrator', 'Administrator')
  }

  createBackup(label = 'manual'): string {
    this.db.pragma('wal_checkpoint(FULL)')

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .replace('Z', '')
    const safeLabel = label.replace(/[^a-zA-Z0-9-_]/g, '-')
    const target = path.join(this.backupDir, `ejurnal-${safeLabel}-${timestamp}.db`)

    this.db.prepare('VACUUM INTO ?').run(target)

    // app_settings baru tersedia setelah migration awal selesai. Backup harus
    // tetap dapat dibuat untuk database legacy atau sebelum migration awal.
    if (this.tableExists('app_settings')) {
      this.db
        .prepare(`INSERT INTO app_settings(key, value, updated_at)
                  VALUES ('last_backup_at', ?, CURRENT_TIMESTAMP)
                  ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = CURRENT_TIMESTAMP`)
        .run(new Date().toISOString())
    }

    this.cleanupBackups(30)
    return target
  }

  setAdminCode(code: string): void {
    if (code.length < 8) throw new Error('Kode admin web minimal 8 karakter.')
    this.db
      .prepare("UPDATE users SET code_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = 'root' AND role = 'ADMIN'")
      .run(bcrypt.hashSync(code, 12))
  }

  private cleanupBackups(keep: number): void {
    const files = fs
      .readdirSync(this.backupDir)
      .filter((name) => name.endsWith('.db'))
      .map((name) => ({ name, time: fs.statSync(path.join(this.backupDir, name)).mtimeMs }))
      .sort((a, b) => b.time - a.time)

    for (const file of files.slice(keep)) {
      fs.unlinkSync(path.join(this.backupDir, file.name))
    }
  }

  getSchemaVersion(): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations')
      .get() as { version: number }
    return row.version
  }

  integrityCheck(): string {
    return this.db.pragma('integrity_check', { simple: true }) as string
  }

  close(): void {
    this.db.close()
  }
}
