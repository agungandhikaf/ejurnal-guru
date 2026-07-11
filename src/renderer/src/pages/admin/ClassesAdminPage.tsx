import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import type { AcademicYear, SchoolClass, Semester } from '@shared/types'
import { unwrap } from '../../lib/api'
import Modal from '../../components/Modal'
import Notice from '../../components/Notice'
import Select from '../../components/Select'

type YearRow = AcademicYear & { semesters: Semester[] }

export default function ClassesAdminPage(): JSX.Element {
  const [years, setYears] = useState<YearRow[]>([])
  const [yearId, setYearId] = useState<number | ''>('')
  const [rows, setRows] = useState<SchoolClass[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ className: '', subjectName: '' })
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const loadYears = async (): Promise<void> => {
    try {
      const data = unwrap<YearRow[]>(await window.api.admin.listYears())
      setYears(data)
      if (!yearId && data[0]) setYearId(data[0].id)
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat tahun ajaran.', type: 'error' })
    }
  }

  const loadClasses = async (): Promise<void> => {
    if (!yearId) return
    try {
      setRows(unwrap<SchoolClass[]>(await window.api.admin.listClasses(yearId)))
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat kelas.', type: 'error' })
    }
  }

  useEffect(() => { void loadYears() }, [])
  useEffect(() => { void loadClasses() }, [yearId])

  const save = async (): Promise<void> => {
    if (!yearId) return
    try {
      unwrap(await window.api.admin.createClass({ academicYearId: yearId, ...form }))
      setOpen(false)
      setForm({ className: '', subjectName: '' })
      await loadClasses()
      setNotice({ message: 'Kelas berhasil ditambahkan.', type: 'success' })
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Gagal menambah kelas.', type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pendaftaran Kelas</h2>
          <p className="mt-1 text-sm text-slate-500">Kelas dan mata pelajaran tertaut pada tahun ajaran.</p>
        </div>
        <button className="btn-primary" disabled={!yearId} onClick={() => setOpen(true)}><Plus size={16} /> Tambah Kelas</button>
      </div>

      <div className="card p-6">
        <div className="max-w-sm">
          <label className="label">Tahun Ajaran</label>
          <Select
            value={yearId}
            placeholder="Pilih tahun"
            options={years.map((year) => ({ value: year.id, label: year.label }))}
            onChange={(value) => setYearId(Number(value))}
          />
        </div>
        <div className="table-wrap mt-5 max-h-[560px]">
          <table className="table-base">
            <thead><tr><th>No</th><th>Kelas</th><th>Mata Pelajaran</th><th>Status</th></tr></thead>
            <tbody>{rows.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td className="font-bold">{row.className}</td>
                <td>{row.subjectName}</td>
                <td><span className="badge bg-emerald-100 text-emerald-700">Aktif</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        title="Tambah Kelas"
        onClose={() => setOpen(false)}
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Batal</button><button className="btn-primary" onClick={save}>Simpan</button></>}
      >
        <div className="space-y-4">
          <div><label className="label">Nama Kelas</label><input className="field" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} placeholder="Contoh: 7A" /></div>
          <div><label className="label">Nama Mata Pelajaran</label><input className="field" value={form.subjectName} onChange={(e) => setForm({ ...form, subjectName: e.target.value })} placeholder="Contoh: Pendidikan Pancasila" /></div>
        </div>
      </Modal>
    </div>
  )
}
