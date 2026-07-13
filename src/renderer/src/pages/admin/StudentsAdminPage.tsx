import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { AcademicYear, SchoolClass, Semester, Student, StudentImportResult } from '@shared/types'
import { unwrap } from '../../lib/api'
import Modal from '../../components/Modal'
import Notice from '../../components/Notice'
import Select from '../../components/Select'

type YearRow = AcademicYear & { semesters: Semester[] }
type StudentForm = { id: number; classId: number | ''; nisn: string; namaSiswa: string; jenisKelamin: 'L' | 'P' }
const emptyForm = (classId: number | ''): StudentForm => ({ id: 0, classId, nisn: '', namaSiswa: '', jenisKelamin: 'L' })

function importMessage(result: StudentImportResult): string {
  const summary = `Import selesai: ${result.inserted} siswa baru, ${result.updated} diperbarui, ${result.skipped} dilewati.`
  if (!result.issues.length) return summary
  const shown = result.issues.slice(0, 8).map((issue) => `Baris ${issue.rowNumber} (NISN ${issue.nisn}): ${issue.reason}`)
  const remainder = result.issues.length - shown.length
  return `${summary}\n\nAlasan data dilewati:\n${shown.join('\n')}${remainder > 0 ? `\n... dan ${remainder} baris lainnya.` : ''}`
}

