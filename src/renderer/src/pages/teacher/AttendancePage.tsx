import { useEffect, useMemo, useState } from 'react'
import { Save, UserCheck } from 'lucide-react'
import type { AttendanceRow, AttendanceStatus, LoginSession, TeachingSchedule } from '@shared/types'
import { today, unwrap } from '../../lib/api'
import DatePicker from '../../components/DatePicker'
import Notice from '../../components/Notice'
import Select from '../../components/Select'

const statuses: Array<{ value: AttendanceStatus; label: string; className: string }> = [
  { value: 'H', label: 'Hadir', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'S', label: 'Sakit', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'I', label: 'Izin', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  { value: 'D', label: 'Dispen', className: 'border-violet-200 bg-violet-50 text-violet-700' },
  { value: 'A', label: 'Alpa', className: 'border-rose-200 bg-rose-50 text-rose-700' }
]

export default function AttendancePage({ session }: { session: LoginSession }): JSX.Element {
  const [date, setDate] = useState(today())
  const [schedules, setSchedules] = useState<TeachingSchedule[]>([])
  const [scheduleId, setScheduleId] = useState<number | ''>('')
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const schedule = schedules.find((item) => item.id === scheduleId)
  useEffect(() => {
    window.api.schedules.byDate({ userId: session.userId, semesterId: session.semesterId, date }).then((response) => {
      const data = unwrap<TeachingSchedule[]>(response); setSchedules(data); setScheduleId(data[0]?.id ?? ''); if (!data.length) setRows([])
    }).catch((e) => setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat jadwal.', type: 'error' }))
  }, [date, session.userId, session.semesterId])

  const load = async (): Promise<void> => {
    if (!schedule) return
    setLoading(true)
    try {
      const data = unwrap<AttendanceRow[]>(await window.api.attendance.form({
        academicYearId: session.academicYearId,
        semesterId: session.semesterId,
        userId: session.userId,
        scheduleId: schedule.id,
        classId: schedule.classId,
        date,
        lessonStart: schedule.lessonStart,
        lessonEnd: schedule.lessonEnd
      }))
      setRows(data)
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat presensi.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [scheduleId, date])

  const summary = useMemo(
    () => statuses.map((status) => ({ ...status, count: rows.filter((row) => row.status === status.value).length })),
    [rows]
  )

  const setStatus = (studentId: number, status: AttendanceStatus): void => {
    setRows((current) => current.map((row) => row.id === studentId ? { ...row, status, note: status === 'H' ? '' : row.note } : row))
  }

  const save = async (): Promise<void> => {
    if (!schedule) return
    try {
      unwrap(await window.api.attendance.save({
        userId: session.userId,
        academicYearId: session.academicYearId,
        semesterId: session.semesterId,
        scheduleId: schedule.id,
        classId: schedule.classId,
        date,
        lessonStart: schedule.lessonStart,
        lessonEnd: schedule.lessonEnd,
        rows: rows.map((row) => ({ studentId: row.id, status: row.status, note: row.note }))
      }))
      setNotice({ message: 'Presensi berhasil disimpan.', type: 'success' })
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Gagal menyimpan presensi.', type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Input Presensi</h2>
        <p className="mt-1 text-sm text-slate-500">Semua siswa otomatis berstatus hadir. Ubah hanya siswa yang Sakit, Izin, Dispen, atau Alpa.</p>
      </div>
      <div className="card p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Tanggal</label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <div>
            <label className="label">Jadwal Mengajar</label>
            <Select
              value={scheduleId}
              placeholder="Tidak ada jadwal pada hari ini"
              options={schedules.map((item) => ({ value: item.id, label: `Jam ke-${item.lessonStart}${item.lessonEnd !== item.lessonStart ? `–${item.lessonEnd}` : ''} · ${item.className} · ${item.subjectName}` }))}
              onChange={(value) => setScheduleId(Number(value))}
            />
          </div>
        </div>

        {!schedule && <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">Tidak ada jadwal mengajar pada tanggal ini. Tambahkan jadwal melalui menu Jadwal Mengajar.</div>}

        <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap gap-3">{summary.map((item) => <span key={item.value} className={`badge border ${item.className}`}>{item.label}: {item.count}</span>)}</div>
          <button className="btn-secondary" onClick={() => setRows((current) => current.map((row) => ({ ...row, status: 'H', note: '' })))}><UserCheck size={16} /> Set Semua Hadir</button>
        </div>

        <div className="table-wrap mt-5 max-h-[500px]">
          <table className="table-base">
            <thead><tr><th className="w-14">No</th><th>NISN</th><th>Nama Siswa</th><th className="text-center">Status Kehadiran</th><th>Catatan</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="text-center">Memuat data...</td></tr> : rows.map((row, index) => (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td className="font-mono text-xs">{row.nisn}</td>
                  <td className="font-semibold">{row.namaSiswa}</td>
                  <td><div className="flex flex-wrap justify-center gap-2">{statuses.map((status) => <button key={status.value} onClick={() => setStatus(row.id, status.value)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${row.status === status.value ? `${status.className} ring-2 ring-slate-200 ring-offset-1` : 'border-slate-200 bg-white text-slate-400'}`}>{status.value}</button>)}</div></td>
                  <td><input className="field py-2" disabled={row.status === 'H'} value={row.note} onChange={(e) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, note: e.target.value } : item))} placeholder={row.status === 'H' ? '-' : 'Keterangan...'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end"><button className="btn-primary" onClick={save} disabled={!schedule || rows.length === 0}><Save size={16} /> Simpan Presensi</button></div>
      </div>
    </div>
  )
}
