import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { can, useAuth } from '../auth/AuthContext'
import { balanceOf, paidOf, useStore } from '../data/store'
import { ROOM_NAMES } from '../lib/config'
import { fmtDate, formatINR, parseISO } from '../lib/format'
import { BOOKING_STATUSES } from '../lib/permissions'
import { StatusPill } from '../components/ui/StatusPill'
import { VillaDot } from '../components/ui/VillaDot'
import { BookingActions } from '../components/ui/BookingActions'
import { inputCls, primaryBtnCls, selectCls, tdCls, thCls, thRightCls } from '../components/styles'

function nights(a: string, b: string) {
  return Math.max(1, Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000))
}

export function Bookings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data } = useStore()
  const [villa, setVilla] = useState('All rooms')
  const [status, setStatus] = useState('All status')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase()
    return data.bookings
      .map((b) => ({ ...b, paid: paidOf(b), balance: balanceOf(b) }))
      .filter((b) => {
        if (villa !== 'All rooms' && b.villa !== villa) return false
        if (status !== 'All status' && b.status !== status) return false
        if (query && !`${b.guest} ${b.phone} ${b.ref}`.toLowerCase().includes(query)) return false
        return true
      })
      .sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1))
  }, [data.bookings, villa, status, q])

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Bookings</h1>
          <p className="mt-1 text-sm text-slate-500">{rows.length} shown</p>
        </div>
        {can(user, 'edit_bookings') && (
          <Link to="/bookings/new" className={primaryBtnCls}><Plus size={16} /> New booking</Link>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guest, phone, reference…" className={`${inputCls} h-10 w-full pl-9`} />
        </div>
        <select value={villa} onChange={(e) => setVilla(e.target.value)} className={`${selectCls} h-10`}>
          <option>All rooms</option>
          {ROOM_NAMES.map((v) => (<option key={v}>{v}</option>))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectCls} h-10`}>
          <option>All status</option>
          {BOOKING_STATUSES.map((sName) => (<option key={sName} value={sName}>{sName.charAt(0).toUpperCase() + sName.slice(1)}</option>))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className={thCls}>Ref</th>
                <th className={thCls}>Guest</th>
                <th className={thCls}>Room</th>
                <th className={thCls}>Stay</th>
                <th className={thCls}>Status</th>
                <th className={thRightCls}>Total</th>
                <th className={thRightCls}>Paid</th>
                <th className={thRightCls}>Balance</th>
                <th className={thRightCls}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((b) => (
                <tr key={b.id} onClick={() => navigate(`/bookings/${b.ref}`)} className="cursor-pointer transition-colors hover:bg-slate-50">
                  <td className={`${tdCls} nums font-semibold text-emerald-700`}>{b.ref}</td>
                  <td className={tdCls}>
                    <div className="font-medium text-slate-900">{b.guest}</div>
                    <div className="nums text-xs text-slate-500">{b.phone}</div>
                  </td>
                  <td className={tdCls}><span className="inline-flex items-center gap-2"><VillaDot villa={b.villa} />{b.villa}</span></td>
                  <td className={tdCls}>
                    <div className="nums text-slate-700">{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}</div>
                    <div className="nums text-xs text-slate-500">{nights(b.checkIn, b.checkOut)} nights · {b.guests} guests</div>
                  </td>
                  <td className={tdCls}><StatusPill status={b.status} /></td>
                  <td className={`${tdCls} nums text-right font-semibold text-slate-900`}>{formatINR(b.total)}</td>
                  <td className={`${tdCls} nums text-right text-emerald-700`}>{formatINR(b.paid)}</td>
                  <td className={`${tdCls} nums text-right font-semibold ${b.balance > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{formatINR(b.balance)}</td>
                  <td className={`${tdCls} text-right`} onClick={(e) => e.stopPropagation()}><BookingActions booking={b} variant="menu" /></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">No bookings match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
