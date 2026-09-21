import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { can, useAuth } from '../auth/AuthContext'
import { balanceOf, paidOf, useStore } from '../data/store'
import { fmtDate, formatINR, parseISO, TODAY_ISO } from '../lib/format'
import { BOOKING_STATUSES } from '../lib/permissions'
import { StatusPill } from '../components/ui/StatusPill'
import { BookingActions } from '../components/ui/BookingActions'
import { inputCls, primaryBtnCls, secondaryBtnCls, selectCls } from '../components/styles'
import type { BookingStatus } from '../types'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  )
}

export function BookingDetail() {
  const { ref } = useParams<{ ref: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, addPayment, setBookingStatus } = useStore()
  const booking = data.bookings.find((b) => b.ref === ref)

  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<'payment' | 'refund'>('payment')
  const [date, setDate] = useState(TODAY_ISO)
  const [nextStatus, setNextStatus] = useState<BookingStatus>(booking?.status ?? 'enquiry')
  const [msg, setMsg] = useState('')

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link to="/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Back to bookings</Link>
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500 shadow-sm">Booking not found.</div>
      </div>
    )
  }

  const paid = paidOf(booking)
  const balance = balanceOf(booking)
  const nights = Math.max(1, Math.round((parseISO(booking.checkOut).getTime() - parseISO(booking.checkIn).getTime()) / 86400000))
  const canRecord = can(user, 'record_payments')
  const canEdit = can(user, 'edit_bookings')
  const canCancel = can(user, 'cancel_bookings')
  const canApplyStatus = nextStatus === 'cancelled' ? canCancel : canEdit

  function recordPayment() {
    if (!Number(amount)) return
    addPayment(booking!.ref, Number(amount), kind, date)
    setAmount('')
    setMsg('Payment recorded.')
  }
  function changeStatus() {
    setBookingStatus(booking!.ref, nextStatus)
    setMsg('Status updated.')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Back to bookings</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{booking.guest}</h1>
            <StatusPill status={booking.status} />
          </div>
          <p className="nums mt-1 text-sm text-slate-500">{booking.ref} · {booking.source}</p>
        </div>
        <BookingActions booking={booking} variant="buttons" onDeleted={() => navigate('/bookings')} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-semibold text-slate-900">Guest &amp; stay</h2>
          <div className="mt-2 divide-y divide-slate-100">
            <Row label="Phone" value={<span className="nums">{booking.phone}</span>} />
            {booking.email && <Row label="Email" value={booking.email} />}
            <Row label="Room" value={booking.villa} />
            <Row label="Check-in" value={<span className="nums">{fmtDate(booking.checkIn)}</span>} />
            <Row label="Check-out" value={<span className="nums">{fmtDate(booking.checkOut)}</span>} />
            <Row label="Nights" value={<span className="nums">{nights}</span>} />
            <Row label="Guests" value={<span className="nums">{booking.guests}</span>} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-semibold text-slate-900">Payments</h2>
          <div className="mt-2 divide-y divide-slate-100">
            <Row label="Total" value={<span className="nums">{formatINR(booking.total)}</span>} />
            <Row label="Paid" value={<span className="nums text-emerald-700">{formatINR(paid)}</span>} />
            <Row label="Balance" value={<span className="nums">{formatINR(balance)}</span>} />
          </div>
          {booking.payments.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">History</p>
              <div className="space-y-1.5">
                {booking.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600"><span className="nums">{fmtDate(p.date)}</span> · <span className="capitalize">{p.kind}</span></span>
                    <span className={`nums font-medium ${p.kind === 'refund' ? 'text-slate-500' : 'text-slate-900'}`}>{p.kind === 'refund' ? '−' : ''}{formatINR(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {(canRecord || canEdit || canCancel) && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {canRecord && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-[15px] font-semibold text-slate-900">Record payment / refund</h2>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <select value={kind} onChange={(e) => setKind(e.target.value as 'payment' | 'refund')} className={selectCls}>
                  <option value="payment">Payment</option>
                  <option value="refund">Refund</option>
                </select>
                <input type="number" min={0} placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputCls} w-32`} />
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                <button onClick={recordPayment} className={primaryBtnCls}>Record</button>
              </div>
            </div>
          )}
          {(canEdit || canCancel) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-[15px] font-semibold text-slate-900">Update status</h2>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as BookingStatus)} className={selectCls}>
                  {BOOKING_STATUSES.map((s) => (<option key={s}>{s}</option>))}
                </select>
                <button onClick={changeStatus} disabled={!canApplyStatus || nextStatus === booking.status} className={secondaryBtnCls}>Apply</button>
              </div>
              {!canApplyStatus && <p className="mt-2 text-xs text-slate-400">You cannot set this status.</p>}
            </div>
          )}
          {msg && <p className="text-sm text-emerald-700 lg:col-span-2">{msg}</p>}
        </div>
      )}
    </div>
  )
}
