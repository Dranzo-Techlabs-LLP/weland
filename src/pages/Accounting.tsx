import { useMemo, useState } from 'react'
import { B2B_CATEGORY, useStore } from '../data/store'
import { FULL_PROPERTY, isFullProperty, primaryRoom, ROOM_NAMES, ROOM_OPTIONS } from '../lib/config'
import { formatINR, TODAY, TODAY_ISO, toISO } from '../lib/format'
import { inputCls, selectCls, thCls, thRightCls } from '../components/styles'
import { VillaDot } from '../components/ui/VillaDot'

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'green' | 'orange' | 'red' }) {
  const color = tone === 'green' ? 'text-emerald-700' : tone === 'red' ? 'text-red-600' : 'text-amber-600'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`nums mt-2 text-[22px] font-semibold tracking-tight ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  )
}

export function Accounting() {
  const { data } = useStore()
  const [villa, setVilla] = useState('All rooms')
  const [from, setFrom] = useState(toISO(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)))
  const [to, setTo] = useState(TODAY_ISO)
  // Stay month: money of the bookings whose check-in is in the period. Cash date: money by the date it was paid.
  const [basis, setBasis] = useState<'stay' | 'cash'>('stay')

  const model = useMemo(() => {
    const inRange = (d: string) => (!from || d >= from) && (!to || d <= to)
    const stayRefs = new Set(data.bookings.filter((b) => inRange(b.checkIn)).map((b) => b.ref.toLowerCase()))
    const knownRefs = new Set(data.bookings.map((b) => b.ref.toLowerCase()))
    const payOk = (b: { checkIn: string }, date: string) => (basis === 'stay' ? inRange(b.checkIn) : inRange(date))
    // B2B follows its booking on the stay basis (an entry with no known booking is counted by its own date)
    const b2bOk = (e: { bookingRef?: string; date: string }) => {
      const r = e.bookingRef?.trim().toLowerCase()
      return basis === 'stay' && r && knownRefs.has(r) ? stayRefs.has(r) : inRange(e.date)
    }
    const hasFull = data.bookings.some((b) => isFullProperty(b.villa)) || data.expenses.some((e) => isFullProperty(e.villa))
    const villaList = villa === 'All rooms' ? (hasFull ? [...ROOM_NAMES, FULL_PROPERTY] : ROOM_NAMES) : [villa]
    const inScope = (v: string) => villa === 'All rooms' || v === villa

    const perVilla = villaList.map((v) => {
      const bk = data.bookings.filter((b) => primaryRoom(b.villa) === v)
      const collected = bk.reduce((s, b) => s + b.payments.filter((p) => p.kind === 'payment' && payOk(b, p.date)).reduce((ps, p) => ps + p.amount, 0), 0)
      const refunded = bk.reduce((s, b) => s + b.payments.filter((p) => p.kind === 'refund' && payOk(b, p.date)).reduce((ps, p) => ps + p.amount, 0), 0)
      const b2b = data.expenses.filter((e) => primaryRoom(e.villa) === v && e.category === B2B_CATEGORY && b2bOk(e)).reduce((s, e) => s + e.amount, 0)
      const operating = data.expenses.filter((e) => primaryRoom(e.villa) === v && e.category !== B2B_CATEGORY && inRange(e.date)).reduce((s, e) => s + e.amount, 0)
      const bookings = bk.filter((b) => b.status !== 'cancelled' && inRange(b.checkIn)).length
      const revenue = collected - refunded - b2b
      return { villa: v, collected, refunded, b2b, operating, bookings, revenue, profit: revenue - operating }
    })

    const sum = (f: (r: (typeof perVilla)[number]) => number) => perVilla.reduce((s, r) => s + f(r), 0)
    const collected = sum((r) => r.collected)
    const refunded = sum((r) => r.refunded)
    const b2b = sum((r) => r.b2b)
    const operating = sum((r) => r.operating)
    const netRevenue = collected - refunded - b2b
    const profit = netRevenue - operating
    const contracted = data.bookings.filter((b) => inScope(primaryRoom(b.villa)) && b.status !== 'cancelled' && inRange(b.checkIn)).reduce((s, b) => s + b.total, 0)
    const outstanding = contracted - (collected - refunded) // what guests still owe (B2B commission isn't owed by guests)
    return { perVilla, collected, refunded, b2b, operating, netRevenue, profit, contracted, outstanding }
  }, [data, villa, from, to, basis])

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Accounting</h1>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">Room</span><select value={villa} onChange={(e) => setVilla(e.target.value)} className={selectCls}><option>All rooms</option>{ROOM_OPTIONS.map((v) => (<option key={v}>{v}</option>))}</select></label>
        <div>
          <span className="mb-1 block text-xs font-medium text-slate-500">Period basis</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
            <button onClick={() => setBasis('stay')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${basis === 'stay' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Stay month</button>
            <button onClick={() => setBasis('cash')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${basis === 'cash' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Cash date</button>
          </div>
        </div>
        <p className="basis-full text-xs text-slate-400">
          {basis === 'stay'
            ? 'Stay month: payments, refunds and B2B commission of bookings whose check-in is in the period. Expenses are counted by their own date.'
            : 'Cash date: payments, refunds and expenses counted by the date they were paid.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Collected" value={formatINR(model.collected)} sub="received from guests" tone="green" />
        <Kpi label="Refunded" value={formatINR(model.refunded)} sub="paid back" tone="red" />
        <Kpi label="B2B Commission" value={formatINR(model.b2b)} sub="paid to partners" tone="orange" />
        <Kpi label="Net Revenue" value={formatINR(model.netRevenue)} sub="collected − refunds − B2B" tone="green" />
        <Kpi label="Expenses" value={formatINR(model.operating)} sub="operating (excl. B2B)" tone="orange" />
        <Kpi label="Profit" value={formatINR(model.profit)} sub="net revenue − expenses" tone="green" />
        <Kpi label="Contracted Value" value={formatINR(model.contracted)} sub="booking totals in period" tone="green" />
        <Kpi label="Outstanding" value={formatINR(model.outstanding)} sub="contracted − collected + refunds" tone="orange" />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="px-5 py-4 text-[15px] font-semibold text-slate-900">Per-room breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="border-y border-slate-200 bg-slate-50">
              <tr>
                <th className={thCls}>Room</th>
                <th className={thRightCls}>Revenue</th>
                <th className={thRightCls}>Expenses</th>
                <th className={thRightCls}>Profit</th>
                <th className={thRightCls}>Bookings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {model.perVilla.map((r) => (
                <tr key={r.villa} className="hover:bg-slate-50">
                  <td className="px-5 py-3"><span className="inline-flex items-center gap-2 font-medium text-slate-900"><VillaDot villa={r.villa} />{r.villa}</span></td>
                  <td className="nums px-5 py-3 text-right font-semibold text-emerald-700">{formatINR(r.revenue)}</td>
                  <td className="nums px-5 py-3 text-right text-amber-600">{formatINR(r.operating)}</td>
                  <td className="nums px-5 py-3 text-right font-semibold text-emerald-700">{formatINR(r.profit)}</td>
                  <td className="nums px-5 py-3 text-right text-slate-700">{r.bookings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
