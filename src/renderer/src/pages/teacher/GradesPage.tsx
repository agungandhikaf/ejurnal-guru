import { useEffect, useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Plus, Save, Settings2, Trash2 } from 'lucide-react'
import type { GradeExportType, GradeSheetRow, LoginSession, SummativeGroup } from '@shared/types'
import { unwrap } from '../../lib/api'
import Modal from '../../components/Modal'
import Notice from '../../components/Notice'
import Select from '../../components/Select'
import { useClasses } from './useClasses'

interface SheetData { groups: SummativeGroup[]; rows: GradeSheetRow[] }

function calculateFinal(groups: SummativeGroup[], row: GradeSheetRow): number | null {
  if (row.pas === null || groups.length === 0) return null
  const averages: number[] = []
  for (const group of groups) {
    const values = group.components.map((component) => row.scores[String(component.id)])
    if (values.some((value) => value === null || value === undefined)) return null
    averages.push((values as number[]).reduce((sum, value) => sum + value, 0) / values.length)
  }
  const sumative = averages.reduce((sum, value) => sum + value, 0) / averages.length
  return Math.round(sumative * 0.75 + row.pas * 0.25)
}


type ComponentType = 'TGS' | 'UH'

function buildAutomaticComponentName(
  components: SummativeGroup['components'],
  currentIndex: number,
  nextType: ComponentType
): string {
  const usedNumbers = new Set<number>()
  for (const [index, component] of components.entries()) {
    if (index === currentIndex || component.type !== nextType) continue
    const match = new RegExp(`^${nextType}\\s+(\\d+)$`, 'i').exec(component.name.trim())
    if (match) usedNumbers.add(Number(match[1]))
  }

  let number = 1
  while (usedNumbers.has(number)) number += 1
  return `${nextType} ${number}`
}

