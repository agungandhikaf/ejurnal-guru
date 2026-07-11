import { useEffect, useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import type { LoginSession } from '@shared/types'
import { today, unwrap } from '../../lib/api'
import DatePicker from '../../components/DatePicker'
import Select from '../../components/Select'
import { useClasses } from './useClasses'

interface RecapRow {
  id: number
  nisn: string
  namaSiswa: string
  hadir: number
  sakit: number
  izin: number
  dispen: number
  alpa: number
  total: number
  skor: number
}

export default function AttendanceRecapPage({ session }: { session: LoginSession }): JSX.Element {
  const { classes } = useClasses(session.academicYearId)
  const [classId, setClassId] = useState<number | ''>('')
  const current = today()
  const [startDate, setStartDate] = useState(`${current.slice(0, 8)}01`)
  const [endDate, setEndDate] = useState(current)
  const [rows, setRows] = useState<RecapRow[]>([])
  const [error, setError] = useState('')

  useEffect(() => { if (!classId && classes[0]) setClassId(classes[0].id) }, [classes, classId])
  useEffect(() => {
    if (!classId) return
    window.api.attendance.recap({ semesterId: session.semesterId, academicYearId: session.academicYearId, classId, startDate, endDate })
      .then((response) => setRows(unwrap<RecapRow[]>(response)))
      .catch((e) => setError(e.message))
  }, [classId, startDate, endDate, session])

  const average = rows.length ? rows.reduce((sum, row) => sum + Number(row.skor), 0) / rows.length : 0

  const exportExcel = async (): Promise<void> => {
    if (!classId) return
    try {
      unwrap<string | null>(await window.api.attendance.exportRecap({ semesterId: session.semesterId, academicYearId: session.academicYearId, classId, startDate, endDate }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export gagal.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div><h2 className="text-2xl font-bold text-slate-900">Rekap Absensi</h2><p className="mt-1 text-sm text-slate-500">Skor kehadiran = (Hadir + Dispen) ÷ total pertemuan × 100.</p></div>
        <button className="btn-primary" onClick={exportExcel} disabled={!classId}><FileSpreadsheet size={16} /> Export Excel</button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">{[
        ['Rata-rata Kehadiran', `${average.toFixed(1)}%`],
        ['Total Sakit', rows.reduce((sum, row) => sum + Number(row.sakit), 0)],
        ['Total Izin', rows.reduce((sum, row) => sum + Number(row.izin), 0)],
        ['Total Dispen', rows.reduce((sum, row) => sum + Number(row.dispen), 0)],
        ['Total Alpa', rows.reduce((sum, row) => sum + Number(row.alpa), 0)]
      ].map(([label, value]) => <div key={String(label)} className="card p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value}</p></div>)}</div>

      <div className="card p-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Kelas</label>
            <Select value={classId} placeholder="Pilih kelas" options={classes.map((item) => ({ value: item.id, label: `${item.subjectName} - ${item.className}` }))} onChange={(value) => setClassId(Number(value))} />
          </div>
          <div><label className="label">Dari Tanggal</label><DatePicker value={startDate} onChange={setStartDate} /></div>
          <div><label className="label">Sampai Tanggal</label><DatePicker value={endDate} onChange={setEndDate} /></div>
        </div>
        {error && <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        <div className="table-wrap mt-5 max-h-[480px]">
          <table className="table-base">
            <thead><tr><th>No</th><th>NISN</th><th>Nama Siswa</th><th className="text-center">H</th><th className="text-center">S</th><th className="text-center">I</th><th className="text-center">D</th><th className="text-center">A</th><th className="text-center">Total</th><th className="text-right">Skor</th></tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.id}><td>{index + 1}</td><td className="font-mono text-xs">{row.nisn}</td><td className="font-semibold">{row.namaSiswa}</td><td className="text-center text-emerald-700">{row.hadir}</td><td className="text-center">{row.sakit}</td><td className="text-center">{row.izin}</td><td className="text-center text-violet-700">{row.dispen}</td><td className="text-center text-rose-700">{row.alpa}</td><td className="text-center">{row.total}</td><td className="text-right font-bold text-indigo-700">{Number(row.skor).toFixed(1)}%</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
