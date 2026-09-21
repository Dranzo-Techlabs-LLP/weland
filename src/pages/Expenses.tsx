import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { can, useAuth } from '../auth/AuthContext'
import { useStore } from '../data/store'
import { ROOM_NAMES } from '../lib/config'
import { CATEGORY_PILL, EXPENSE_CATEGORIES } from '../lib/permissions'
import { fmtDate, formatINR, TODAY_ISO } from '../lib/format'
import { inputCls, primaryBtnCls, secondaryBtnCls, selectCls, textareaCls, thCls, thRightCls } from '../components/styles'

const BLANK = { date: TODAY_ISO, category: EXPENSE_CATEGORIES[1], villa: ROOM_NAMES[0], bookingRef: '', description: '', amount: '' }

export function Expenses() {
  const { user } = useAuth()
  const { data, addExpense, deleteExpense } = useStore()
  const canEdit = can(user, 'edit_expenses')

  const [villa, setVilla] = useState('All rooms')
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(BLANK)

  const rows = useMemo(
    () => data.expenses.filter((e) => villa === 'All rooms' || e.villa === villa).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data.expenses, villa],
  )
  const total = rows.reduce((s, r) => s + r.amount, 0)

  function startAdd() { setForm(BLANK); setEditId(null); setOpen(true) }
  function startEdit(id: string) {
    const e = data.expenses.find((x) => x.id === id)!
    setForm({ date: e.date, category: e.category, villa: e.villa, bookingRef: e.bookingRef ?? '', description: e.description, amount: String(e.amount) })
    setEditId(id)
    setOpen(true)
  }
  function save() {
    if (!form.amount) return
    if (editId) deleteExpense(editId)
    addExpense({ date: form.date, category: form.category, villa: form.villa, bookingRef: form.bookingRef || undefined, description: form.description, amount: Math.round(Number(form.amount)) })
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
            {ROOM_NAMES.map((v) => (<option key={v}>{v}</option>))}
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
            <label className="block"><span className="mb-1 block text-[13px] font-medium text-slate-700">Room</span><select value={form.villa} onChange={(e) => setForm({ ...form, villa: e.target.value })} className={`${selectCls} w-full`}>{ROOM_NAMES.map((v) => (<option key={v}>{v}</option>))}</select></label>
            <label className="block"><span className="mb-1 block text-[13px] font-medium text-slate-700">Linked booking (optional)</span><input value={form.bookingRef} onChange={(e) => setForm({ ...form, bookingRef: e.target.value })} placeholder="KV-00700" className={`${inputCls} w-full`} /></label>
            <label className="block"><span className="mb-1 block text-[13px] font-medium text-slate-700">Amount (₹)</span><input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={`${inputCls} w-full`} /></label>
            <label className="block sm:col-span-2 lg:col-span-3"><span className="mb-1 block text-[13px] font-medium text-slate-700">Description</span><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={textareaCls} /></label>
          </div>
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
                  <td className="px-4 py-3 text-slate-700">{r.description}</td>
                  <td className="nums px-4 py-3 text-right font-semibold text-amber-600">{formatINR(r.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    {canEdit && (
                      <span className="inline-flex items-center gap-2">
                        <button onClick={() => startEdit(r.id)} className="text-slate-400 hover:text-emerald-700" aria-label="Edit"><Pencil size={15} /></button>
                        <button onClick={() => deleteExpense(r.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete"><Trash2 size={15} /></button>
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
    </>
  )
}
