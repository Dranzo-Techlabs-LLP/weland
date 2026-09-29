import { useEffect, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Globe, Instagram, Mail, MessageCircle, Phone, Printer } from 'lucide-react'
import { balanceOf, paidOf, useStore } from '../data/store'
import { RESORT } from '../lib/config'
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

/** One contact line in the invoice footer (web links open in a new tab). */
function Contact({ icon, href, text, note }: { icon: ReactNode; href: string; text: string; note: string }) {
  const web = href.startsWith('http')
  return (
    <a href={href} {...(web ? { target: '_blank', rel: 'noreferrer' } : {})} className="flex items-start gap-2.5 text-slate-700 hover:text-emerald-700">
      <span className="mt-0.5 text-emerald-700">{icon}</span>
      <span>
        <span className="block font-medium">{text}</span>
        <span className="block text-xs text-slate-400">{note}</span>
      </span>
    </a>
  )
}

export function BookingInvoice() {
  const { ref } = useParams<{ ref: string }>()
  const { data } = useStore()
  const booking = data.bookings.find((b) => b.ref === ref)

  // The page title is the default file name for "Save as PDF" and the print header.
  useEffect(() => {
    if (!ref) return
    const previous = document.title
    document.title = `Invoice ${ref} · ${RESORT.name}`
    return () => { document.title = previous }
  }, [ref])

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
          <div className="flex items-start gap-4">
            <img src={`${import.meta.env.BASE_URL}weland-logo.png`} alt={RESORT.name} className="h-18 w-18 shrink-0 rounded-full" />
            <div>
              <div className="text-2xl font-semibold tracking-tight text-slate-900">{RESORT.name}</div>
              <div className="mt-1 text-sm leading-snug text-slate-500">
                {RESORT.address.map((line) => (<div key={line}>{line}</div>))}
              </div>
            </div>
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

        <div className="mt-8 border-t border-slate-200 pt-4 print:break-inside-avoid">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contact us</div>
          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Contact icon={<Phone size={15} />} href={RESORT.phoneHref} text={RESORT.phone} note="Bookings and enquiries" />
            <Contact icon={<MessageCircle size={15} />} href={RESORT.whatsappHref} text={RESORT.phone} note="Message us on WhatsApp" />
            <Contact icon={<Mail size={15} />} href={`mailto:${RESORT.email}`} text={RESORT.email} note="Email" />
            <Contact icon={<Instagram size={15} />} href={RESORT.instagramHref} text={RESORT.instagram} note="Photos and news on Instagram" />
            <Contact icon={<Globe size={15} />} href={RESORT.websiteHref} text={RESORT.website} note="Our website" />
          </div>
        </div>
      </div>
    </div>
  )
}
