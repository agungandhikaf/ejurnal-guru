import { useEffect, useState } from 'react'
import { CalendarCheck2, CheckCircle2, Clock3 } from 'lucide-react'
import type { LoginSession } from '@shared/types'
import { today, unwrap } from '../../lib/api'
import DatePicker from '../../components/DatePicker'

interface DailyRow {
  classId: number
  className: string
  subjectName: string
  sessionId: number | null
  lessonStart: number | null
  lessonEnd: number | null
  status: 'SUDAH' | 'BELUM'
}

export default function DailyAttendancePage({ session }: { session: LoginSession }): JSX.Element {
  const [date, setDate] = useState(today())
  const [rows, setRows] = useState<DailyRow[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    window.api.attendance.daily({ semesterId: session.semesterId, academicYearId: session.academicYearId, date })
      .then((response) => setRows(unwrap<DailyRow[]>(response)))
      .catch((e) => setError(e.message))
  }, [date, session])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div><h2 className="text-2xl font-bold text-slate-900">Absensi Harian</h2><p className="mt-1 text-sm text-slate-500">Pantau status pengisian presensi berdasarkan tanggal.</p></div>
        <div className="min-w-56"><label className="label">Tanggal</label><DatePicker value={date} onChange={setDate} /></div>
      </div>
      {error && <div className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</div>}
      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden p-6">
        <div className="mb-5 flex shrink-0 items-center gap-2"><CalendarCheck2 className="text-indigo-600" /><h3 className="font-bold text-slate-900">Status Jurnal Absensi</h3></div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">{rows.map((row, index) => (
          <div key={`${row.classId}-${row.sessionId ?? index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <div>
              <p className="font-bold text-slate-900">{row.subjectName} - {row.className}</p>
              <p className="mt-1 text-xs text-slate-500">{row.sessionId ? `Jam ke-${row.lessonStart}${row.lessonEnd !== row.lessonStart ? ` s.d. ${row.lessonEnd}` : ''}` : 'Belum ada pengisian pada tanggal ini'}</p>
            </div>
            {row.status === 'SUDAH' ? <span className="badge bg-emerald-100 text-emerald-700"><CheckCircle2 size={14} className="mr-1" /> Sudah Diisi</span> : <span className="badge bg-amber-100 text-amber-700"><Clock3 size={14} className="mr-1" /> Belum Diisi</span>}
          </div>
        ))}</div>
      </div>
    </div>
  )
}
