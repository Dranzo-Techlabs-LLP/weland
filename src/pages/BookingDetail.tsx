import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, LogIn, LogOut, Pencil, Plus, Receipt, RotateCcw, Trash2 } from 'lucide-react'
import { can, useAuth } from '../auth/AuthContext'
import { B2B_CATEGORY, balanceOf, paidOf, useStore } from '../data/store'
import { fmtDate, formatINR, parseISO, toISO } from '../lib/format'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../lib/permissions'
import { StatusPill } from '../components/ui/StatusPill'
import { BookingActions } from '../components/ui/BookingActions'
import { Modal } from '../components/ui/Modal'
import { VillaDot } from '../components/ui/VillaDot'
import { inputCls, primaryBtnCls, secondaryBtnCls, selectCls, textareaCls } from '../components/styles'
import type { Booking, Payment } from '../types'

const todayISO = () => toISO(new Date())
const dash = <span className="text-slate-300">—</span>

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-[15px] text-slate-900">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

type PaymentDraft = { kind: Payment['kind']; date: string; amount: string; method: string; reference: string; advance: boolean }

/** Add / edit a single payment or refund — or the booking's advance (always a payment). */
function PaymentModal({ title, initial, onSave, onClose }: {
  title: string; initial: PaymentDraft; onSave: (p: Omit<Payment, 'id'>) => Promise<void>; onClose: () => void
}) {
  const [f, setF] = useState(initial)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof PaymentDraft>(k: K, v: PaymentDraft[K]) => setF((x) => ({ ...x, [k]: v }))
  async function save() {
    if (!(Number(f.amount) > 0)) { setErr('Enter an amount.'); return }
    setBusy(true)
    await onSave({
      kind: f.advance ? 'payment' : f.kind, date: f.date, amount: Math.round(Number(f.amount)),
      method: f.method, reference: f.reference.trim(), advance: f.advance,
    })
    setBusy(false)
    onClose()
  }
  return (
    <Modal title={title} onClose={() => { if (!busy) onClose() }}>
      {f.advance && <p className="mb-4 text-[13px] text-slate-500">The advance collected while booking. It counts towards the amount received.</p>}
      <div className="grid grid-cols-2 gap-3">
        {!f.advance && (
          <Field label="Type">
            <select className={`${selectCls} w-full`} value={f.kind} onChange={(e) => set('kind', e.target.value as Payment['kind'])}>
              <option value="payment">Payment</option>
              <option value="refund">Refund</option>
            </select>
          </Field>
        )}
        <Field label="Date"><input type="date" className={`${inputCls} w-full`} value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Amount (₹)"><input type="number" min={0} className={`${inputCls} w-full`} value={f.amount} onChange={(e) => set('amount', e.target.value)} autoFocus /></Field>
        <Field label="Method">
          <select className={`${selectCls} w-full`} value={f.method} onChange={(e) => set('method', e.target.value)}>
            {PAYMENT_METHODS.map((m) => (<option key={m}>{m}</option>))}
          </select>
        </Field>
        <div className={f.advance ? '' : 'col-span-2'}>
          <Field label="Reference (optional)"><input className={`${inputCls} w-full`} value={f.reference} onChange={(e) => set('reference', e.target.value)} placeholder="UPI / transaction / cheque no." /></Field>
        </div>
      </div>
      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{err}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} disabled={busy} className={secondaryBtnCls}>Cancel</button>
        <button onClick={save} disabled={busy} className={primaryBtnCls}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  )
}

/** Add an expense linked to this booking (B2B commission is managed on the booking itself). */
function ExpenseModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { addExpense } = useStore()
  const cats = EXPENSE_CATEGORIES.filter((c) => c !== B2B_CATEGORY)
  const [f, setF] = useState({ date: todayISO(), category: cats[0], amount: '', description: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!(Number(f.amount) > 0)) { setErr('Enter an amount.'); return }
    setBusy(true)
    await addExpense({ date: f.date, category: f.category, villa: booking.villa, bookingRef: booking.ref, description: f.description, amount: Math.round(Number(f.amount)) })
    setBusy(false)
    onClose()
  }
  return (
    <Modal title="Add expense" onClose={() => { if (!busy) onClose() }}>
      <p className="mb-4 text-[13px] text-slate-500">Linked to <span className="nums font-medium text-slate-700">{booking.ref}</span> · {booking.villa}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><input type="date" className={`${inputCls} w-full`} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Category">
          <select className={`${selectCls} w-full`} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {cats.map((c) => (<option key={c}>{c}</option>))}
          </select>
        </Field>
        <div className="col-span-2"><Field label="Amount (₹)"><input type="number" min={0} className={`${inputCls} w-full`} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} autoFocus /></Field></div>
        <div className="col-span-2"><Field label="Description"><textarea rows={2} className={textareaCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field></div>
      </div>
      {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{err}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} disabled={busy} className={secondaryBtnCls}>Cancel</button>
        <button onClick={save} disabled={busy} className={primaryBtnCls}>{busy ? 'Saving…' : 'Save expense'}</button>
      </div>
    </Modal>
  )
}

