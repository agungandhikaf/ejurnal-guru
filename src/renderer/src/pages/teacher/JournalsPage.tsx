import { useEffect, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { LoginSession, TeachingJournal, TeachingSchedule } from '@shared/types'
import { formatDate, today, unwrap } from '../../lib/api'
import DatePicker from '../../components/DatePicker'
import Modal from '../../components/Modal'
import Notice from '../../components/Notice'
import Select from '../../components/Select'
import { useClasses } from './useClasses'

interface JournalForm {
  id: number
  scheduleId: number | ''
  classId: number | ''
  journalDate: string
  lessonStart: number
  lessonEnd: number
  learningMaterial: string
}

const emptyForm = (): JournalForm => ({ id: 0, scheduleId: '', classId: '', journalDate: today(), lessonStart: 1, lessonEnd: 1, learningMaterial: '' })

export default function JournalsPage({ session }: { session: LoginSession }): JSX.Element {
  const { classes } = useClasses(session.academicYearId)
  const [rows, setRows] = useState<TeachingJournal[]>([])
  const [schedules, setSchedules] = useState<TeachingSchedule[]>([])
  const [classFilter, setClassFilter] = useState<number | ''>('')
  const [dateFilter, setDateFilter] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<JournalForm>(emptyForm())
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const load = async (): Promise<void> => {
    try {
      setRows(unwrap<TeachingJournal[]>(await window.api.journals.list({
        semesterId: session.semesterId,
        userId: session.userId,
        classId: classFilter || undefined,
        search,
        date: dateFilter || undefined
      })))
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat jurnal.', type: 'error' })
    }
  }

  useEffect(() => {
    const id = setTimeout(() => void load(), 150)
    return () => clearTimeout(id)
  }, [classFilter, dateFilter, search])

  const openCreate = (): void => {
    const next = emptyForm()
    setForm(next)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    window.api.schedules.byDate({ userId: session.userId, semesterId: session.semesterId, date: form.journalDate }).then((response) => {
      const data = unwrap<TeachingSchedule[]>(response); setSchedules(data)
      if (!data.some((item) => item.id === form.scheduleId)) setForm((current) => ({ ...current, scheduleId: data[0]?.id ?? '' }))
    }).catch((e) => setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat jadwal.', type: 'error' }))
  }, [open, form.journalDate, session.userId, session.semesterId])

  const save = async (): Promise<void> => {
    try {
      if (!form.scheduleId) throw new Error('Tidak ada jadwal yang dapat dipilih.')
      const selected = schedules.find((item) => item.id === form.scheduleId)
      if (!selected) throw new Error('Jadwal tidak tersedia pada tanggal ini.')
      const payload = { ...form, userId: session.userId, semesterId: session.semesterId, scheduleId: form.scheduleId, classId: selected.classId, lessonStart: selected.lessonStart, lessonEnd: selected.lessonEnd }
      if (form.id) unwrap(await window.api.journals.update(payload))
      else unwrap(await window.api.journals.create(payload))
      setOpen(false)
      await load()
      setNotice({ message: 'Jurnal mengajar berhasil disimpan.', type: 'success' })
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Gagal menyimpan jurnal.', type: 'error' })
    }
  }

  const remove = async (id: number): Promise<void> => {
    if (!confirm('Hapus jurnal ini?')) return
    try {
      unwrap(await window.api.journals.delete({ id, userId: session.userId }))
      await load()
      setNotice({ message: 'Jurnal dihapus.', type: 'success' })
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Gagal menghapus jurnal.', type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
      <div className="flex items-end justify-between">
        <div><h2 className="text-2xl font-bold text-slate-900">Jurnal Mengajar</h2><p className="mt-1 text-sm text-slate-500">Daftar jurnal hanya menampilkan data semester yang dipilih saat login.</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Tambah Jurnal</button>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-[280px_220px_1fr] gap-4">
          <div>
            <label className="label">Filter Kelas</label>
            <Select
              value={classFilter}
              options={[{ value: '', label: 'Semua kelas' }, ...classes.map((item) => ({ value: item.id, label: `${item.subjectName} - ${item.className}` }))]}
              onChange={(value) => setClassFilter(value === '' ? '' : Number(value))}
            />
          </div>
          <div>
            <label className="label">Filter Tanggal</label>
            <DatePicker value={dateFilter} onChange={setDateFilter} clearable placeholder="Semua tanggal" />
          </div>
          <div>
            <label className="label">Cari Materi</label>
            <div className="relative"><Search size={16} className="absolute left-3.5 top-3 text-slate-400" /><input className="field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari materi pembelajaran..." /></div>
          </div>
        </div>

        <div className="table-wrap mt-5 max-h-[520px]">
          <table className="table-base">
            <thead><tr><th>Tanggal</th><th>Kelas</th><th>Jam</th><th>Materi Pembelajaran</th><th className="text-right">Aksi</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row.id}>
                <td>{formatDate(row.journalDate)}</td>
                <td><span className="font-semibold">{row.className}</span><br /><span className="text-xs text-slate-400">{row.subjectName}</span></td>
                <td>Jam {row.lessonStart}{row.lessonEnd !== row.lessonStart ? `–${row.lessonEnd}` : ''}</td>
                <td className="max-w-xl whitespace-pre-wrap">{row.learningMaterial}</td>
                <td className="text-right"><div className="flex justify-end gap-3"><button className="text-indigo-600" onClick={() => { setForm({ id: row.id, scheduleId: row.scheduleId ?? '', classId: row.classId, journalDate: row.journalDate, lessonStart: row.lessonStart, lessonEnd: row.lessonEnd, learningMaterial: row.learningMaterial }); setOpen(true) }}><Pencil size={16} /></button><button className="text-rose-500" onClick={() => remove(row.id)}><Trash2 size={16} /></button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        title={form.id ? 'Edit Jurnal' : 'Tambah Jurnal'}
        onClose={() => setOpen(false)}
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Batal</button><button className="btn-primary" onClick={save}>Simpan Jurnal</button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Tanggal</label><DatePicker value={form.journalDate} onChange={(value) => setForm({ ...form, journalDate: value, scheduleId: '' })} /></div>
            <div><label className="label">Jadwal Mengajar</label><Select value={form.scheduleId} placeholder="Tidak ada jadwal pada hari ini" options={schedules.map((item) => ({ value: item.id, label: `Jam ke-${item.lessonStart}${item.lessonEnd !== item.lessonStart ? `–${item.lessonEnd}` : ''} · ${item.className} · ${item.subjectName}` }))} onChange={(value) => setForm({ ...form, scheduleId: Number(value) })} /></div>
          </div>
          {!schedules.length && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">Tidak ada jadwal mengajar pada tanggal ini.</div>}
          <div><label className="label">Materi Pembelajaran</label><textarea className="field min-h-36 resize-y" value={form.learningMaterial} onChange={(e) => setForm({ ...form, learningMaterial: e.target.value })} placeholder="Tuliskan materi, aktivitas, atau catatan pembelajaran..." /></div>
        </div>
      </Modal>
    </div>
  )
}
