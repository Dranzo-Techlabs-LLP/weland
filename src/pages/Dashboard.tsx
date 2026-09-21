import { LogIn, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { B2B_CATEGORY, useStore } from '../data/store'
import { fmtDate, formatINR, TODAY, TODAY_ISO, toISO } from '../lib/format'
import { StatusPill } from '../components/ui/StatusPill'
import { VillaDot } from '../components/ui/VillaDot'
import type { Booking } from '../types'

const MONTH = TODAY_ISO.slice(0, 7)
const IN30 = toISO(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 30))

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="nums mt-2 text-[26px] font-semibold tracking-tight text-emerald-700">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  )
}

function TodayCard({ title, icon, empty, rows }: { title: string; icon: React.ReactNode; empty: string; rows: Booking[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">{icon}{title}</h2>
      <div className="mt-3 divide-y divide-slate-100">
        {rows.length === 0 && <p className="py-4 text-[13px] text-slate-500">{empty}</p>}
        {rows.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-900">{b.guest}</div>
              <div className="truncate text-xs text-slate-500">{b.villa} · <span className="nums">{b.ref}</span></div>
            </div>
            <StatusPill status={b.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const { data } = useStore()
  const firstName = user?.name.split(' ')[0] ?? 'there'

  const collected = data.bookings.reduce((s, b) => s + b.payments.filter((p) => p.date.startsWith(MONTH)).reduce((ps, p) => ps + (p.kind === 'refund' ? -p.amount : p.amount), 0), 0)
  const monthExpenses = data.expenses.filter((e) => e.date.startsWith(MONTH))
  const b2b = monthExpenses.filter((e) => e.category === B2B_CATEGORY).reduce((s, e) => s + e.amount, 0)
  const operating = monthExpenses.filter((e) => e.category !== B2B_CATEGORY).reduce((s, e) => s + e.amount, 0)
  const revenueMTD = collected - b2b
  const profitMTD = revenueMTD - operating

  const arrivals = data.bookings.filter((b) => b.checkIn === TODAY_ISO && b.status !== 'cancelled')
  const departures = data.bookings.filter((b) => b.checkOut === TODAY_ISO && b.status !== 'cancelled')
  const upcoming = data.bookings
    .filter((b) => b.checkIn > TODAY_ISO && b.checkIn <= IN30 && b.status !== 'cancelled')
    .sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1))

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back, {firstName}</h1>
        <p className="mt-1 text-sm text-slate-500">{fmtDate(TODAY_ISO)} · here&apos;s what&apos;s happening</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Check-ins today" value={String(arrivals.length)} sub="arriving guests" />
        <StatCard label="Check-outs today" value={String(departures.length)} sub="departing guests" />
        <StatCard label="Revenue (MTD)" value={formatINR(revenueMTD)} sub="collected this month" />
        <StatCard label="Profit (MTD)" value={formatINR(profitMTD)} sub="after expenses" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TodayCard title="Arrivals today" icon={<LogIn size={16} className="text-emerald-600" />} empty="No arrivals today." rows={arrivals} />
        <TodayCard title="Departures today" icon={<LogOut size={16} className="text-amber-600" />} empty="No departures today." rows={departures} />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="px-5 py-4 text-[15px] font-semibold text-slate-900">📅 Upcoming (next 30 days)</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="border-y border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Guest</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Room</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Check-in</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Check-out</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {upcoming.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{b.guest}</td>
                  <td className="px-5 py-3"><span className="inline-flex items-center gap-2 text-slate-700"><VillaDot villa={b.villa} />{b.villa}</span></td>
                  <td className="nums px-5 py-3 text-slate-700">{fmtDate(b.checkIn)}</td>
                  <td className="nums px-5 py-3 text-slate-700">{fmtDate(b.checkOut)}</td>
                  <td className="px-5 py-3"><StatusPill status={b.status} /></td>
                  <td className="nums px-5 py-3 text-right font-semibold text-slate-900">{formatINR(b.total)}</td>
                </tr>
              ))}
              {upcoming.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">No upcoming bookings.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
