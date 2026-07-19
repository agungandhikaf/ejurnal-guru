import { useEffect, useState } from 'react'
import { BookOpenText, CalendarCheck2, School, Users } from 'lucide-react'
import type { DashboardData, LoginSession } from '@shared/types'
import { unwrap } from '../../lib/api'
import CurrentDate from '../../components/CurrentDate'

export default function DashboardPage({ session }: { session: LoginSession }): JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    window.api.teacher.dashboard({ academicYearId: session.academicYearId, semesterId: session.semesterId })
      .then((r) => setData(unwrap<DashboardData>(r))).catch((e) => setError(e.message))
  }, [session])

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-[#C43670] p-7 text-white shadow-[0_16px_36px_rgba(196,54,112,0.18)]">
        <div className="absolute right-0 top-0 h-full w-2 bg-[#FFD592]" />
        <div className="flex items-start justify-between gap-6">
          <div>
            <span className="rounded-full bg-[#FFD592] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#701D42]">Profil Pendidik</span>
            <h2 className="mt-3 text-3xl font-bold">{session.namaGuru}</h2>
            <p className="mt-1 text-sm text-[#FBF4EA]">{session.jabatan} • {session.academicYearLabel} • Semester {session.semesterName === 'GANJIL' ? 'Ganjil' : 'Genap'}</p>
          </div>
          <CurrentDate />
        </div>
      </div>
      {error && <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Kelas', value: data?.totalClasses ?? 0, icon: School },
          { label: 'Total Siswa', value: data?.totalStudents ?? 0, icon: Users },
          { label: 'Presensi Hari Ini', value: data?.attendanceToday ?? 0, icon: CalendarCheck2 },
          { label: 'Jurnal Semester Ini', value: data?.totalJournals ?? 0, icon: BookOpenText }
        ].map((item, index) => <div key={item.label} className="rounded-2xl border border-[#C43670]/10 bg-white p-5 shadow-[0_10px_28px_rgba(196,54,112,0.07)]"><div className={`inline-flex rounded-xl p-2 text-[#701D42] ${index % 2 === 0 ? 'bg-[#FBDAE5]' : 'bg-[#FFD592]'}`}><item.icon size={20} /></div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#82736F]">{item.label}</p><p className="mt-1 text-3xl font-bold text-[#C43670]">{item.value}</p></div>)}
      </div>
      <div className="rounded-2xl border border-[#C43670]/10 bg-white p-6 shadow-[0_10px_28px_rgba(196,54,112,0.07)]">
        <h3 className="text-lg font-bold text-[#C43670]">Kelas yang Diampu</h3>
        <p className="mt-1 text-sm text-slate-500">Daftar kelas pada tahun ajaran aktif.</p>
        <div className="table-wrap mt-5 max-h-[420px] [&_th]:!bg-[#FBDAE5]/65 [&_th]:!text-[#554744]">
          <table className="table-base"><thead><tr><th>No</th><th>Kelas</th><th>Mata Pelajaran</th><th className="text-center">Jumlah Siswa</th></tr></thead>
            <tbody>{data?.classes.map((row, index) => <tr key={row.id}><td>{index + 1}</td><td className="font-semibold">{row.className}</td><td>{row.subjectName}</td><td className="text-center font-semibold">{row.studentCount}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
