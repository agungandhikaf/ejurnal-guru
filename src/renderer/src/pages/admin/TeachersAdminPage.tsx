import { useEffect, useState } from 'react'
import { Pencil, Plus, Power } from 'lucide-react'
import type { Teacher } from '@shared/types'
import { unwrap } from '../../lib/api'
import Modal from '../../components/Modal'
import Notice from '../../components/Notice'

const emptyForm = { id: 0, username: '', code: '', namaGuru: '', jabatan: 'Guru' }

export default function TeachersAdminPage(): JSX.Element {
  const [rows, setRows] = useState<Teacher[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const load = async (): Promise<void> => {
    try {
      setRows(unwrap<Teacher[]>(await window.api.admin.listTeachers()))
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Gagal memuat data guru.', type: 'error' })
    }
  }

  useEffect(() => { void load() }, [])

  const closeForm = (): void => {
    setOpen(false)
    setForm(emptyForm)
  }

  const save = async (): Promise<void> => {
    try {
      if (form.id) unwrap(await window.api.admin.updateTeacher(form))
      else unwrap(await window.api.admin.createTeacher(form))
      const wasEditing = Boolean(form.id)
      closeForm()
      await load()
      setNotice({ message: wasEditing ? 'Data guru berhasil diperbarui.' : 'Guru berhasil didaftarkan.', type: 'success' })
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Gagal menyimpan data guru.', type: 'error' })
    }
  }

  const toggle = async (teacher: Teacher): Promise<void> => {
    if (teacher.isActive && !window.confirm(`Nonaktifkan guru ${teacher.namaGuru}? Riwayat jurnal dan presensi tetap disimpan.`)) return
    try {
      unwrap(await window.api.admin.toggleTeacher(teacher.id))
      await load()
      setNotice({ message: teacher.isActive ? 'Guru dinonaktifkan.' : 'Guru diaktifkan kembali.', type: 'success' })
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : 'Gagal mengubah status guru.', type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pendaftaran Guru</h2>
          <p className="mt-1 text-sm text-slate-500">Kelola akun guru yang dapat menggunakan aplikasi.</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setOpen(true) }}><Plus size={16} /> Daftarkan Guru</button>
      </div>

      <div className="card p-6">
        <div className="table-wrap max-h-[560px]">
          <table className="table-base">
            <thead><tr><th>No</th><th>Username</th><th>Nama Guru</th><th>Jabatan</th><th>Status</th><th className="text-right">Aksi</th></tr></thead>
            <tbody>{rows.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td className="font-mono text-xs">{row.username}</td>
                <td className="font-semibold">{row.namaGuru}</td>
                <td>{row.jabatan}</td>
                <td><span className={`badge ${row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                <td className="text-right">
                  <div className="flex justify-end gap-3">
                    <button className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600" onClick={() => { setForm({ id: row.id, username: row.username, code: '', namaGuru: row.namaGuru, jabatan: row.jabatan }); setOpen(true) }}><Pencil size={14} /> Edit</button>
                    <button className={`inline-flex items-center gap-1 text-xs font-semibold ${row.isActive ? 'text-rose-600' : 'text-emerald-600'}`} onClick={() => void toggle(row)}><Power size={14} /> {row.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        title={form.id ? 'Edit Guru' : 'Daftarkan Guru'}
        onClose={closeForm}
        footer={<><button className="btn-secondary" onClick={closeForm}>Batal</button><button className="btn-primary" onClick={save}>Simpan</button></>}
      >
        <div className="space-y-4">
          <div><label className="label">Username</label><input className="field" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></div>
          <div>
            <label className="label">Kode Akses</label>
            <input type="password" className="field" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
            {form.id ? <p className="mt-1.5 text-xs text-slate-500">Kosongkan jika kode akses tidak ingin diubah.</p> : null}
          </div>
          <div><label className="label">Nama Guru</label><input className="field" value={form.namaGuru} onChange={(event) => setForm({ ...form, namaGuru: event.target.value })} /></div>
          <div><label className="label">Jabatan</label><input className="field" value={form.jabatan} onChange={(event) => setForm({ ...form, jabatan: event.target.value })} /></div>
        </div>
      </Modal>
    </div>
  )
}
