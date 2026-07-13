import { useEffect, useState } from 'react'
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import type { AcademicYear, SchoolClass, Semester } from '@shared/types'
import { unwrap } from '../../lib/api'
import Modal from '../../components/Modal'
import Notice from '../../components/Notice'
import Select from '../../components/Select'

type YearRow = AcademicYear & { semesters: Semester[] }
const emptyForm = { id: 0, className: '', subjectName: '' }

export default function ClassesAdminPage(): JSX.Element {
  const [years, setYears] = useState<YearRow[]>([])
  const [yearId, setYearId] = useState<number | ''>('')
  const [rows, setRows] = useState<SchoolClass[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const loadYears = async (): Promise<void> => {
    try {
      const data = unwrap<YearRow[]>(await window.api.admin.listYears())
      setYears(data)
      if (!yearId && data[0]) setYearId(data[0].id)
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Gagal memuat tahun ajaran.', type: 'error' })
    }
  }

  const loadClasses = async (): Promise<void> => {
    if (!yearId) return
    try {
      setRows(unwrap<SchoolClass[]>(await window.api.admin.listClasses(yearId, true)))
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Gagal memuat kelas.', type: 'error' })
    }
  }

  useEffect(() => { void loadYears() }, [])
  useEffect(() => { void loadClasses() }, [yearId])

  const closeForm = (): void => {
    setOpen(false)
    setForm(emptyForm)
  }

  const save = async (): Promise<void> => {
    if (!yearId) return
    try {
      if (form.id) unwrap(await window.api.admin.updateClass({ academicYearId: yearId, ...form }))
      else unwrap(await window.api.admin.createClass({ academicYearId: yearId, ...form }))
      const wasEditing = Boolean(form.id)
      closeForm()
      await loadClasses()
      setNotice({ message: wasEditing ? 'Data kelas berhasil diperbarui.' : 'Kelas berhasil ditambahkan.', type: 'success' })
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Gagal menyimpan kelas.', type: 'error' })
    }
  }

  const toggle = async (schoolClass: SchoolClass): Promise<void> => {
    if (schoolClass.isActive && !window.confirm(`Hapus ${schoolClass.className} - ${schoolClass.subjectName} dari daftar aktif? Riwayat nilai, presensi, dan jurnal tetap disimpan.`)) return
    try {
      unwrap(await window.api.admin.toggleClass(schoolClass.id))
      await loadClasses()
      setNotice({ message: schoolClass.isActive ? 'Kelas dihapus dari daftar aktif.' : 'Kelas diaktifkan kembali.', type: 'success' })
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Gagal mengubah status kelas.', type: 'error' })
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
        <button className="btn-primary" disabled={!yearId} onClick={() => { setForm(emptyForm); setOpen(true) }}><Plus size={16} /> Tambah Kelas</button>
      </div>

      <div className="card p-6">
        <div className="max-w-sm">
          <label className="label">Tahun Ajaran</label>
          <Select value={yearId} placeholder="Pilih tahun" options={years.map((year) => ({ value: year.id, label: year.label }))} onChange={(value) => setYearId(Number(value))} />
        </div>
        <div className="table-wrap mt-5 max-h-[560px]">
          <table className="table-base">
            <thead><tr><th>No</th><th>Kelas</th><th>Mata Pelajaran</th><th>Status</th><th className="text-right">Aksi</th></tr></thead>
            <tbody>{rows.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td className="font-bold">{row.className}</td>
                <td>{row.subjectName}</td>
                <td><span className={`badge ${row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                <td className="text-right">
                  <div className="flex justify-end gap-3">
                    <button className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600" onClick={() => { setForm({ id: row.id, className: row.className, subjectName: row.subjectName }); setOpen(true) }}><Pencil size={14} /> Edit</button>
                    <button className={`inline-flex items-center gap-1 text-xs font-semibold ${row.isActive ? 'text-rose-600' : 'text-emerald-600'}`} onClick={() => void toggle(row)}>
                      {row.isActive ? <Trash2 size={14} /> : <RotateCcw size={14} />} {row.isActive ? 'Hapus' : 'Pulihkan'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        title={form.id ? 'Edit Kelas' : 'Tambah Kelas'}
        onClose={closeForm}
        footer={<><button className="btn-secondary" onClick={closeForm}>Batal</button><button className="btn-primary" onClick={save}>Simpan</button></>}
      >
        <div className="space-y-4">
          <div><label className="label">Nama Kelas</label><input className="field" value={form.className} onChange={(event) => setForm({ ...form, className: event.target.value })} placeholder="Contoh: 7A" /></div>
          <div><label className="label">Nama Mata Pelajaran</label><input className="field" value={form.subjectName} onChange={(event) => setForm({ ...form, subjectName: event.target.value })} placeholder="Contoh: Pendidikan Pancasila" /></div>
        </div>
      </Modal>
    </div>
  )
}
