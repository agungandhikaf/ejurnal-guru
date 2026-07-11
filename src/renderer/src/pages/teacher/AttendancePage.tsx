import { useEffect, useMemo, useState } from 'react'
import { Save, UserCheck } from 'lucide-react'
import type { AttendanceRow, AttendanceStatus, LoginSession } from '@shared/types'
import { today, unwrap } from '../../lib/api'
import DatePicker from '../../components/DatePicker'
import Notice from '../../components/Notice'
import Select from '../../components/Select'
import { useClasses } from './useClasses'

const statuses: Array<{ value: AttendanceStatus; label: string; className: string }> = [
  { value: 'H', label: 'Hadir', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'S', label: 'Sakit', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'I', label: 'Izin', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  { value: 'D', label: 'Dispen', className: 'border-violet-200 bg-violet-50 text-violet-700' },
  { value: 'A', label: 'Alpa', className: 'border-rose-200 bg-rose-50 text-rose-700' }
]

const lessonOptions = Array.from({ length: 10 }, (_, index) => ({ value: index + 1, label: `Jam ke-${index + 1}` }))

export default function AttendancePage({ session }: { session: LoginSession }): JSX.Element {
  const { classes, error: classError } = useClasses(session.academicYearId)
  const [classId, setClassId] = useState<number | ''>('')
  const [date, setDate] = useState(today())
  const [lessonStart, setLessonStart] = useState(1)
  const [lessonEnd, setLessonEnd] = useState(2)
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => { if (!classId && classes[0]) setClassId(classes[0].id) }, [classes, classId])

  const load = async (): Promise<void> => {
    if (!classId) return
    setLoading(true)
    try {
      const data = unwrap<AttendanceRow[]>(await window.api.attendance.form({
        academicYearId: session.academicYearId,
        semesterId: session.semesterId,
        classId,
        date,
        lessonStart,
        lessonEnd
      }))
      setRows(data)
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat presensi.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [classId, date, lessonStart, lessonEnd])

  const summary = useMemo(
    () => statuses.map((status) => ({ ...status, count: rows.filter((row) => row.status === status.value).length })),
    [rows]
  )

  const setStatus = (studentId: number, status: AttendanceStatus): void => {
    setRows((current) => current.map((row) => row.id === studentId ? { ...row, status, note: status === 'H' ? '' : row.note } : row))
  }

  const save = async (): Promise<void> => {
    if (!classId) return
    try {
      unwrap(await window.api.attendance.save({
        userId: session.userId,
        academicYearId: session.academicYearId,
        semesterId: session.semesterId,
        classId,
        date,
        lessonStart,
        lessonEnd,
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
      {classError && <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{classError}</div>}

      <div className="card p-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="label">Kelas & Mata Pelajaran</label>
            <Select
              value={classId}
              placeholder="Pilih kelas"
              options={classes.map((item) => ({ value: item.id, label: `${item.subjectName} - ${item.className}` }))}
              onChange={(value) => setClassId(Number(value))}
            />
          </div>
          <div>
            <label className="label">Tanggal</label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <div>
            <label className="label">Jam Mulai</label>
            <Select
              value={lessonStart}
              options={lessonOptions}
              onChange={(value) => {
                const next = Number(value)
                setLessonStart(next)
                if (lessonEnd < next) setLessonEnd(next)
              }}
            />
          </div>
          <div>
            <label className="label">Jam Selesai</label>
            <Select
              value={lessonEnd}
              options={lessonOptions.filter((option) => Number(option.value) >= lessonStart)}
              onChange={(value) => setLessonEnd(Number(value))}
            />
          </div>
        </div>

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

        <div className="mt-5 flex justify-end"><button className="btn-primary" onClick={save} disabled={!classId || rows.length === 0}><Save size={16} /> Simpan Presensi</button></div>
      </div>
    </div>
  )
}
