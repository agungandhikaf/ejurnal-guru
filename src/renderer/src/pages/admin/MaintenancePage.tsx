import { useEffect, useState } from 'react'
import { DatabaseBackup, FileCode2, FolderOpen, RefreshCw } from 'lucide-react'
import type { MaintenanceInfo } from '@shared/types'
import { formatBytes, unwrap } from '../../lib/api'
import Notice from '../../components/Notice'
import UpdatePanel from '../../components/UpdatePanel'

export default function MaintenancePage(): JSX.Element {
  const isWeb = !navigator.userAgent.includes('Electron')
  const [info, setInfo] = useState<MaintenanceInfo | null>(null)
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const load = async (): Promise<void> => {
    try { setInfo(unwrap<MaintenanceInfo>(await window.api.maintenance.info())) }
    catch (e) { setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat status.', type: 'error' }) }
  }
  useEffect(() => { void load() }, [])
  const backup = async (): Promise<void> => {
    try { const path = unwrap<string | null>(await window.api.maintenance.backup()); await load(); setNotice({ message: path ? `Backup berhasil dibuat: ${path}` : 'Backup berhasil dibuat.', type: 'success' }) }
    catch (e) { setNotice({ message: e instanceof Error ? e.message : 'Backup gagal.', type: 'error' }) }
  }
  const openDataFolder = async (): Promise<void> => {
    try { unwrap<string>(await window.api.maintenance.openDataFolder()) }
    catch (e) { setNotice({ message: e instanceof Error ? e.message : 'Folder database gagal dibuka.', type: 'error' }) }
  }
  const patch = async (): Promise<void> => {
    if (!confirm('Aplikasi akan membuat backup lalu menjalankan SQL patch. Lanjutkan?')) return
    try { const result = unwrap<{ patchName: string }>(await window.api.maintenance.applySqlPatch()); await load(); setNotice({ message: `Patch ${result.patchName} berhasil diterapkan.`, type: 'success' }) }
    catch (e) { setNotice({ message: e instanceof Error ? e.message : 'Patch gagal.', type: 'error' }) }
  }
  return <div className="space-y-6">
    {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
    <div className="flex items-end justify-between"><div><h2 className="text-2xl font-bold text-slate-900">Maintenance</h2><p className="mt-1 text-sm text-slate-500">Periksa kesehatan database, buat backup, dan terapkan SQL patch.</p></div><button className="btn-secondary" onClick={load}><RefreshCw size={16} /> Muat Ulang</button></div>
    <div className="grid grid-cols-4 gap-4">{[
      ['Environment', info?.environment?.toUpperCase() ?? '-'], ['Versi Aplikasi', info?.appVersion ?? '-'], ['Versi Schema', info?.schemaVersion ?? '-'], ['Integritas DB', info?.integrityStatus ?? '-']
    ].map(([label, value]) => <div key={String(label)} className="card p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-xl font-bold text-slate-900">{value}</p></div>)}</div>
    <div className="card p-6"><div className="grid grid-cols-2 gap-6"><div><h3 className="font-bold text-slate-900">Informasi Database</h3><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-6"><dt className="text-slate-500">Lokasi</dt><dd className="max-w-md break-all text-right font-mono text-xs">{info?.databasePath ?? '-'}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Ukuran</dt><dd className="font-semibold">{formatBytes(info?.databaseSizeBytes ?? 0)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Backup terakhir</dt><dd className="font-semibold">{info?.lastBackupAt ? new Date(info.lastBackupAt).toLocaleString('id-ID') : 'Belum ada'}</dd></div></dl></div><div><h3 className="font-bold text-slate-900">Jumlah Data</h3><div className="mt-4 grid grid-cols-3 gap-3">{Object.entries(info?.counts ?? {}).map(([key, value]) => <div key={key} className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-xl font-bold text-indigo-700">{value}</p><p className="mt-1 text-[10px] font-bold uppercase text-slate-400">{key}</p></div>)}</div></div></div><div className="mt-6 flex gap-3 border-t border-slate-100 pt-5"><button className="btn-primary" onClick={backup}><DatabaseBackup size={16} /> {isWeb ? 'Unduh Backup' : 'Buat Backup'}</button>{!isWeb && <button className="btn-secondary" onClick={openDataFolder}><FolderOpen size={16} /> Buka Folder Data</button>}<button className="btn-secondary" onClick={patch}><FileCode2 size={16} /> Terapkan SQL Patch</button></div></div>
    <UpdatePanel />
  </div>
}
