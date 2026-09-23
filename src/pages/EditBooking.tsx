import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { can, useAuth } from '../auth/AuthContext'
import { B2B_CATEGORY, useStore } from '../data/store'
import { bookingRooms, FULL_PROPERTY, isFullProperty } from '../lib/config'
import { parseISO } from '../lib/format'
import { BOOKING_STATUSES } from '../lib/permissions'
import { inputCls, primaryBtnCls, secondaryBtnCls, selectCls, textareaCls } from '../components/styles'
import { MoneyBlock } from './NewBooking'
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

export function EditBooking() {
  const { ref } = useParams<{ ref: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, updateBooking } = useStore()
  const booking = data.bookings.find((b) => b.ref === ref)
  const b2bExpense = booking ? data.expenses.find((e) => e.bookingRef === booking.ref && e.category === B2B_CATEGORY) : undefined
  const advPay = booking?.payments.find((p) => p.advance)

  const [form, setForm] = useState(() => ({
    guest: booking?.guest ?? '', phone: booking?.phone ?? '', altPhone: booking?.altPhone ?? '', email: booking?.email ?? '',
    rooms: booking && !isFullProperty(booking.villa) ? bookingRooms(booking.villa) : [],
    fullProperty: booking ? isFullProperty(booking.villa) : false,
    checkIn: booking?.checkIn ?? '', checkOut: booking?.checkOut ?? '',
    adults: booking?.adults ?? booking?.guests ?? 2, kids: booking?.kids ?? 0,
    status: (booking?.status ?? 'confirmed') as BookingStatus, source: booking?.source ?? 'Direct',
    total: booking ? String(booking.total) : '',
    advance: advPay ? String(advPay.amount) : '', advanceMethod: advPay?.method || 'Cash',
    b2b: b2bExpense ? String(b2bExpense.amount) : '',
    notes: booking?.notes ?? '',
  }))
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  if (!can(user, 'edit_bookings')) return <Navigate to="/bookings" replace />

  if (!booking) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to="/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Back to bookings</Link>
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500 shadow-sm">Booking not found.</div>
      </div>
    )
  }

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
    await updateBooking(booking!.ref, {
      guest: form.guest, phone: form.phone, altPhone: form.altPhone, email: form.email, villa,
      checkIn: form.checkIn, checkOut: form.checkOut,
      guests: Number(form.adults) + Number(form.kids), adults: Number(form.adults), kids: Number(form.kids),
      status: form.status, source: form.source, total: Math.round(Number(form.total) || 0), notes: form.notes,
      advance: Math.round(Number(form.advance) || 0), // 0 removes the advance
      advanceMethod: form.advanceMethod,
      b2bCommission: Math.round(Number(form.b2b) || 0),
    })
    setSubmitting(false)
    navigate(`/bookings/${booking!.ref}`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/bookings/${booking.ref}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Back to booking</Link>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Edit booking <span className="nums text-slate-400">· {booking.ref}</span></h1>
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

        <Field label="Notes"><textarea rows={2} className={textareaCls} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>

        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{err}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className={`${primaryBtnCls} disabled:cursor-not-allowed disabled:opacity-60`}>{submitting ? 'Saving…' : 'Save changes'}</button>
          <button type="button" onClick={() => navigate(`/bookings/${booking.ref}`)} className={secondaryBtnCls}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