export default function StudentsAdminPage(): JSX.Element {
  const [years, setYears] = useState<YearRow[]>([])
  const [yearId, setYearId] = useState<number | ''>('')
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [classId, setClassId] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Student[]>([])
  const [form, setForm] = useState<StudentForm>(emptyForm(''))
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    window.api.admin.listYears().then((response) => {
      try {
        const data = unwrap<YearRow[]>(response)
        setYears(data)
        if (data[0]) setYearId(data[0].id)
      } catch (error) {
        setNotice({ message: error instanceof Error ? error.message : 'Gagal memuat tahun.', type: 'error' })
      }
    })
  }, [])

  useEffect(() => {
    if (!yearId) return
    window.api.admin.listClasses(yearId).then((response) => {
      try {
        const data = unwrap<SchoolClass[]>(response)
        setClasses(data)
        setClassId(data[0]?.id ?? '')
      } catch (error) {
        setNotice({ message: error instanceof Error ? error.message : 'Gagal memuat kelas.', type: 'error' })
      }
    })
  }, [yearId])

  const load = async (): Promise<void> => {
    if (!yearId) return
    try {
      setRows(unwrap<Student[]>(await window.api.admin.listStudents({ academicYearId: yearId, classId: classId || undefined, search })))
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Gagal memuat siswa.', type: 'error' })
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 150)
    return () => clearTimeout(timer)
  }, [yearId, classId, search])

  const closeForm = (): void => {
    setOpen(false)
    setForm(emptyForm(classId))
  }

  const save = async (): Promise<void> => {
    if (!yearId || !form.classId) return
    try {
      const payload = { ...form, academicYearId: yearId, classId: form.classId }
      if (form.id) unwrap(await window.api.admin.updateStudent(payload))
      else unwrap(await window.api.admin.createStudent(payload))
      const wasEditing = Boolean(form.id)
      closeForm()
      await load()
      setNotice({ message: wasEditing ? 'Data siswa berhasil diperbarui.' : 'Siswa berhasil ditambahkan.', type: 'success' })
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Gagal menyimpan siswa.', type: 'error' })
    }
  }

  const remove = async (student: Student): Promise<void> => {
    if (!yearId || !window.confirm(`Hapus ${student.namaSiswa} dari tahun ajaran ini? Riwayat nilai dan presensi tetap disimpan.`)) return
    try {
      unwrap(await window.api.admin.deleteStudent({ id: student.id, academicYearId: yearId }))
      await load()
      setNotice({ message: 'Siswa dihapus dari daftar aktif tahun ajaran ini.', type: 'success' })
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Gagal menghapus siswa.', type: 'error' })
    }
  }

  const downloadTemplate = async (): Promise<void> => {
    try {
      unwrap(await window.api.admin.createStudentTemplate())
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Gagal menyimpan template.', type: 'error' })
    }
  }

  const importExcel = async (): Promise<void> => {
    if (!yearId || !classId) return
    try {
      const result = unwrap<StudentImportResult>(await window.api.admin.importStudents({ academicYearId: yearId, classId }))
      if (result.canceled) return
      await load()
      setNotice({ message: importMessage(result), type: 'success' })
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Import gagal.', type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Data Siswa</h2>
          <p className="mt-1 text-sm text-slate-500">Tambah manual atau gunakan import Excel untuk data dalam jumlah besar.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => void downloadTemplate()}><Download size={16} /> Unduh Template</button>
          <button className="btn-secondary" onClick={() => void importExcel()} disabled={!classId}><FileSpreadsheet size={16} /> Import Excel</button>
          <button className="btn-primary" onClick={() => { setForm(emptyForm(classId)); setOpen(true) }} disabled={!classId}><Plus size={16} /> Tambah Siswa</button>
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-[220px_300px_1fr] gap-4">
          <div><label className="label">Tahun Ajaran</label><Select value={yearId} placeholder="Pilih tahun" options={years.map((year) => ({ value: year.id, label: year.label }))} onChange={(value) => setYearId(Number(value))} /></div>
          <div><label className="label">Kelas</label><Select value={classId} placeholder="Pilih kelas" options={classes.map((item) => ({ value: item.id, label: `${item.subjectName} - ${item.className}` }))} onChange={(value) => setClassId(Number(value))} /></div>
          <div><label className="label">Pencarian</label><div className="relative"><Search size={16} className="absolute left-3.5 top-3 text-slate-400" /><input className="field pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari NISN atau nama siswa..." /></div></div>
        </div>
        <p className="mt-3 text-xs text-slate-500">Import menerima file XLSX dengan kolom NISN, Nama Siswa, dan Jenis Kelamin. NISN harus 5-20 digit; jenis kelamin dapat diisi L, P, Laki-laki, atau Perempuan.</p>
        <div className="table-wrap mt-5 max-h-[520px]">
          <table className="table-base">
            <thead><tr><th>No</th><th>NISN</th><th>Nama Siswa</th><th>L/P</th><th>Kelas</th><th className="text-right">Aksi</th></tr></thead>
            <tbody>{rows.map((row, index) => (
              <tr key={`${row.id}-${row.classId}`}>
                <td>{index + 1}</td><td className="font-mono text-xs">{row.nisn}</td><td className="font-semibold">{row.namaSiswa}</td><td>{row.jenisKelamin}</td><td>{row.className}</td>
                <td className="text-right"><div className="flex justify-end gap-3"><button className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600" onClick={() => { setForm({ id: row.id, classId: row.classId ?? classId, nisn: row.nisn, namaSiswa: row.namaSiswa, jenisKelamin: row.jenisKelamin }); setOpen(true) }}><Pencil size={14} /> Edit</button><button className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600" onClick={() => void remove(row)}><Trash2 size={14} /> Hapus</button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title={form.id ? 'Edit Siswa' : 'Tambah Siswa'} onClose={closeForm} footer={<><button className="btn-secondary" onClick={closeForm}>Batal</button><button className="btn-primary" onClick={save}>Simpan</button></>}>
        <div className="space-y-4">
          <div><label className="label">Kelas</label><Select value={form.classId} placeholder="Pilih kelas" options={classes.map((item) => ({ value: item.id, label: `${item.subjectName} - ${item.className}` }))} onChange={(value) => setForm({ ...form, classId: Number(value) })} /></div>
          <div><label className="label">NISN</label><input className="field" inputMode="numeric" value={form.nisn} onChange={(event) => setForm({ ...form, nisn: event.target.value.replace(/\D/g, '') })} /><p className="mt-1.5 text-xs text-slate-500">Gunakan 5-20 digit.</p></div>
          <div><label className="label">Nama Siswa</label><input className="field" value={form.namaSiswa} onChange={(event) => setForm({ ...form, namaSiswa: event.target.value })} /></div>
          <div><label className="label">Jenis Kelamin</label><Select value={form.jenisKelamin} options={[{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]} onChange={(value) => setForm({ ...form, jenisKelamin: value as 'L' | 'P' })} /></div>
        </div>
      </Modal>
    </div>
  )
}
