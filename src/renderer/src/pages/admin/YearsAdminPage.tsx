import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, Plus } from 'lucide-react'
import type { AcademicYear, Semester } from '@shared/types'
import { formatAcademicYearLabel, getSuggestedAcademicContext } from '@shared/academicYear'
import { unwrap } from '../../lib/api'
import Modal from '../../components/Modal'
import Notice from '../../components/Notice'

type YearRow = AcademicYear & { semesters: Semester[] }

export default function YearsAdminPage(): JSX.Element {
  const suggestedContext = useMemo(() => getSuggestedAcademicContext(), [])
  const [rows, setRows] = useState<YearRow[]>([])
  const [open, setOpen] = useState(false)
  const [startYear, setStartYear] = useState(suggestedContext.startYear)
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const academicYearLabel = Number.isInteger(startYear) ? formatAcademicYearLabel(startYear) : '-'

  const load = async (): Promise<void> => {
    try {
      setRows(unwrap<YearRow[]>(await window.api.admin.listYears()))
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Terjadi kesalahan.', type: 'error' })
    }
  }

  useEffect(() => { void load() }, [])

  const openCreateModal = (): void => {
    setStartYear(suggestedContext.startYear)
    setOpen(true)
  }

  const save = async (): Promise<void> => {
    try {
      unwrap(await window.api.admin.createYear({ startYear }))
      setOpen(false)
      await load()
      setNotice({ message: `Tahun ajaran ${academicYearLabel} beserta semester Ganjil dan Genap berhasil dibuat.`, type: 'success' })
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Gagal.', type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tahun Ajaran</h2>
          <p className="mt-1 text-sm text-slate-500">Satu tahun ajaran berjalan dari Juli hingga Juni dan otomatis memiliki semester Ganjil serta Genap.</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}><Plus size={16} /> Tambah Tahun Ajaran</button>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm text-indigo-900">
        <div className="flex items-center gap-3">
          <CalendarRange size={20} className="text-indigo-600" />
          <div>
            <p className="font-bold">Rekomendasi berdasarkan tanggal perangkat</p>
            <p className="mt-0.5 text-indigo-700">{suggestedContext.label} • Semester {suggestedContext.semesterName === 'GANJIL' ? 'Ganjil' : 'Genap'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {rows.map((row) => (
          <div key={row.id} className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">{row.label}</h3>
              <span className="badge bg-emerald-100 text-emerald-700">Aktif</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {row.semesters.map((semester) => (
                <div key={semester.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">Semester</p>
                  <p className="mt-1 font-bold text-slate-800">{semester.name === 'GANJIL' ? 'Ganjil' : 'Genap'}</p>
                  <p className="mt-1 text-xs text-slate-500">{semester.name === 'GANJIL' ? `Jul–Des ${row.startYear}` : `Jan–Jun ${row.endYear}`}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        title="Tambah Tahun Ajaran"
        onClose={() => setOpen(false)}
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Batal</button><button className="btn-primary" onClick={save}>Buat {academicYearLabel}</button></>}
      >
        <label className="label">Tahun Awal Ajaran</label>
        <input type="number" className="field" min={2000} max={2200} value={startYear} onChange={(e) => setStartYear(Number(e.target.value))} />
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Akan dibuat sebagai</p>
          <p className="mt-1 text-lg font-bold text-slate-900">Tahun Ajaran {academicYearLabel}</p>
          <p className="mt-1 text-sm text-slate-500">Semester Ganjil: Juli–Desember {startYear}. Semester Genap: Januari–Juni {startYear + 1}.</p>
        </div>
        <p className="mt-3 text-sm text-slate-500">Data siswa dan kelas melekat pada tahun ajaran ini. Presensi, nilai, dan jurnal tetap dipisahkan berdasarkan semester.</p>
      </Modal>
    </div>
  )
}
