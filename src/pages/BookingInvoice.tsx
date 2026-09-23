import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { balanceOf, paidOf, useStore } from '../data/store'
import { PROPERTY_NAME, PROPERTY_TAGLINE } from '../lib/config'
import { fmtDate, formatINR, parseISO, toISO } from '../lib/format'
import { primaryBtnCls } from '../components/styles'

function nights(a: string, b: string) {
  return Math.max(1, Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000))
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 text-sm ${strong ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
      <span>{label}</span>
      <span className="nums">{value}</span>
    </div>
  )
}

export function BookingInvoice() {
  const { ref } = useParams<{ ref: string }>()
  const { data } = useStore()
  const booking = data.bookings.find((b) => b.ref === ref)

  if (!booking) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to="/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Back to bookings</Link>
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500 shadow-sm">Booking not found.</div>
      </div>
    )
  }

  const paid = paidOf(booking)
  const balance = balanceOf(booking)
  const nightCount = nights(booking.checkIn, booking.checkOut)
  const issued = fmtDate(toISO(new Date()))
  const terms = data.invoice.terms

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link to={`/bookings/${booking.ref}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Back to booking</Link>
        <button onClick={() => window.print()} className={primaryBtnCls}><Printer size={16} /> Print / Save PDF</button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-2xl font-semibold tracking-tight text-slate-900">{PROPERTY_NAME}</div>
            <div className="mt-0.5 text-sm text-slate-500">{PROPERTY_TAGLINE}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Invoice</div>
            <div className="nums mt-1 text-lg font-semibold text-slate-900">{booking.ref}</div>
            <div className="nums text-xs text-slate-400">Issued {issued}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Billed to</div>
            <div className="mt-1.5 font-medium text-slate-900">{booking.guest}</div>
            {booking.phone && <div className="nums text-sm text-slate-600">{booking.phone}</div>}
            {booking.altPhone && <div className="nums text-sm text-slate-600">{booking.altPhone}</div>}
            {booking.email && <div className="text-sm text-slate-600">{booking.email}</div>}
          </div>
          <div className="sm:text-right">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stay</div>
            <div className="mt-1.5 text-sm text-slate-700">Rooms <span className="font-medium text-slate-900">{booking.villa}</span></div>
            <div className="nums text-sm text-slate-600">{fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}</div>
            <div className="nums text-sm text-slate-600">{nightCount} night{nightCount > 1 ? 's' : ''} · {booking.adults ?? booking.guests} adults, {booking.kids ?? 0} kids</div>
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 text-left font-semibold">Description</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-3 text-slate-700">Room {booking.villa} · {nightCount} night{nightCount > 1 ? 's' : ''} · {booking.source}</td>
              <td className="nums py-3 text-right text-slate-900">{formatINR(booking.total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-full max-w-xs">
          <Row label="Total" value={formatINR(booking.total)} />
          <Row label="Paid" value={formatINR(paid)} />
          <div className="mt-1 border-t border-slate-200 pt-1">
            <Row label="Balance due" value={formatINR(balance)} strong />
          </div>
        </div>

        {terms && (
          <div className="mt-8 border-t border-slate-200 pt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Terms &amp; notes</div>
            <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-500">{terms}</p>
          </div>
        )}
      </div>
    </div>
  )
}
