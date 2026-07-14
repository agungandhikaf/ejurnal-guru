import { useState } from 'react'
import { CalendarRange, GraduationCap, LogOut, School, Settings, Users, UserRoundCog } from 'lucide-react'
import type { LoginSession } from '@shared/types'
import AppCopyright from '../../components/AppCopyright'
import TeachersAdminPage from './TeachersAdminPage'
import YearsAdminPage from './YearsAdminPage'
import ClassesAdminPage from './ClassesAdminPage'
import StudentsAdminPage from './StudentsAdminPage'
import MaintenancePage from './MaintenancePage'

interface Props { session: LoginSession; onLogout: () => void }
type Page = 'teachers' | 'years' | 'classes' | 'students' | 'maintenance'
const nav = [
  { id: 'teachers' as const, label: 'Pendaftaran Guru', icon: UserRoundCog },
  { id: 'years' as const, label: 'Tahun Ajaran', icon: CalendarRange },
  { id: 'classes' as const, label: 'Pendaftaran Kelas', icon: School },
  { id: 'students' as const, label: 'Data Siswa', icon: Users },
  { id: 'maintenance' as const, label: 'Maintenance', icon: Settings }
]

export default function AdminLayout({ session, onLogout }: Props): JSX.Element {
  const [page, setPage] = useState<Page>('teachers')
  const content = {
    teachers: <TeachersAdminPage />,
    years: <YearsAdminPage />,
    classes: <ClassesAdminPage />,
    students: <StudentsAdminPage />,
    maintenance: <MaintenancePage />
  }[page]
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="flex w-72 shrink-0 flex-col justify-between bg-[#111625] text-slate-400">
        <div><div className="flex items-center gap-3 border-b border-slate-800 px-5 pb-5 pt-10"><div className="rounded-xl bg-indigo-600 p-3 text-white"><GraduationCap size={22} /></div><div><h1 className="font-bold text-white">E-Jurnal Guru</h1><p className="text-xs text-indigo-300">Panel Administrator</p></div></div><nav className="space-y-1 p-4">{nav.map((item) => { const Icon = item.icon; const active = page === item.id; return <button key={item.id} onClick={() => setPage(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/60 hover:text-white'}`}><Icon size={18} /> {item.label}</button> })}</nav></div>
        <div className="border-t border-slate-800 p-4"><div className="rounded-xl bg-slate-900/60 p-3"><p className="font-semibold text-white">{session.namaGuru}</p><p className="mt-1 text-xs text-slate-500">Akses administrator</p></div><button onClick={onLogout} className="mt-3 flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-rose-500/10 hover:text-rose-300"><LogOut size={16} /> Keluar</button></div>
      </aside>
      <main className="app-main"><div className="page-host">{content}</div><AppCopyright /></main>
    </div>
  )
}
