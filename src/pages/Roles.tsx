import { useState } from 'react'
import { Plus } from 'lucide-react'
import { can, useAuth } from '../auth/AuthContext'
import { roleMemberCount, useStore } from '../data/store'
import { PERMISSIONS } from '../lib/permissions'
import { inputCls, primaryBtnCls } from '../components/styles'

export function Roles() {
  const { user } = useAuth()
  const { data, saveRoleRights, addRole } = useStore()
  const canManage = can(user, 'manage_users')

  const [selectedId, setSelectedId] = useState(data.roles[0]?.id ?? '')
  const [drafts, setDrafts] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(data.roles.map((r) => [r.id, new Set(r.rights)])),
  )
  const [addingRole, setAddingRole] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [msg, setMsg] = useState('')

  const selected = data.roles.find((r) => r.id === selectedId)
  const draft = drafts[selectedId] ?? new Set(selected?.rights ?? [])

  function toggle(key: string) {
    if (!canManage) return
    setDrafts((d) => {
      const next = new Set(d[selectedId] ?? selected?.rights ?? [])
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return { ...d, [selectedId]: next }
    })
  }
  function saveRights() {
    saveRoleRights(selectedId, Array.from(draft))
    setMsg('Rights saved.')
  }
  function createRole() {
    if (!newRole.trim()) return
    addRole(newRole.trim())
    setNewRole('')
    setAddingRole(false)
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Roles &amp; rights</h1>
        <p className="mt-1 text-sm text-slate-500">Control what each role can see and do.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between px-2 py-2">
            <h2 className="text-[15px] font-semibold text-slate-900">Roles</h2>
            {canManage && <button onClick={() => setAddingRole((a) => !a)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-medium text-emerald-700 hover:bg-emerald-50"><Plus size={14} /> New role</button>}
          </div>
          {addingRole && canManage && (
            <div className="mb-2 flex gap-2 px-2">
              <input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Role name" className={`${inputCls} w-full`} />
              <button onClick={createRole} className={primaryBtnCls}>Add</button>
            </div>
          )}
          <div className="space-y-0.5">
            {data.roles.map((r) => {
              const active = r.id === selectedId
              return (
                <button key={r.id} onClick={() => setSelectedId(r.id)} className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${active ? 'bg-emerald-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    {r.system && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>system</span>}
                  </span>
                  <span className={`nums rounded-full px-1.5 text-[11px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{roleMemberCount(data, r.name)}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">{selected?.name} permissions</h2>
            {canManage && <button onClick={saveRights} className={primaryBtnCls}>Save rights</button>}
          </div>
          {!canManage && <p className="mt-1 text-[13px] text-slate-400">You have read-only access to roles.</p>}
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {PERMISSIONS.map((p) => (
              <label key={p.key} className={`flex items-center gap-3 rounded-lg px-2 py-2 ${canManage ? 'cursor-pointer hover:bg-slate-50' : ''}`}>
                <input type="checkbox" checked={draft.has(p.key)} onChange={() => toggle(p.key)} disabled={!canManage} className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700/30 disabled:opacity-60" />
                <span className="text-sm text-slate-700">{p.label}</span>
              </label>
            ))}
          </div>
          {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
        </div>
      </div>
    </>
  )
}
