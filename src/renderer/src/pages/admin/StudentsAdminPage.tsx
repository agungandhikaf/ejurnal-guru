import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, Search } from 'lucide-react'
import type { AcademicYear, SchoolClass, Semester, Student } from '@shared/types'
import { unwrap } from '../../lib/api'
import Notice from '../../components/Notice'
import Select from '../../components/Select'

type YearRow = AcademicYear & { semesters: Semester[] }

export default function StudentsAdminPage(): JSX.Element {
  const [years, setYears] = useState<YearRow[]>([])
  const [yearId, setYearId] = useState<number | ''>('')
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [classId, setClassId] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Student[]>([])
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    window.api.admin.listYears().then((response) => {
      try {
        const data = unwrap<YearRow[]>(response)
        setYears(data)
        if (data[0]) setYearId(data[0].id)
      } catch (e) {
        setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat tahun.', type: 'error' })
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
      } catch (e) {
        setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat kelas.', type: 'error' })
      }
    })
  }, [yearId])

  const load = async (): Promise<void> => {
    if (!yearId) return
    try {
      setRows(unwrap<Student[]>(await window.api.admin.listStudents({ academicYearId: yearId, classId: classId || undefined, search })))
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat siswa.', type: 'error' })
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 150)
    return () => clearTimeout(timer)
  }, [yearId, classId, search])

  const importExcel = async (): Promise<void> => {
    if (!yearId || !classId) return
    try {
      const result = unwrap<{ inserted: number; updated: number; skipped: number }>(await window.api.admin.importStudents({ academicYearId: yearId, classId }))
      await load()
      setNotice({ message: `Import selesai: ${result.inserted} siswa baru, ${result.updated} diperbarui, ${result.skipped} dilewati.`, type: 'success' })
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Import gagal.', type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Data Siswa</h2>
          <p className="mt-1 text-sm text-slate-500">Gunakan import Excel untuk menambahkan siswa dalam jumlah besar.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => window.api.admin.createStudentTemplate()}><Download size={16} /> Unduh Template</button>
          <button className="btn-primary" onClick={importExcel} disabled={!classId}><FileSpreadsheet size={16} /> Import Excel</button>
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-[220px_300px_1fr] gap-4">
          <div>
            <label className="label">Tahun Ajaran</label>
            <Select value={yearId} placeholder="Pilih tahun" options={years.map((year) => ({ value: year.id, label: year.label }))} onChange={(value) => setYearId(Number(value))} />
          </div>
          <div>
            <label className="label">Kelas Tujuan Import</label>
            <Select value={classId} placeholder="Pilih kelas" options={classes.map((item) => ({ value: item.id, label: `${item.subjectName} - ${item.className}` }))} onChange={(value) => setClassId(Number(value))} />
          </div>
          <div>
            <label className="label">Pencarian</label>
            <div className="relative"><Search size={16} className="absolute left-3.5 top-3 text-slate-400" /><input className="field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
        </div>
        <div className="table-wrap mt-5 max-h-[520px]">
          <table className="table-base">
            <thead><tr><th>No</th><th>NISN</th><th>Nama Siswa</th><th>L/P</th><th>Kelas</th></tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.id}><td>{index + 1}</td><td className="font-mono text-xs">{row.nisn}</td><td className="font-semibold">{row.namaSiswa}</td><td>{row.jenisKelamin}</td><td>{row.className}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
