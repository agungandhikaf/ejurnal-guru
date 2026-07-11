import { useState } from 'react'
import type { LoginSession } from '@shared/types'
import LoginPage from './pages/LoginPage'
import TeacherLayout from './pages/teacher/TeacherLayout'
import AdminLayout from './pages/admin/AdminLayout'

export default function App(): JSX.Element {
  const [session, setSession] = useState<LoginSession | null>(null)
  if (!session) return <LoginPage onLogin={setSession} />
  if (session.role === 'ADMIN') return <AdminLayout session={session} onLogout={() => setSession(null)} />
  return <TeacherLayout session={session} onLogout={() => setSession(null)} />
}
