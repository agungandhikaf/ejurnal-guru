import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, Pencil, Plus, Search } from 'lucide-react'
import type { LoginSession, Student, StudentImportResult } from '@shared/types'
import { unwrap } from '../../lib/api'
import Modal from '../../components/Modal'
import Notice from '../../components/Notice'
import Select from '../../components/Select'
import { useClasses } from './useClasses'

const emptyForm = { id: 0, nisn: '', namaSiswa: '', jenisKelamin: 'L' as 'L' | 'P' }

export default function StudentsPage({ session }: { session: LoginSession }): JSX.Element {
  const { classes } = useClasses(session.academicYearId)
  const [classId, setClassId] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Student[]>([])
  const [form, setForm] = useState(emptyForm)
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => { if (!classId && classes[0]) setClassId(classes[0].id) }, [classes, classId])

  const load = async (): Promise<void> => {
    if (!session.academicYearId) return
    try {
      setRows(unwrap<Student[]>(await window.api.admin.listStudents({ academicYearId: session.academicYearId, classId: classId || undefined, search })))
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat siswa.', type: 'error' })
    }
  }

  useEffect(() => {
    const id = setTimeout(() => void load(), 150)
    return () => clearTimeout(id)
  }, [classId, search])

  const save = async (): Promise<void> => {
    if (!classId) return
    try {
      const payload = { ...form, academicYearId: session.academicYearId, classId }
      if (form.id) unwrap(await window.api.admin.updateStudent(payload))
      else unwrap(await window.api.admin.createStudent(payload))
      setOpen(false)
      setForm(emptyForm)
      await load()
      setNotice({ message: 'Data siswa berhasil disimpan.', type: 'success' })
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Gagal menyimpan siswa.', type: 'error' })
    }
  }

  const importExcel = async (): Promise<void> => {
    if (!classId) return
    try {
      const result = unwrap<StudentImportResult>(await window.api.admin.importStudents({ academicYearId: session.academicYearId, classId }))
      if (result.canceled) return
      await load()
      const issueSummary = result.issues.slice(0, 5).map((issue) => `Baris ${issue.rowNumber}: ${issue.reason}`).join('\n')
      setNotice({ message: `Import selesai: ${result.inserted} baru, ${result.updated} diperbarui, ${result.skipped} dilewati.${issueSummary ? `\n\n${issueSummary}` : ''}`, type: 'success' })
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Import gagal.', type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
      <div className="flex items-end justify-between">
        <div><h2 className="text-2xl font-bold text-slate-900">Kelola Siswa</h2><p className="mt-1 text-sm text-slate-500">Penempatan kelas siswa berlaku untuk satu tahun ajaran.</p></div>
        <div className="flex gap-2"><button className="btn-secondary" onClick={() => window.api.admin.createStudentTemplate()}><Download size={16} /> Template</button><button className="btn-secondary" onClick={importExcel} disabled={!classId}><FileSpreadsheet size={16} /> Import Excel</button><button className="btn-primary" onClick={() => { setForm(emptyForm); setOpen(true) }} disabled={!classId}><Plus size={16} /> Tambah Siswa</button></div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-[360px_1fr] gap-4">
          <div><label className="label">Kelas</label><Select value={classId} placeholder="Pilih kelas" options={classes.map((item) => ({ value: item.id, label: `${item.subjectName} - ${item.className}` }))} onChange={(value) => setClassId(Number(value))} /></div>
          <div><label className="label">Pencarian</label><div className="relative"><Search size={16} className="absolute left-3.5 top-3 text-slate-400" /><input className="field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari NISN atau nama siswa..." /></div></div>
        </div>
        <div className="table-wrap mt-5 max-h-[520px]">
          <table className="table-base">
            <thead><tr><th>No</th><th>NISN</th><th>Nama Siswa</th><th>L/P</th><th>Kelas</th><th className="text-right">Aksi</th></tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.id}><td>{index + 1}</td><td className="font-mono text-xs">{row.nisn}</td><td className="font-semibold">{row.namaSiswa}</td><td>{row.jenisKelamin}</td><td>{row.className}</td><td className="text-right"><button className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600" onClick={() => { setForm({ id: row.id, nisn: row.nisn, namaSiswa: row.namaSiswa, jenisKelamin: row.jenisKelamin }); setClassId(row.classId ?? classId); setOpen(true) }}><Pencil size={14} /> Edit</button></td></tr>)}</tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title={form.id ? 'Edit Siswa' : 'Tambah Siswa'} onClose={() => setOpen(false)} footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Batal</button><button className="btn-primary" onClick={save}>Simpan</button></>}>
        <div className="space-y-4">
          <div><label className="label">NISN</label><input className="field" value={form.nisn} onChange={(e) => setForm({ ...form, nisn: e.target.value.replace(/\D/g, '') })} /></div>
          <div><label className="label">Nama Siswa</label><input className="field" value={form.namaSiswa} onChange={(e) => setForm({ ...form, namaSiswa: e.target.value })} /></div>
          <div><label className="label">Jenis Kelamin</label><Select value={form.jenisKelamin} options={[{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]} onChange={(value) => setForm({ ...form, jenisKelamin: value as 'L' | 'P' })} /></div>
        </div>
      </Modal>
    </div>
  )
}
