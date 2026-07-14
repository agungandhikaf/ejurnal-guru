import { useState } from 'react'
import {
  LayoutDashboard, ClipboardCheck, CalendarCheck2, ChartNoAxesColumnIncreasing,
  Star, Users, BookOpenText, LogOut, GraduationCap
} from 'lucide-react'
import type { LoginSession } from '@shared/types'
import AppCopyright from '../../components/AppCopyright'
import DashboardPage from './DashboardPage'
import AttendancePage from './AttendancePage'
import DailyAttendancePage from './DailyAttendancePage'
import AttendanceRecapPage from './AttendanceRecapPage'
import GradesPage from './GradesPage'
import StudentsPage from './StudentsPage'
import JournalsPage from './JournalsPage'

interface Props { session: LoginSession; onLogout: () => void }
type Page = 'dashboard' | 'attendance' | 'daily' | 'recap' | 'grades' | 'students' | 'journals'

const nav = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'attendance' as const, label: 'Input Presensi', icon: ClipboardCheck },
  { id: 'daily' as const, label: 'Absensi Harian', icon: CalendarCheck2 },
  { id: 'recap' as const, label: 'Rekap Absen', icon: ChartNoAxesColumnIncreasing },
  { id: 'grades' as const, label: 'Rekap & Input Nilai', icon: Star },
  { id: 'students' as const, label: 'Kelola Siswa', icon: Users },
  { id: 'journals' as const, label: 'Jurnal Mengajar', icon: BookOpenText }
]

export default function TeacherLayout({ session, onLogout }: Props): JSX.Element {
  const [page, setPage] = useState<Page>('dashboard')
  const content = {
    dashboard: <DashboardPage session={session} />,
    attendance: <AttendancePage session={session} />,
    daily: <DailyAttendancePage session={session} />,
    recap: <AttendanceRecapPage session={session} />,
    grades: <GradesPage session={session} />,
    students: <StudentsPage session={session} />,
    journals: <JournalsPage session={session} />
  }[page]

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="flex w-72 shrink-0 flex-col justify-between bg-[#111625] text-slate-400">
        <div>
          <div className="flex items-center gap-3 border-b border-slate-800 px-5 pb-5 pt-10">
            <div className="rounded-xl bg-indigo-600 p-3 text-white shadow-lg"><GraduationCap size={22} /></div>
            <div>
              <h1 className="font-bold text-white">E-Jurnal Guru</h1>
              <p className="mt-0.5 text-xs text-emerald-400">● Aktif</p>
            </div>
          </div>
          <nav className="space-y-1 p-4">
            {nav.map((item) => {
              const Icon = item.icon
              const active = page === item.id
              return (
                <button key={item.id} onClick={() => setPage(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/60 hover:text-white'}`}>
                  <Icon size={18} /> {item.label}
                </button>
              )
            })}
          </nav>
        </div>
        <div className="border-t border-slate-800 p-4">
          <div className="rounded-xl bg-slate-900/60 p-3">
            <p className="truncate text-sm font-semibold text-white">{session.namaGuru}</p>
            <p className="mt-1 text-xs text-slate-500">{session.academicYearLabel} • {session.semesterName === 'GANJIL' ? 'Semester Ganjil' : 'Semester Genap'}</p>
          </div>
          <button onClick={onLogout} className="mt-3 flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"><LogOut size={16} /> Keluar</button>
        </div>
      </aside>
      <main className="app-main"><div className="page-host">{content}</div><AppCopyright /></main>
    </div>
  )
}
