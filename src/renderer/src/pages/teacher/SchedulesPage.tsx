import { useEffect, useState } from 'react'
import { CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react'
import type { LoginSession, TeachingSchedule } from '@shared/types'
import { unwrap } from '../../lib/api'
import Modal from '../../components/Modal'
import Notice from '../../components/Notice'
import Select from '../../components/Select'
import { useClasses } from './useClasses'

const days = [
  { value: 1, label: 'Senin' }, { value: 2, label: 'Selasa' }, { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' }, { value: 5, label: 'Jumat' }
]
const lessons = Array.from({ length: 10 }, (_, index) => ({ value: index + 1, label: `Jam ke-${index + 1}` }))
const emptyForm = () => ({ id: 0, dayOfWeek: 1, classId: '' as number | '', lessonStart: 1, lessonEnd: 1 })

export default function SchedulesPage({ session }: { session: LoginSession }): JSX.Element {
  const { classes } = useClasses(session.academicYearId)
  const [rows, setRows] = useState<TeachingSchedule[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [form, setForm] = useState(emptyForm())
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const context = { userId: session.userId, semesterId: session.semesterId }

  const load = async (): Promise<void> => {
    try { setRows(unwrap<TeachingSchedule[]>(await window.api.schedules.list(context))) }
    catch (e) { setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat jadwal.', type: 'error' }) }
  }
  useEffect(() => { void load() }, [session.userId, session.semesterId])

  const save = async (): Promise<void> => {
    try {
      if (!form.classId) throw new Error('Pilih kelas dan mata pelajaran.')
      const payload = { ...context, ...form, classId: Number(form.classId) }
      unwrap(form.id ? await window.api.schedules.update(payload) : await window.api.schedules.create(payload))
      setOpen(false); await load(); setNotice({ message: 'Jadwal mengajar berhasil disimpan.', type: 'success' })
    } catch (e) { setNotice({ message: e instanceof Error ? e.message : 'Gagal menyimpan jadwal.', type: 'error' }) }
  }

  const remove = async (ids: number[]): Promise<void> => {
    if (!ids.length || !confirm(`Hapus ${ids.length} jadwal terpilih? Data presensi dan jurnal lama tetap tersimpan.`)) return
    try {
      unwrap(await window.api.schedules.bulkDelete({ ...context, ids }))
      setSelected([]); await load(); setNotice({ message: 'Jadwal berhasil dihapus.', type: 'success' })
    } catch (e) { setNotice({ message: e instanceof Error ? e.message : 'Gagal menghapus jadwal.', type: 'error' }) }
  }

  return <div className="space-y-6">
    {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
    <div className="flex items-end justify-between">
      <div><h2 className="text-2xl font-bold text-slate-900">Jadwal Mengajar</h2><p className="mt-1 text-sm text-slate-500">Atur jadwal mengajar untuk semester yang sedang aktif.</p></div>
      <button className="btn-primary" onClick={() => { const next = emptyForm(); next.classId = classes[0]?.id ?? ''; setForm(next); setOpen(true) }}><Plus size={16} /> Tambah Jadwal</button>
    </div>
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><CalendarClock className="text-[#C43670]" /><h3 className="font-bold">Daftar Jadwal</h3></div>
        <button className="btn-secondary text-rose-600" disabled={!selected.length} onClick={() => void remove(selected)}><Trash2 size={16} /> Hapus Terpilih ({selected.length})</button>
      </div>
      <div className="table-wrap max-h-[560px]"><table className="table-base"><thead><tr>
        <th className="w-12"><input type="checkbox" aria-label="Pilih semua" checked={rows.length > 0 && selected.length === rows.length} onChange={(e) => setSelected(e.target.checked ? rows.map((row) => row.id) : [])} /></th>
        <th>Hari</th><th>Jam Pelajaran</th><th>Kelas</th><th>Mata Pelajaran</th><th className="text-right">Aksi</th>
      </tr></thead><tbody>
        {!rows.length ? <tr><td colSpan={6} className="py-12 text-center text-slate-500">Belum ada jadwal mengajar.</td></tr> : rows.map((row) => <tr key={row.id}>
          <td><input type="checkbox" aria-label={`Pilih ${row.className}`} checked={selected.includes(row.id)} onChange={(e) => setSelected((current) => e.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} /></td>
          <td className="font-semibold">{days.find((day) => day.value === row.dayOfWeek)?.label}</td>
          <td>Jam ke-{row.lessonStart}{row.lessonEnd !== row.lessonStart ? `–${row.lessonEnd}` : ''}</td><td>{row.className}</td><td>{row.subjectName}</td>
          <td><div className="flex justify-end gap-3"><button className="text-indigo-600" title="Edit" onClick={() => { setForm({ id: row.id, dayOfWeek: row.dayOfWeek, classId: row.classId, lessonStart: row.lessonStart, lessonEnd: row.lessonEnd }); setOpen(true) }}><Pencil size={16} /></button><button className="text-rose-500" title="Hapus" onClick={() => void remove([row.id])}><Trash2 size={16} /></button></div></td>
        </tr>)}</tbody></table></div>
    </div>
    <Modal open={open} title={form.id ? 'Edit Jadwal' : 'Tambah Jadwal'} onClose={() => setOpen(false)} footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Batal</button><button className="btn-primary" onClick={() => void save()}>Simpan Jadwal</button></>}>
      <div className="space-y-4"><div><label className="label">Hari</label><Select value={form.dayOfWeek} options={days} onChange={(value) => setForm({ ...form, dayOfWeek: Number(value) })} /></div>
        <div><label className="label">Kelas & Mata Pelajaran</label><Select value={form.classId} placeholder="Pilih kelas" options={classes.map((item) => ({ value: item.id, label: `${item.className} — ${item.subjectName}` }))} onChange={(value) => setForm({ ...form, classId: Number(value) })} /></div>
        <div className="grid grid-cols-2 gap-4"><div><label className="label">Jam Mulai</label><Select value={form.lessonStart} options={lessons} onChange={(value) => { const start = Number(value); setForm({ ...form, lessonStart: start, lessonEnd: Math.max(start, form.lessonEnd) }) }} /></div><div><label className="label">Jam Selesai</label><Select value={form.lessonEnd} options={lessons.filter((item) => Number(item.value) >= form.lessonStart)} onChange={(value) => setForm({ ...form, lessonEnd: Number(value) })} /></div></div>
      </div>
    </Modal>
  </div>
}
