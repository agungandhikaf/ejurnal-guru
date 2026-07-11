import { useEffect, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import type { UpdateStatus } from '@shared/types'
import { unwrap } from '../lib/api'

export default function UpdatePanel(): JSX.Element {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [error, setError] = useState('')

  useEffect(() => window.api.updater.onStatus(setStatus), [])

  const check = async (): Promise<void> => {
    try {
      setError('')
      unwrap(await window.api.updater.check())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memeriksa pembaruan.')
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900">Pembaruan Aplikasi</h3>
          <p className="mt-1 text-sm text-slate-500">Build produksi memeriksa rilis terbaru dari GitHub Releases.</p>
        </div>
        <button className="btn-secondary" onClick={check} disabled={status.state === 'checking'}>
          <RefreshCw size={16} className={status.state === 'checking' ? 'animate-spin' : ''} /> Periksa Update
        </button>
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        {status.state === 'idle' && 'Belum ada pemeriksaan pembaruan.'}
        {status.state === 'checking' && 'Sedang memeriksa versi terbaru...'}
        {status.state === 'not-available' && 'Aplikasi sudah menggunakan versi terbaru.'}
        {status.state === 'available' && (
          <div className="flex items-center justify-between gap-4">
            <span>Versi {status.version} tersedia.</span>
            <button className="btn-primary" onClick={() => window.api.updater.download()}><Download size={16} /> Unduh Update</button>
          </div>
        )}
        {status.state === 'downloading' && `Mengunduh pembaruan: ${status.percent ?? 0}%`}
        {status.state === 'downloaded' && (
          <div className="flex items-center justify-between gap-4">
            <span>Versi {status.version} siap dipasang.</span>
            <button className="btn-primary" onClick={() => window.api.updater.install()}><Download size={16} /> Restart & Instal</button>
          </div>
        )}
        {status.state === 'error' && <span className="text-rose-700">{status.message}</span>}
        {error && <span className="text-rose-700">{error}</span>}
      </div>
    </div>
  )
}
