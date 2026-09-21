import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
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

export function NewBooking() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { createBooking } = useStore()
  const [form, setForm] = useState({
    guest: '', phone: '', email: '', villa: ROOM_NAMES[0], checkIn: '', checkOut: '',
    guests: 2, status: 'confirmed' as BookingStatus, source: 'Direct', total: '', advance: '',
  })
  const [submitting, setSubmitting] = useState(false)

  if (!can(user, 'edit_bookings')) return <Navigate to="/bookings" replace />

  const cap = roomCapacity(form.villa)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.checkIn || !form.checkOut || parseISO(form.checkOut) <= parseISO(form.checkIn)) return
    if (submitting) return
    setSubmitting(true)
    const ref = await createBooking({
      guest: form.guest, phone: form.phone, email: form.email, villa: form.villa,
      checkIn: form.checkIn, checkOut: form.checkOut, guests: Number(form.guests),
      status: form.status, source: form.source, total: Math.round(Number(form.total) || 0),
      advance: Number(form.advance) || undefined,
    })
    setSubmitting(false)
    if (ref) navigate(`/bookings/${ref}`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Back to bookings</Link>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New booking</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Guest name"><input className={`${inputCls} w-full`} value={form.guest} onChange={(e) => set('guest', e.target.value)} required /></Field>
          <Field label="Phone"><input className={`${inputCls} w-full`} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Email (optional)"><input type="email" className={`${inputCls} w-full`} value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Room">
            <select className={`${selectCls} w-full`} value={form.villa} onChange={(e) => setForm((f) => ({ ...f, villa: e.target.value, guests: roomCapacity(e.target.value).min }))}>
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
          <Field label="Advance paid (₹)"><input type="number" min={0} className={`${inputCls} w-full`} value={form.advance} onChange={(e) => set('advance', e.target.value)} /></Field>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className={`${primaryBtnCls} disabled:cursor-not-allowed disabled:opacity-60`}>{submitting ? 'Creating…' : 'Create booking'}</button>
          <button type="button" onClick={() => navigate('/bookings')} className={secondaryBtnCls}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