export function BookingDetail() {
  const { ref } = useParams<{ ref: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, addPayment, updatePayment, deletePayment, setBookingStatus } = useStore()
  const booking = data.bookings.find((b) => b.ref === ref)

  const [payModal, setPayModal] = useState<
    null | { mode: 'add'; kind: Payment['kind'] } | { mode: 'edit'; payment: Payment } | { mode: 'advance'; payment?: Payment }
  >(null)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [delPayment, setDelPayment] = useState<Payment | null>(null)
  const [busy, setBusy] = useState(false)

  if (!booking) {
    return (
      <div className="mx-auto max-w-6xl">
        <Link to="/bookings" className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> All bookings</Link>
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500 shadow-sm">Booking not found.</div>
      </div>
    )
  }

  const paid = paidOf(booking)
  const balance = balanceOf(booking)
  const b2b = data.expenses.filter((e) => e.bookingRef === booking.ref && e.category === B2B_CATEGORY).reduce((s, e) => s + e.amount, 0)
  const nights = Math.max(1, Math.round((parseISO(booking.checkOut).getTime() - parseISO(booking.checkIn).getTime()) / 86400000))
  const adults = booking.adults ?? booking.guests
  const kids = booking.kids ?? 0
  const canRecord = can(user, 'record_payments')
  const canEdit = can(user, 'edit_bookings')
  const canExpense = can(user, 'edit_expenses')
  const ledger = [...booking.payments].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const advance = booking.payments.find((p) => p.advance)

  // Check in → Check out, depending on where the stay is.
  const stayAction =
    booking.status === 'checked in' ? { label: 'Check out', icon: <LogOut size={15} />, next: 'completed' as const }
    : ['enquiry', 'hold', 'confirmed'].includes(booking.status) ? { label: 'Check in', icon: <LogIn size={15} />, next: 'checked in' as const }
    : null

  async function runStay() {
    if (!stayAction) return
    setBusy(true)
    await setBookingStatus(booking!.ref, stayAction.next)
    setBusy(false)
  }
  async function confirmDeletePayment() {
    if (!delPayment) return
    setBusy(true)
    await deletePayment(delPayment.id)
    setBusy(false)
    setDelPayment(null)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/bookings" className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> All bookings</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{booking.guest}</h1>
            <StatusPill status={booking.status} />
          </div>
          <p className="nums mt-1 text-sm text-slate-500">{booking.ref}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stayAction && canEdit && (
            <button onClick={runStay} disabled={busy} className={secondaryBtnCls}>{stayAction.icon} {stayAction.label}</button>
          )}
          <BookingActions booking={booking} variant="buttons" onDeleted={() => navigate('/bookings')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-[15px] font-semibold text-slate-900">Booking details</h2>
          <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
            <Detail label="Rooms"><span className="inline-flex items-center gap-2"><VillaDot villa={booking.villa} />{booking.villa}</span></Detail>
            <Detail label="Source">{booking.source || dash}</Detail>
            <Detail label="Check-in"><span className="nums">{fmtDate(booking.checkIn)}</span></Detail>
            <Detail label="Check-out"><span className="nums">{fmtDate(booking.checkOut)}</span></Detail>
            <Detail label="Nights"><span className="nums">{nights}</span></Detail>
            <Detail label="Guests">{adults} adult{adults === 1 ? '' : 's'} · {kids} kid{kids === 1 ? '' : 's'}</Detail>
            <Detail label="Phone">{booking.phone ? <span className="nums">{booking.phone}</span> : dash}</Detail>
            <Detail label="Alternate phone">{booking.altPhone ? <span className="nums">{booking.altPhone}</span> : dash}</Detail>
            <Detail label="Email">{booking.email || dash}</Detail>
            {booking.notes && (
              <div className="sm:col-span-2"><Detail label="Notes"><span className="whitespace-pre-line text-slate-700">{booking.notes}</span></Detail></div>
            )}
          </div>
        </section>

        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-[15px] font-semibold text-slate-900">Financials</h2>
          <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium uppercase tracking-wider text-sky-700">Advance</span>
              {canRecord && (
                <button
                  onClick={() => setPayModal({ mode: 'advance', payment: advance })}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-sky-700 hover:text-sky-900"
                >
                  {advance ? <><Pencil size={13} /> Edit</> : <><Plus size={14} /> Add advance</>}
                </button>
              )}
            </div>
            {advance ? (
              <>
                <div className="nums mt-1 text-lg font-semibold text-slate-900">{formatINR(advance.amount)}</div>
                <div className="text-[13px] text-slate-500">
                  {advance.method || 'Cash'} · <span className="nums">{fmtDate(advance.date)}</span>{advance.reference ? <> · {advance.reference}</> : null}
                </div>
              </>
            ) : (
              <div className="mt-1 text-[13px] text-slate-500">No advance collected.</div>
            )}
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-slate-500">Total</span><span className="nums font-semibold text-slate-900">{formatINR(booking.total)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">Received <span className="text-slate-400">(incl. advance)</span></span><span className="nums font-medium text-emerald-700">{formatINR(paid)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">B2B commission</span><span className="nums font-medium text-violet-600">{b2b ? `−${formatINR(b2b)}` : '—'}</span></div>
          </div>
          <div className="my-4 border-t border-slate-100" />
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[15px] font-semibold text-slate-900">Balance</span>
            <span className={`nums text-lg font-semibold ${balance > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{formatINR(balance)}</span>
          </div>
          <div className="mt-1.5 flex justify-between gap-4 text-xs text-slate-400">
            <span>Net revenue (excl. B2B)</span><span className="nums">{formatINR(paid - b2b)}</span>
          </div>
          {(canRecord || canExpense) && (
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              {canRecord && <button onClick={() => setPayModal({ mode: 'add', kind: 'payment' })} className={primaryBtnCls}><Plus size={16} /> Payment</button>}
              {canRecord && <button onClick={() => setPayModal({ mode: 'add', kind: 'refund' })} className={secondaryBtnCls}><RotateCcw size={15} /> Refund</button>}
              {canExpense && <button onClick={() => setExpenseOpen(true)} className={secondaryBtnCls}><Receipt size={15} /> Expense</button>}
            </div>
          )}
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="px-6 py-4 text-[15px] font-semibold text-slate-900">Payment ledger</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-2.5 text-left">Date</th>
                <th className="px-4 py-2.5 text-left">Type</th>
                <th className="px-4 py-2.5 text-left">Method</th>
                <th className="px-4 py-2.5 text-left">Reference</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                {canRecord && <th className="px-6 py-2.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="nums whitespace-nowrap px-6 py-3 text-slate-700">{fmtDate(p.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${p.kind === 'refund' ? 'bg-red-50 text-red-700' : p.advance ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>{p.advance ? 'advance' : p.kind}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{p.method || dash}</td>
                  <td className="px-4 py-3 text-slate-700">{p.reference || dash}</td>
                  <td className={`nums px-4 py-3 text-right font-semibold ${p.kind === 'refund' ? 'text-red-600' : 'text-emerald-700'}`}>{p.kind === 'refund' ? '−' : '+'}{formatINR(p.amount)}</td>
                  {canRecord && (
                    <td className="px-6 py-3 text-right">
                      <span className="inline-flex items-center gap-3">
                        <button onClick={() => setPayModal(p.advance ? { mode: 'advance', payment: p } : { mode: 'edit', payment: p })} className="text-slate-400 hover:text-emerald-700" aria-label="Edit payment"><Pencil size={15} /></button>
                        <button onClick={() => setDelPayment(p)} className="text-slate-400 hover:text-red-600" aria-label="Delete payment"><Trash2 size={15} /></button>
                      </span>
                    </td>
                  )}
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr><td colSpan={canRecord ? 6 : 5} className="px-6 py-10 text-center text-sm text-slate-500">No payments recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {payModal && (() => {
        const existing = payModal.mode === 'add' ? undefined : payModal.payment
        const isAdvance = payModal.mode === 'advance'
        return (
          <PaymentModal
            title={isAdvance ? (existing ? 'Edit advance' : 'Add advance') : existing ? 'Edit payment' : payModal.mode === 'add' && payModal.kind === 'refund' ? 'Record refund' : 'Record payment'}
            initial={existing
              ? { kind: existing.kind, date: existing.date, amount: String(existing.amount), method: existing.method || 'Cash', reference: existing.reference || '', advance: isAdvance }
              : { kind: payModal.mode === 'add' ? payModal.kind : 'payment', date: isAdvance && booking.createdAt ? booking.createdAt.slice(0, 10) : todayISO(), amount: '', method: 'Cash', reference: '', advance: isAdvance }}
            onSave={(p) => existing ? updatePayment(existing.id, p) : addPayment(booking.ref, p)}
            onClose={() => setPayModal(null)}
          />
        )
      })()}

      {expenseOpen && <ExpenseModal booking={booking} onClose={() => setExpenseOpen(false)} />}

      {delPayment && (
        <Modal title="Delete this payment?" onClose={() => { if (!busy) setDelPayment(null) }}>
          <p className="text-sm leading-relaxed text-slate-600">
            Remove the <span className="font-semibold text-slate-900">{delPayment.advance ? 'advance' : delPayment.kind}</span> of{' '}
            <span className="nums font-semibold text-slate-900">{formatINR(delPayment.amount)}</span> on {fmtDate(delPayment.date)}? The booking's balance will update.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setDelPayment(null)} disabled={busy} className={secondaryBtnCls}>Keep it</button>
            <button onClick={confirmDeletePayment} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60">{busy ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
