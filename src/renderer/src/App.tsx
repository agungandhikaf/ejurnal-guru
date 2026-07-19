import { useEffect, useState } from 'react'
import type { LoginSession } from '@shared/types'
import LoginPage from './pages/LoginPage'
import TeacherLayout from './pages/teacher/TeacherLayout'
import AdminLayout from './pages/admin/AdminLayout'

export default function App(): JSX.Element {
  const [session, setSession] = useState<LoginSession | null>(null)
  const [restoring, setRestoring] = useState(true)
  useEffect(() => {
    window.api.auth.session()
      .then((response) => {
        if (response.ok && response.data) setSession(response.data as LoginSession)
      })
      .finally(() => setRestoring(false))
  }, [])
  const logout = (): void => {
    void window.api.auth.logout()
    setSession(null)
  }
  if (restoring) return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500">Menyiapkan aplikasi...</div>
  if (!session) return <LoginPage onLogin={setSession} />
  if (session.role === 'ADMIN') return <AdminLayout session={session} onLogout={logout} />
  return <TeacherLayout session={session} onLogout={logout} />
}
