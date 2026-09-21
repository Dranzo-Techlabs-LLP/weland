import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { can, useAuth } from '../auth/AuthContext'
import { useStore } from '../data/store'
import { fmtDate } from '../lib/format'
import { inputCls, primaryBtnCls, secondaryBtnCls, selectCls, thCls, thRightCls } from '../components/styles'
import { Modal } from '../components/ui/Modal'

const BLANK = { name: '', email: '', password: '', role: 'Administrator', active: true }

function Req() {
  return <span className="text-red-500"> *</span>
}

export function Users() {
  const { user } = useAuth()
  const { data, addUser, setUserActive } = useStore()
  const canManage = can(user, 'manage_users')
  const roles = data.roles.map((r) => r.name)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [error, setError] = useState('')

  function openAdd() {
    setForm({ ...BLANK, role: roles[0] ?? 'Administrator' })
    setError('')
    setOpen(true)
  }
  function save() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Full name, email and password are required.')
      return
    }
    addUser({ name: form.name.trim(), email: form.email.trim(), role: form.role, active: form.active, password: form.password })
    setOpen(false)
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Users</h1>
        {canManage && <button onClick={openAdd} className={primaryBtnCls}><Plus size={16} /> Add user</button>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr><th className={thCls}>Name</th><th className={thCls}>Email</th><th className={thCls}>Role</th><th className={thCls}>Room</th><th className={thCls}>Status</th><th className={thCls}>Last login</th><th className={thRightCls}></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {u.name}
                    {u.id === user?.id && <span className="ml-1.5 text-xs font-medium text-emerald-600">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3"><span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{u.role}</span></td>
                  <td className="px-4 py-3 text-slate-400">{u.villa || '—'}</td>
                  <td className={`px-4 py-3 font-medium ${u.active ? 'text-emerald-700' : 'text-red-600'}`}>{u.active ? 'Active' : 'Disabled'}</td>
                  <td className="nums px-4 py-3 text-slate-600">{u.lastLogin ? fmtDate(u.lastLogin) : 'Never'}</td>
                  <td className="px-4 py-3 text-right">{canManage && <button onClick={() => setUserActive(u.id, !u.active)} className="text-slate-400 hover:text-emerald-700" aria-label="Toggle status"><Pencil size={15} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && canManage && (
        <Modal title="Add user" onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-slate-700">Full name<Req /></span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputCls} h-10 w-full`} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-slate-700">Email<Req /></span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputCls} h-10 w-full`} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-slate-700">Password<Req /></span>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`${inputCls} h-10 w-full`} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-slate-700">Role<Req /></span>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={`${selectCls} h-10 w-full`}>
                {roles.map((r) => (<option key={r}>{r}</option>))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700/30" />
              <span className="text-sm text-slate-700">Active</span>
            </label>
            {error && <p className="text-[13px] text-red-600">{error}</p>}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className={secondaryBtnCls}>Cancel</button>
            <button onClick={save} className={primaryBtnCls}>Save</button>
          </div>
        </Modal>
      )}
    </>
  )
}