export default function GradesPage({ session }: { session: LoginSession }): JSX.Element {
  const { classes } = useClasses(session.academicYearId)
  const [classId, setClassId] = useState<number | ''>('')
  const [sheet, setSheet] = useState<SheetData>({ groups: [], rows: [] })
  const [config, setConfig] = useState<SummativeGroup[]>([])
  const [configOpen, setConfigOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportType, setExportType] = useState<GradeExportType>('SUMATIF')
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => { if (!classId && classes[0]) setClassId(classes[0].id) }, [classes, classId])

  const load = async (): Promise<void> => {
    if (!classId) return
    try {
      const data = unwrap<SheetData>(await window.api.grades.getSheet({ academicYearId: session.academicYearId, semesterId: session.semesterId, classId }))
      setSheet(data)
    } catch (e) { setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat nilai.', type: 'error' }) }
  }
  useEffect(() => { void load() }, [classId])

  const openConfig = async (): Promise<void> => {
    if (!classId) return
    try {
      const data = unwrap<{ groups: SummativeGroup[] }>(await window.api.grades.getConfig({ semesterId: session.semesterId, classId }))
      setConfig(data.groups.length ? data.groups : [{ name: 'Sumatif 1', sortOrder: 1, components: [{ type: 'TGS', name: 'TGS 1', sortOrder: 1 }] }])
      setConfigOpen(true)
    } catch (e) { setNotice({ message: e instanceof Error ? e.message : 'Gagal memuat konfigurasi.', type: 'error' }) }
  }

  const saveConfig = async (): Promise<void> => {
    if (!classId) return
    try {
      unwrap(await window.api.grades.saveConfig({ semesterId: session.semesterId, classId, groups: config }))
      setConfigOpen(false)
      await load()
      setNotice({ message: 'Komponen nilai berhasil disimpan.', type: 'success' })
    } catch (e) { setNotice({ message: e instanceof Error ? e.message : 'Gagal menyimpan konfigurasi.', type: 'error' }) }
  }

  const setScore = (studentId: number, componentId: string, value: string): void => {
    const score = value === '' ? null : Math.max(0, Math.min(100, Math.trunc(Number(value))))
    setSheet((current) => ({ ...current, rows: current.rows.map((row) => row.id === studentId ? { ...row, scores: { ...row.scores, [componentId]: score } } : row) }))
  }

  const setPas = (studentId: number, value: string): void => {
    const score = value === '' ? null : Math.max(0, Math.min(100, Math.trunc(Number(value))))
    setSheet((current) => ({ ...current, rows: current.rows.map((row) => row.id === studentId ? { ...row, pas: score } : row) }))
  }

  const saveScores = async (): Promise<void> => {
    if (!classId) return
    try {
      unwrap(await window.api.grades.saveScores({ academicYearId: session.academicYearId, semesterId: session.semesterId, classId, rows: sheet.rows.map((row) => ({ studentId: row.id, scores: row.scores, pas: row.pas })) }))
      await load()
      setNotice({ message: 'Semua nilai berhasil disimpan.', type: 'success' })
    } catch (e) { setNotice({ message: e instanceof Error ? e.message : 'Gagal menyimpan nilai.', type: 'error' }) }
  }

  const exportScores = async (): Promise<void> => {
    if (!classId) return
    setExporting(true)
    try {
      const filePath = unwrap<string | null>(await window.api.grades.export({
        type: exportType,
        academicYearId: session.academicYearId,
        semesterId: session.semesterId,
        classId
      }))
      if (filePath) {
        setExportOpen(false)
        setNotice({
          message: `${exportType === 'SUMATIF' ? 'Nilai Sumatif' : 'Nilai PAS'} berhasil diekspor.`,
          type: 'success'
        })
      }
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : 'Gagal mengekspor nilai.', type: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const allComponents = useMemo(() => sheet.groups.flatMap((group) => group.components), [sheet.groups])

  return (
    <div className="space-y-6">
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
      <div className="flex items-end justify-between"><div><h2 className="text-2xl font-bold text-slate-900">Rekap & Input Nilai</h2><p className="mt-1 text-sm text-slate-500">Nilai akhir = 75% rata-rata sumatif + 25% PAS, dibulatkan ke bilangan bulat terdekat.</p></div><div className="flex gap-2"><button className="btn-secondary" onClick={() => setExportOpen(true)} disabled={!classId}><FileSpreadsheet size={16} /> Export Excel</button><button className="btn-secondary" onClick={openConfig} disabled={!classId}><Settings2 size={16} /> Atur Komponen</button><button className="btn-primary" onClick={saveScores} disabled={!classId || !sheet.groups.length}><Save size={16} /> Simpan Nilai</button></div></div>
      <div className="card p-6">
        <div className="max-w-md"><label className="label">Kelas & Mata Pelajaran</label><Select value={classId} placeholder="Pilih kelas" options={classes.map((item) => ({ value: item.id, label: `${item.subjectName} - ${item.className}` }))} onChange={(value) => setClassId(Number(value))} /></div>
        {!sheet.groups.length ? <div className="mt-6 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-10 text-center"><Settings2 className="mx-auto text-indigo-500" /><h3 className="mt-3 font-bold text-slate-900">Komponen nilai belum diatur</h3><p className="mt-1 text-sm text-slate-500">Buat Sumatif, TGS, dan UH sesuai kebutuhan semester ini.</p><button className="btn-primary mt-5" onClick={openConfig}>Atur Komponen Nilai</button></div> : (
          <div className="table-wrap mt-6 max-h-[560px]"><table className="min-w-max border-collapse text-sm"><thead className="sticky top-0 z-20"><tr><th rowSpan={2} className="sticky left-0 z-30 min-w-14 bg-slate-100 px-3 py-3">No</th><th rowSpan={2} className="sticky left-14 z-30 min-w-64 bg-slate-100 px-3 py-3 text-left">Nama Siswa</th>{sheet.groups.map((group) => <th key={group.id ?? group.name} colSpan={group.components.length} className="border-l border-slate-200 bg-indigo-50 px-3 py-2 text-center text-xs font-bold uppercase text-indigo-700">{group.name}</th>)}<th rowSpan={2} className="border-l border-slate-200 bg-amber-50 px-4 py-3 text-center text-xs font-bold text-amber-700">PAS</th><th rowSpan={2} className="bg-indigo-600 px-4 py-3 text-center text-xs font-bold text-white">Nilai Akhir</th></tr><tr>{allComponents.map((component) => <th key={component.id} className="border-l border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-500">{component.name}</th>)}</tr></thead><tbody>{sheet.rows.map((row, index) => { const finalScore = calculateFinal(sheet.groups, row); return <tr key={row.id} className="border-t border-slate-100"><td className="sticky left-0 z-10 bg-white px-3 py-2 text-center">{index + 1}</td><td className="sticky left-14 z-10 bg-white px-3 py-2 font-semibold text-slate-800">{row.namaSiswa}<span className="ml-2 text-[10px] font-normal text-slate-400">{row.nisn}</span></td>{allComponents.map((component) => <td key={component.id} className="border-l border-slate-100 px-2 py-2"><input type="number" min={0} max={100} step={1} className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center outline-none focus:border-indigo-500" value={row.scores[String(component.id)] ?? ''} onChange={(e) => setScore(row.id, String(component.id), e.target.value)} /></td>)}<td className="border-l border-slate-100 bg-amber-50/30 px-2 py-2"><input type="number" min={0} max={100} step={1} className="w-16 rounded-lg border border-amber-200 px-2 py-1.5 text-center outline-none focus:border-amber-500" value={row.pas ?? ''} onChange={(e) => setPas(row.id, e.target.value)} /></td><td className="bg-indigo-50 px-4 py-2 text-center font-bold text-indigo-700">{finalScore ?? <span className="text-[10px] font-medium text-slate-400">Belum lengkap</span>}</td></tr> })}</tbody></table></div>
        )}
      </div>


      <Modal
        open={exportOpen}
        title="Export Nilai ke Excel"
        onClose={() => !exporting && setExportOpen(false)}
        width="max-w-xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setExportOpen(false)} disabled={exporting}>Batal</button>
            <button className="btn-primary" onClick={exportScores} disabled={exporting || !classId}>
              <Download size={16} /> {exporting ? 'Menyiapkan...' : 'Export Excel'}
            </button>
          </>
        }
      >
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Export menggunakan nilai terakhir yang sudah disimpan. Simpan perubahan nilai terlebih dahulu sebelum melanjutkan.
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setExportType('SUMATIF')}
            className={`rounded-2xl border p-5 text-left transition ${exportType === 'SUMATIF' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-3"><FileSpreadsheet className="text-indigo-600" size={22} /><span className="font-bold text-slate-900">Sumatif</span></div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Satu sheet untuk setiap Sumatif yang dikonfigurasi.</p>
          </button>
          <button
            type="button"
            onClick={() => setExportType('PAS')}
            className={`rounded-2xl border p-5 text-left transition ${exportType === 'PAS' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-3"><FileSpreadsheet className="text-indigo-600" size={22} /><span className="font-bold text-slate-900">PAS</span></div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Mengisi nilai PAS yang tersimpan pada semester aktif.</p>
          </button>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">Kolom ID Siswa dan NIS sengaja dikosongkan. Nama, Materi, dan KKTP pada bagian identitas tetap diisi manual oleh guru.</p>
      </Modal>

      <Modal open={configOpen} title="Atur Komponen Nilai" onClose={() => setConfigOpen(false)} width="max-w-4xl" footer={<><button className="btn-secondary" onClick={() => setConfigOpen(false)}>Batal</button><button className="btn-primary" onClick={saveConfig}><Save size={16} /> Simpan Konfigurasi</button></>}>
        <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-800">Setiap sumatif dihitung dari rata-rata komponennya. Semua sumatif kemudian dirata-ratakan dengan bobot sama.</div>
        <div className="mt-5 space-y-4">{config.map((group, groupIndex) => <div key={group.id ?? `new-${groupIndex}`} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center gap-3"><input className="field font-semibold" value={group.name} onChange={(e) => setConfig((current) => current.map((item, i) => i === groupIndex ? { ...item, name: e.target.value } : item))} /><button className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" onClick={() => setConfig((current) => current.filter((_, i) => i !== groupIndex))}><Trash2 size={18} /></button></div><div className="mt-4 space-y-2">{group.components.map((component, componentIndex) => <div key={component.id ?? `component-${componentIndex}`} className="grid grid-cols-[200px_minmax(0,1fr)_40px] items-center gap-2"><Select value={component.type} options={[{ value: 'TGS', label: 'Tugas (TGS)' }, { value: 'UH', label: 'Ulangan (UH)' }]} onChange={(value) => setConfig((current) => current.map((g, gi) => {
          if (gi !== groupIndex) return g
          const nextType = value as ComponentType
          return {
            ...g,
            components: g.components.map((c, ci) => ci === componentIndex
              ? { ...c, type: nextType, name: buildAutomaticComponentName(g.components, componentIndex, nextType) }
              : c)
          }
        }))} /><input className="field min-w-0" value={component.name} onChange={(e) => setConfig((current) => current.map((g, gi) => gi === groupIndex ? { ...g, components: g.components.map((c, ci) => ci === componentIndex ? { ...c, name: e.target.value } : c) } : g))} placeholder="Nama komponen" /><button className="rounded-lg p-2 text-rose-400 hover:bg-rose-50" onClick={() => setConfig((current) => current.map((g, gi) => gi === groupIndex ? { ...g, components: g.components.filter((_, ci) => ci !== componentIndex) } : g))}><Trash2 size={16} /></button></div>)}</div><button className="btn-secondary mt-3" onClick={() => setConfig((current) => current.map((g, gi) => gi === groupIndex ? { ...g, components: [...g.components, { type: 'TGS', name: `TGS ${g.components.filter((c) => c.type === 'TGS').length + 1}`, sortOrder: g.components.length + 1 }] } : g))}><Plus size={15} /> Tambah Komponen</button></div>)}</div>
        <button className="btn-secondary mt-5 w-full border-dashed" onClick={() => setConfig((current) => [...current, { name: `Sumatif ${current.length + 1}`, sortOrder: current.length + 1, components: [{ type: 'TGS', name: 'TGS 1', sortOrder: 1 }] }])}><Plus size={16} /> Tambah Sumatif</button>
      </Modal>
    </div>
  )
}
