import { useEffect, useMemo, useState } from 'react'
import { BookOpenCheck, CalendarDays, LockKeyhole, UserRound } from 'lucide-react'
import type { AcademicYear, LoginSession, Semester } from '@shared/types'
import { getSuggestedAcademicContext } from '@shared/academicYear'
import { unwrap } from '../lib/api'
import Select from '../components/Select'

interface Props {
  onLogin: (session: LoginSession) => void
}

type YearWithSemesters = AcademicYear & { semesters: Semester[] }
type LoginRole = 'GURU' | 'ADMIN'

const usernameStorageKey = (role: LoginRole): string =>
  `ejurnal.login.username.${role.toLowerCase()}`

export default function LoginPage({ onLogin }: Props): JSX.Element {
  const [role, setRole] = useState<LoginRole>('GURU')
  const [username, setUsername] = useState('')
  const [code, setCode] = useState('')
  const [rememberUsername, setRememberUsername] = useState(false)
  const [years, setYears] = useState<YearWithSemesters[]>([])
  const [yearId, setYearId] = useState<number | ''>('')
  const [semesterId, setSemesterId] = useState<number | ''>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const remembered = window.localStorage.getItem(usernameStorageKey(role))
    setUsername(remembered ?? '')
    setRememberUsername(Boolean(remembered))
    setCode('')
  }, [role])

  useEffect(() => {
    window.api.auth.options().then((response) => {
      try {
        const data = unwrap<{ years: YearWithSemesters[] }>(response)
        const suggested = getSuggestedAcademicContext()
        const selectedYear = data.years.find((year) => year.startYear === suggested.startYear) ?? data.years[0]
        const selectedSemester = selectedYear?.semesters.find((semester) => semester.name === suggested.semesterName)
          ?? selectedYear?.semesters[0]

        setYears(data.years)
        setYearId(selectedYear?.id ?? '')
        setSemesterId(selectedSemester?.id ?? '')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal memuat tahun ajaran.')
      }
    })
  }, [])

  const semesters = useMemo(() => years.find((year) => year.id === yearId)?.semesters ?? [], [years, yearId])

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    setLoading(true)
    setError('')

    const normalizedUsername = username.trim()

    try {
      const session = unwrap<LoginSession>(
        await window.api.auth.login({
          role,
          username: normalizedUsername,
          code,
          academicYearId: role === 'GURU' ? yearId : undefined,
          semesterId: role === 'GURU' ? semesterId : undefined
        })
      )

      if (rememberUsername) {
        window.localStorage.setItem(usernameStorageKey(role), normalizedUsername)
      } else {
        window.localStorage.removeItem(usernameStorageKey(role))
      }

      onLogin(session)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login gagal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <section className="relative flex w-[48%] flex-col justify-between overflow-hidden bg-[#111625] p-14 text-white">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur">
            <div className="rounded-xl bg-indigo-600 p-3"><BookOpenCheck size={28} /></div>
            <div>
              <h1 className="text-xl font-bold">E-Jurnal Guru</h1>
              <p className="text-xs text-slate-300">Presensi, nilai, siswa, dan jurnal dalam satu aplikasi.</p>
            </div>
          </div>
        </div>
        <div className="relative z-10 max-w-xl">
          <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200">Desktop Offline • macOS Apple Silicon</span>
          <h2 className="mt-5 text-4xl font-bold leading-tight">Administrasi mengajar yang rapi tanpa bergantung pada internet.</h2>
          <p className="mt-4 text-base leading-7 text-slate-300">Data disimpan lokal, dipisahkan berdasarkan tahun ajaran dan semester, serta dapat dicadangkan kapan pun.</p>
        </div>
        <p className="relative z-10 text-xs text-slate-500">© 2026 E-Jurnal Guru</p>
      </section>

      <section className="flex flex-1 items-center justify-center p-12">
        <form onSubmit={submit} className="card w-full max-w-lg p-8">
          <h2 className="text-2xl font-bold text-slate-900">Masuk ke aplikasi</h2>
          <p className="mt-2 text-sm text-slate-500">Pilih jenis akses yang sesuai.</p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
            {(['GURU', 'ADMIN'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => { setRole(item); setError('') }}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${role === item ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {item === 'GURU' ? 'Login Guru' : 'Login Admin'}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="label"><UserRound size={13} className="mr-1 inline" /> Username</label>
              <input
                className="field"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={role === 'ADMIN' ? 'root' : 'Username guru'}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label className="label"><LockKeyhole size={13} className="mr-1 inline" /> Kode</label>
              <input
                className="field"
                type="password"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Masukkan kode akses"
                autoComplete="current-password"
              />
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={rememberUsername}
                  onChange={(event) => {
                    const checked = event.target.checked
                    setRememberUsername(checked)
                    if (!checked) window.localStorage.removeItem(usernameStorageKey(role))
                  }}
                  className="h-4 w-4 accent-indigo-600"
                />
                Ingat username
              </span>
              <span className="text-xs text-slate-400">Kode tidak disimpan</span>
            </label>

            {role === 'GURU' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label"><CalendarDays size={13} className="mr-1 inline" /> Tahun Ajaran</label>
                  <Select
                    value={yearId}
                    placeholder="Pilih tahun"
                    options={years.map((year) => ({ value: year.id, label: year.label }))}
                    onChange={(value) => {
                      const id = Number(value)
                      const selectedYear = years.find((year) => year.id === id)
                      const suggested = getSuggestedAcademicContext()
                      const selectedSemester = selectedYear?.startYear === suggested.startYear
                        ? selectedYear.semesters.find((semester) => semester.name === suggested.semesterName)
                        : selectedYear?.semesters[0]

                      setYearId(id)
                      setSemesterId(selectedSemester?.id ?? selectedYear?.semesters[0]?.id ?? '')
                    }}
                  />
                </div>

                <div>
                  <label className="label">Semester</label>
                  <Select
                    value={semesterId}
                    placeholder="Pilih semester"
                    options={semesters.map((semester) => ({
                      value: semester.id,
                      label: semester.name === 'GANJIL' ? 'Ganjil' : 'Genap'
                    }))}
                    onChange={(value) => setSemesterId(Number(value))}
                  />
                </div>
              </div>
            )}
          </div>

          {role === 'GURU' && years.length > 0 && (
            <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
              Pilihan awal mengikuti tanggal perangkat: <strong>{getSuggestedAcademicContext().label}</strong> • Semester <strong>{getSuggestedAcademicContext().semesterName === 'GANJIL' ? 'Ganjil' : 'Genap'}</strong>. Guru tetap dapat memilih konteks lain.
            </div>
          )}

          {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

          {role === 'GURU' && years.length === 0 && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Admin perlu membuat tahun ajaran terlebih dahulu.
            </div>
          )}

          <button className="btn-primary mt-6 w-full py-3" disabled={loading || (role === 'GURU' && (!yearId || !semesterId))}>
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>

          {role === 'ADMIN' && <p className="mt-4 text-center text-xs text-slate-400">Akun awal: root / 0102</p>}
        </form>
      </section>
    </div>
  )
}
