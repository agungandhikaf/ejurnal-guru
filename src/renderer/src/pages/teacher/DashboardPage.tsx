import { useEffect, useState } from 'react'
import { BookOpenText, CalendarCheck2, School, Users } from 'lucide-react'
import type { DashboardData, LoginSession } from '@shared/types'
import { unwrap } from '../../lib/api'

export default function DashboardPage({ session }: { session: LoginSession }): JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    window.api.teacher.dashboard({ academicYearId: session.academicYearId, semesterId: session.semesterId })
      .then((r) => setData(unwrap<DashboardData>(r))).catch((e) => setError(e.message))
  }, [session])

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-700 to-indigo-500 p-7 text-white shadow-soft">
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">Profil Pendidik</span>
        <h2 className="mt-3 text-3xl font-bold">{session.namaGuru}</h2>
        <p className="mt-1 text-sm text-indigo-100">{session.jabatan} • {session.academicYearLabel} • Semester {session.semesterName === 'GANJIL' ? 'Ganjil' : 'Genap'}</p>
      </div>
      {error && <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Kelas', value: data?.totalClasses ?? 0, icon: School },
          { label: 'Total Siswa', value: data?.totalStudents ?? 0, icon: Users },
          { label: 'Presensi Hari Ini', value: data?.attendanceToday ?? 0, icon: CalendarCheck2 },
          { label: 'Jurnal Semester Ini', value: data?.totalJournals ?? 0, icon: BookOpenText }
        ].map((item) => <div key={item.label} className="card p-5"><item.icon size={20} className="text-indigo-600" /><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">{item.label}</p><p className="mt-1 text-3xl font-bold text-slate-900">{item.value}</p></div>)}
      </div>
      <div className="card p-6">
        <h3 className="text-lg font-bold text-slate-900">Kelas yang Diampu</h3>
        <p className="mt-1 text-sm text-slate-500">Daftar kelas pada tahun ajaran aktif.</p>
        <div className="table-wrap mt-5 max-h-[420px]">
          <table className="table-base"><thead><tr><th>No</th><th>Kelas</th><th>Mata Pelajaran</th><th className="text-right">Jumlah Siswa</th></tr></thead>
            <tbody>{data?.classes.map((row, index) => <tr key={row.id}><td>{index + 1}</td><td className="font-semibold">{row.className}</td><td>{row.subjectName}</td><td className="text-right font-semibold">{row.studentCount}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
