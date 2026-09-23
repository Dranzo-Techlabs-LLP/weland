import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { can, useAuth } from '../auth/AuthContext'
import { useStore } from '../data/store'
import { FULL_PROPERTY } from '../lib/config'
import { formatINR, parseISO } from '../lib/format'
import { BOOKING_STATUSES, PAYMENT_METHODS } from '../lib/permissions'
import { inputCls, primaryBtnCls, secondaryBtnCls, selectCls, textareaCls } from '../components/styles'
import { RoomPicker } from '../components/ui/RoomPicker'
import type { BookingStatus } from '../types'

const SOURCES = ['Direct', 'B2B', 'OTA', 'Walk-in']

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

/** Advance + B2B commission block. Shared by New and Edit booking. */
export function MoneyBlock({
  total, advance, advanceMethod, b2b, advanceLabel = 'Advance collected (₹)',
  onAdvance, onMethod, onB2b,
}: {
  total: number; advance: string; advanceMethod: string; b2b: string; advanceLabel?: string
  onAdvance: (v: string) => void; onMethod: (v: string) => void; onB2b: (v: string) => void
}) {
  const net = total - (Number(b2b) || 0)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={advanceLabel}><input type="number" min={0} className={`${inputCls} w-full`} value={advance} onChange={(e) => onAdvance(e.target.value)} placeholder="0" /></Field>
        <Field label="Advance method">
          <select className={`${selectCls} w-full`} value={advanceMethod} onChange={(e) => onMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (<option key={m}>{m}</option>))}
          </select>
        </Field>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="block flex-1">
            <span className="mb-1.5 block text-[13px] font-medium text-slate-700">B2B commission (₹)</span>
            <input type="number" min={0} className={`${inputCls} w-full max-w-xs`} value={b2b} onChange={(e) => onB2b(e.target.value)} placeholder="0" />
          </label>
          <div className="text-right text-sm text-slate-500">Net revenue: <span className="nums font-semibold text-emerald-700">{formatINR(net)}</span></div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {[10, 15, 20].map((pct) => (
            <button type="button" key={pct} onClick={() => onB2b(String(Math.round((total * pct) / 100)))}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">{pct}%</button>
          ))}
          <span className="ml-1 text-xs text-slate-400">B2B is booked as an expense linked to this booking. Invoice still shows the full amount.</span>
        </div>
      </div>
    </div>
  )
}

export function NewBooking() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { createBooking } = useStore()
  const [form, setForm] = useState({
    guest: '', phone: '', altPhone: '', email: '',
    rooms: [] as string[], fullProperty: false,
    checkIn: '', checkOut: '',
    adults: 2, kids: 0,
    status: 'confirmed' as BookingStatus, source: 'Direct', total: '',
    advance: '', advanceMethod: 'Cash', b2b: '', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  if (!can(user, 'edit_bookings')) return <Navigate to="/bookings" replace />

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (!form.fullProperty && form.rooms.length === 0) { setErr('Pick at least one room (or Full Property).'); return }
    if (!form.checkIn || !form.checkOut || parseISO(form.checkOut) <= parseISO(form.checkIn)) { setErr('Check-out must be after check-in.'); return }
    if (submitting) return
    setSubmitting(true)
    const villa = form.fullProperty ? FULL_PROPERTY : form.rooms.join(', ')
    const ref = await createBooking({
      guest: form.guest, phone: form.phone, altPhone: form.altPhone, email: form.email, villa,
      checkIn: form.checkIn, checkOut: form.checkOut,
      guests: Number(form.adults) + Number(form.kids), adults: Number(form.adults), kids: Number(form.kids),
      status: form.status, source: form.source, total: Math.round(Number(form.total) || 0), notes: form.notes,
      advance: Number(form.advance) || undefined,
      advanceMethod: form.advance ? form.advanceMethod : undefined,
      b2bCommission: Math.round(Number(form.b2b) || 0),
    })
    setSubmitting(false)
    if (ref) navigate(`/bookings/${ref}`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Back to bookings</Link>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New booking</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Guest name"><input className={`${inputCls} w-full`} value={form.guest} onChange={(e) => set('guest', e.target.value)} required /></Field>
          <Field label="Phone"><input className={`${inputCls} w-full`} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Email (optional)"><input type="email" className={`${inputCls} w-full`} value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Alternate mobile (optional)"><input className={`${inputCls} w-full`} value={form.altPhone} onChange={(e) => set('altPhone', e.target.value)} /></Field>
          <Field label="Source">
            <select className={`${selectCls} w-full`} value={form.source} onChange={(e) => set('source', e.target.value)}>
              {SOURCES.map((s) => (<option key={s}>{s}</option>))}
            </select>
          </Field>
        </div>

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-slate-700">Rooms</span>
          <RoomPicker rooms={form.rooms} fullProperty={form.fullProperty} onChange={(rooms, full) => setForm((f) => ({ ...f, rooms, fullProperty: full }))} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Check-in"><input type="date" className={`${inputCls} w-full`} value={form.checkIn} onChange={(e) => set('checkIn', e.target.value)} required /></Field>
          <Field label="Check-out"><input type="date" className={`${inputCls} w-full`} value={form.checkOut} onChange={(e) => set('checkOut', e.target.value)} required /></Field>
          <Field label="Adults"><input type="number" min={0} className={`${inputCls} w-full`} value={form.adults} onChange={(e) => set('adults', Number(e.target.value))} /></Field>
          <Field label="Kids"><input type="number" min={0} className={`${inputCls} w-full`} value={form.kids} onChange={(e) => set('kids', Number(e.target.value))} /></Field>
          <Field label="Status">
            <select className={`${selectCls} w-full`} value={form.status} onChange={(e) => set('status', e.target.value as BookingStatus)}>
              {BOOKING_STATUSES.map((s) => (<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>))}
            </select>
          </Field>
          <Field label="Total (₹)"><input type="number" min={0} className={`${inputCls} w-full`} value={form.total} onChange={(e) => set('total', e.target.value)} required /></Field>
        </div>

        <MoneyBlock
          total={Math.round(Number(form.total) || 0)} advance={form.advance} advanceMethod={form.advanceMethod} b2b={form.b2b}
          onAdvance={(v) => set('advance', v)} onMethod={(v) => set('advanceMethod', v)} onB2b={(v) => set('b2b', v)}
        />

        <Field label="Notes"><textarea rows={2} className={textareaCls} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anything to remember about this booking…" /></Field>

        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{err}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className={`${primaryBtnCls} disabled:cursor-not-allowed disabled:opacity-60`}>{submitting ? 'Creating…' : 'Create booking'}</button>
          <button type="button" onClick={() => navigate('/bookings')} className={secondaryBtnCls}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
