import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { can, useAuth } from '../auth/AuthContext'
import { B2B_CATEGORY, useStore } from '../data/store'
import { B2bExternalCheck } from './NewBooking'
import { bookingHasRoom, bookingRooms, FULL_PROPERTY, isFullProperty, ROOM_OPTIONS } from '../lib/config'
import { CATEGORY_PILL, EXPENSE_CATEGORIES } from '../lib/permissions'
import { fmtDate, formatINR, TODAY_ISO } from '../lib/format'
import { dangerBtnCls, inputCls, primaryBtnCls, secondaryBtnCls, selectCls, textareaCls, thCls, thRightCls } from '../components/styles'
import { Modal } from '../components/ui/Modal'
import { RoomPicker } from '../components/ui/RoomPicker'

const BLANK = { date: TODAY_ISO, category: EXPENSE_CATEGORIES[1], rooms: [] as string[], fullProperty: false, bookingRef: '', description: '', amount: '', external: false }

export function Expenses() {
  const { user } = useAuth()
  const { data, addExpense, updateExpense, deleteExpense } = useStore()
  const canEdit = can(user, 'edit_expenses')

  const [villa, setVilla] = useState('All rooms')
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(BLANK)
  const [err, setErr] = useState('')
  const [delId, setDelId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const delRow = delId ? data.expenses.find((x) => x.id === delId) : undefined

  async function confirmDelete() {
    if (!delId) return
    setDeleting(true)
    await deleteExpense(delId)
    setDeleting(false)
    setDelId(null)
  }

  const rows = useMemo(
    () => data.expenses.filter((e) => villa === 'All rooms' || bookingHasRoom(e.villa, villa)).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data.expenses, villa],
  )
  const total = rows.reduce((s, r) => s + r.amount, 0)

  function startAdd() { setForm(BLANK); setErr(''); setEditId(null); setOpen(true) }
  function startEdit(id: string) {
    const e = data.expenses.find((x) => x.id === id)!
    const full = isFullProperty(e.villa)
    setForm({ date: e.date, category: e.category, rooms: full ? [] : bookingRooms(e.villa), fullProperty: full, bookingRef: e.bookingRef ?? '', description: e.description, amount: String(e.amount), external: !!e.external })
    setErr('')
    setEditId(id)
    setOpen(true)
  }
  function save() {
    if (!form.fullProperty && form.rooms.length === 0) { setErr('Pick at least one room (or Full Property).'); return }
    if (!form.amount) { setErr('Enter an amount.'); return }
    // Link to the booking's own ref when it matches one (in any letter case)
    const typed = form.bookingRef.trim()
    const bookingRef = data.bookings.find((b) => b.ref.toLowerCase() === typed.toLowerCase())?.ref ?? typed
    // "collected externally" belongs to B2B commission entries; it is sent only when ticked, or to clear it
    const wasExternal = editId ? !!data.expenses.find((x) => x.id === editId)?.external : false
    const external = form.category === B2B_CATEGORY && form.external
    const villa = form.fullProperty ? FULL_PROPERTY : form.rooms.join(', ')
    const fields = { date: form.date, category: form.category, villa, bookingRef, description: form.description, amount: Math.round(Number(form.amount)), ...(external ? { external: true } : wasExternal ? { external: false } : {}) }
    if (editId) updateExpense(editId, fields)
    else addExpense(fields)
    setOpen(false)
    setEditId(null)
  }

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Expenses</h1>
          <p className="mt-1 text-sm text-slate-500">Total shown: <span className="nums font-semibold text-amber-600">{formatINR(total)}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <select value={villa} onChange={(e) => setVilla(e.target.value)} className={`${selectCls} h-10`}>
            <option>All rooms</option>
            {ROOM_OPTIONS.map((v) => (<option key={v}>{v}</option>))}
          </select>
          {canEdit && <button onClick={startAdd} className={primaryBtnCls}><Plus size={16} /> Add expense</button>}
        </div>
      </div>

      {open && canEdit && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-[15px] font-semibold text-slate-900">{editId ? 'Edit expense' : 'Add expense'}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block"><span className="mb-1 block text-[13px] font-medium text-slate-700">Date</span><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={`${inputCls} w-full`} /></label>
            <label className="block"><span className="mb-1 block text-[13px] font-medium text-slate-700">Category</span><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={`${selectCls} w-full`}>{EXPENSE_CATEGORIES.map((c) => (<option key={c}>{c}</option>))}</select></label>
            <label className="block"><span className="mb-1 block text-[13px] font-medium text-slate-700">Amount (₹)</span><input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={`${inputCls} w-full`} /></label>
            <div className="sm:col-span-2 lg:col-span-3">
              <span className="mb-1 block text-[13px] font-medium text-slate-700">Rooms</span>
              <RoomPicker rooms={form.rooms} fullProperty={form.fullProperty} fullHint="Shared across the whole property."
                onChange={(rooms, full) => setForm({ ...form, rooms, fullProperty: full })} />
            </div>
            <label className="block"><span className="mb-1 block text-[13px] font-medium text-slate-700">Linked booking (optional)</span><input value={form.bookingRef} onChange={(e) => setForm({ ...form, bookingRef: e.target.value })} placeholder="KV-00700" className={`${inputCls} w-full`} /></label>
            {form.category === B2B_CATEGORY && <div className="sm:col-span-2 lg:col-span-3"><B2bExternalCheck checked={form.external} onChange={(v) => setForm({ ...form, external: v })} /></div>}
            <label className="block sm:col-span-2 lg:col-span-3"><span className="mb-1 block text-[13px] font-medium text-slate-700">Description</span><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={textareaCls} /></label>
          </div>
          {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{err}</p>}
          <div className="mt-3 flex gap-2"><button onClick={save} className={primaryBtnCls}>{editId ? 'Save changes' : 'Save expense'}</button><button onClick={() => setOpen(false)} className={secondaryBtnCls}>Cancel</button></div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className={thCls}>Date</th><th className={thCls}>Category</th><th className={thCls}>Room</th>
                <th className={thCls}>Booking</th><th className={thCls}>Description</th><th className={thRightCls}>Amount</th><th className={thRightCls}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="nums whitespace-nowrap px-4 py-3 text-slate-600">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_PILL[r.category] ?? 'bg-slate-100 text-slate-600'}`}>{r.category}</span></td>
                  <td className="px-4 py-3 text-slate-700">{r.villa}</td>
                  <td className="px-4 py-3">{r.bookingRef ? <Link to={`/bookings/${r.bookingRef}`} onClick={(e) => e.stopPropagation()} className="nums text-emerald-700 hover:underline">{r.bookingRef}</Link> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-slate-700">{r.description}{r.external && <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">collected externally</span>}</td>
                  <td className="nums px-4 py-3 text-right font-semibold text-amber-600">{formatINR(r.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    {canEdit && (
                      <span className="inline-flex items-center gap-2">
                        <button onClick={() => startEdit(r.id)} className="text-slate-400 hover:text-emerald-700" aria-label="Edit"><Pencil size={15} /></button>
                        <button onClick={() => setDelId(r.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete"><Trash2 size={15} /></button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">No expenses for this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {delRow && (
        <Modal title="Delete this expense?" onClose={() => { if (!deleting) setDelId(null) }}>
          <p className="text-sm leading-relaxed text-slate-600">
            Remove the <span className="font-semibold text-slate-900">{delRow.category}</span> expense of{' '}
            <span className="nums font-semibold text-slate-900">{formatINR(delRow.amount)}</span> on {fmtDate(delRow.date)}
            {delRow.description ? <> ({delRow.description})</> : null}? This <span className="font-semibold">cannot be undone.</span>
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setDelId(null)} disabled={deleting} className={secondaryBtnCls}>Keep it</button>
            <button onClick={confirmDelete} disabled={deleting} className={`${dangerBtnCls} disabled:opacity-60`}>{deleting ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </>
  )
}
