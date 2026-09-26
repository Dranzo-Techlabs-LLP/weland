import { useState } from 'react'
import { Pencil, Plus, UserCheck, UserX } from 'lucide-react'
import { can, useAuth } from '../auth/AuthContext'
import { useStore } from '../data/store'
import { bookingRooms, FULL_PROPERTY, isFullProperty } from '../lib/config'
import { fmtDate } from '../lib/format'
import { dangerBtnCls, inputCls, primaryBtnCls, secondaryBtnCls, selectCls, thCls, thRightCls } from '../components/styles'
import { Modal } from '../components/ui/Modal'
import { RoomPicker } from '../components/ui/RoomPicker'
import type { User } from '../types'

const BLANK = { name: '', email: '', password: '', role: 'Administrator', rooms: [] as string[], fullProperty: false, active: true }

function Req() {
  return <span className="text-red-500"> *</span>
}

export function Users() {
  const { user } = useAuth()
  const { data, addUser, updateUser, setUserActive } = useStore()
  const canManage = can(user, 'manage_users')
  const roles = data.roles.map((r) => r.name)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null) // null while adding
  const [form, setForm] = useState(BLANK)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState<User | null>(null)
  const isSelf = !!editing && editing.id === user?.id

  function openAdd() {
    setEditing(null)
    setForm({ ...BLANK, role: roles[0] ?? 'Administrator' })
    setError('')
    setOpen(true)
  }
  function openEdit(u: User) {
    const villa = u.villa ?? ''
    setEditing(u)
    setForm({
      name: u.name, email: u.email, password: '', role: u.role,
      rooms: isFullProperty(villa) ? [] : bookingRooms(villa), fullProperty: isFullProperty(villa), active: u.active,
    })
    setError('')
    setOpen(true)
  }
  async function save() {
    if (!form.name.trim() || !form.email.trim()) { setError('Full name and email are required.'); return }
    if (!editing && !form.password) { setError('Password is required.'); return }
    if (form.password && form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    const fields = {
      name: form.name.trim(), email: form.email.trim(), role: form.role, active: form.active,
      villa: form.fullProperty ? FULL_PROPERTY : form.rooms.join(', '),
      ...(form.password ? { password: form.password } : {}),
    }
    setBusy(true)
    try {
      if (editing) await updateUser(editing.id, fields)
      else await addUser(fields)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the user.')
    } finally {
      setBusy(false)
    }
  }
  async function disableUser() {
    if (!confirmDisable) return
    setBusy(true)
    await setUserActive(confirmDisable.id, false)
    setBusy(false)
    setConfirmDisable(null)
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
                  <td className="px-4 py-3 text-slate-600">{u.villa || <span className="text-slate-400">—</span>}</td>
                  <td className={`px-4 py-3 font-medium ${u.active ? 'text-emerald-700' : 'text-red-600'}`}>{u.active ? 'Active' : 'Disabled'}</td>
                  <td className="nums px-4 py-3 text-slate-600">{u.lastLogin ? fmtDate(u.lastLogin) : 'Never'}</td>
                  <td className="px-4 py-3">
                    {canManage && (
                      <div className="flex items-center justify-end gap-4">
                        <button onClick={() => openEdit(u)} className="text-slate-400 hover:text-emerald-700" aria-label="Edit user" title="Edit user"><Pencil size={15} /></button>
                        {u.active ? (
                          <button onClick={() => setConfirmDisable(u)} disabled={u.id === user?.id}
                            title={u.id === user?.id ? "You can't disable your own account" : 'Disable user'}
                            className="inline-flex w-16 items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-300">
                            <UserX size={14} /> Disable
                          </button>
                        ) : (
                          <button onClick={() => setUserActive(u.id, true)} title="Enable user"
                            className="inline-flex w-16 items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800">
                            <UserCheck size={14} /> Enable
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && canManage && (
        <Modal title={editing ? 'Edit user' : 'Add user'} onClose={() => { if (!busy) setOpen(false) }}>
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
              <span className="mb-1.5 block text-[13px] font-medium text-slate-700">{editing ? 'New password' : <>Password<Req /></>}</span>
              <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? 'Leave blank to keep the current password' : ''} className={`${inputCls} h-10 w-full`} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-slate-700">Role<Req /></span>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={`${selectCls} h-10 w-full`}>
                {roles.map((r) => (<option key={r}>{r}</option>))}
              </select>
            </label>
            <div>
              <span className="mb-1.5 block text-[13px] font-medium text-slate-700">Room <span className="font-normal text-slate-400">(optional)</span></span>
              <RoomPicker rooms={form.rooms} fullProperty={form.fullProperty} onChange={(rooms, full) => setForm({ ...form, rooms, fullProperty: full })}
                fullHint="Looks after the whole property." emptyHint="Not assigned to a room." />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.active} disabled={isSelf} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700/30 disabled:opacity-50" />
              <span className="text-sm text-slate-700">Active</span>
              {isSelf && <span className="text-xs text-slate-400">— you can't disable your own account</span>}
            </label>
            {error && <p className="text-[13px] text-red-600">{error}</p>}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} disabled={busy} className={secondaryBtnCls}>Cancel</button>
            <button onClick={save} disabled={busy} className={`${primaryBtnCls} disabled:cursor-not-allowed disabled:opacity-60`}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {confirmDisable && (
        <Modal title="Disable this user?" onClose={() => { if (!busy) setConfirmDisable(null) }}>
          <p className="text-sm leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-900">{confirmDisable.name}</span> ({confirmDisable.email}) won't be able to sign in
            until you enable them again. Their bookings and records stay as they are.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setConfirmDisable(null)} disabled={busy} className={secondaryBtnCls}>Keep active</button>
            <button onClick={disableUser} disabled={busy} className={dangerBtnCls}><UserX size={15} /> {busy ? 'Disabling…' : 'Disable'}</button>
          </div>
        </Modal>
      )}
    </>
  )
}
