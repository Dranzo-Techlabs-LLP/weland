import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { can, useAuth } from '../auth/AuthContext'
import { useStore } from '../data/store'
import { ROOM_NAMES, roomCapacity } from '../lib/config'
import { parseISO } from '../lib/format'
import { BOOKING_STATUSES } from '../lib/permissions'
import { inputCls, primaryBtnCls, secondaryBtnCls, selectCls } from '../components/styles'
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

  const [form, setForm] = useState(() => ({
    guest: booking?.guest ?? '', phone: booking?.phone ?? '', email: booking?.email ?? '',
    villa: booking?.villa ?? ROOM_NAMES[0], checkIn: booking?.checkIn ?? '', checkOut: booking?.checkOut ?? '',
    guests: booking?.guests ?? 2, status: (booking?.status ?? 'confirmed') as BookingStatus,
    source: booking?.source ?? 'Direct', total: booking ? String(booking.total) : '',
  }))
  const [submitting, setSubmitting] = useState(false)

  if (!can(user, 'edit_bookings')) return <Navigate to="/bookings" replace />

  if (!booking) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to="/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Back to bookings</Link>
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500 shadow-sm">Booking not found.</div>
      </div>
    )
  }

  const cap = roomCapacity(form.villa)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.checkIn || !form.checkOut || parseISO(form.checkOut) <= parseISO(form.checkIn)) return
    if (submitting) return
    setSubmitting(true)
    await updateBooking(booking!.ref, {
      guest: form.guest, phone: form.phone, email: form.email, villa: form.villa,
      checkIn: form.checkIn, checkOut: form.checkOut, guests: Number(form.guests),
      status: form.status, source: form.source, total: Math.round(Number(form.total) || 0),
    })
    setSubmitting(false)
    navigate(`/bookings/${booking!.ref}`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/bookings/${booking.ref}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Back to booking</Link>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Edit booking <span className="nums text-slate-400">· {booking.ref}</span></h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Guest name"><input className={`${inputCls} w-full`} value={form.guest} onChange={(e) => set('guest', e.target.value)} required /></Field>
          <Field label="Phone"><input className={`${inputCls} w-full`} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Email (optional)"><input type="email" className={`${inputCls} w-full`} value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Room">
            <select className={`${selectCls} w-full`} value={form.villa} onChange={(e) => setForm((f) => ({ ...f, villa: e.target.value, guests: Math.min(Math.max(f.guests, roomCapacity(e.target.value).min), roomCapacity(e.target.value).max) }))}>
              {ROOM_NAMES.map((v) => (<option key={v}>{v}</option>))}
            </select>
          </Field>
          <Field label="Check-in"><input type="date" className={`${inputCls} w-full`} value={form.checkIn} onChange={(e) => set('checkIn', e.target.value)} required /></Field>
          <Field label="Check-out"><input type="date" className={`${inputCls} w-full`} value={form.checkOut} onChange={(e) => set('checkOut', e.target.value)} required /></Field>
          <Field label={`Guests (${cap.min}–${cap.max})`}><input type="number" min={cap.min} max={cap.max} className={`${inputCls} w-full`} value={form.guests} onChange={(e) => set('guests', Number(e.target.value))} /></Field>
          <Field label="Status">
            <select className={`${selectCls} w-full`} value={form.status} onChange={(e) => set('status', e.target.value as BookingStatus)}>
              {BOOKING_STATUSES.map((sName) => (<option key={sName} value={sName}>{sName.charAt(0).toUpperCase() + sName.slice(1)}</option>))}
            </select>
          </Field>
          <Field label="Source">
            <select className={`${selectCls} w-full`} value={form.source} onChange={(e) => set('source', e.target.value)}>
              {SOURCES.map((sName) => (<option key={sName}>{sName}</option>))}
            </select>
          </Field>
          <Field label="Total (₹)"><input type="number" min={0} className={`${inputCls} w-full`} value={form.total} onChange={(e) => set('total', e.target.value)} required /></Field>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className={`${primaryBtnCls} disabled:cursor-not-allowed disabled:opacity-60`}>{submitting ? 'Saving…' : 'Save changes'}</button>
          <button type="button" onClick={() => navigate(`/bookings/${booking.ref}`)} className={secondaryBtnCls}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
