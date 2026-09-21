import { useMemo, useState } from 'react'
import { CheckCircle2, Download, Eye, FileText, X } from 'lucide-react'
import { B2B_CATEGORY, paidOf, useStore } from '../data/store'
import { ROOM_NAMES } from '../lib/config'
import { formatINR, TODAY, TODAY_ISO, toISO } from '../lib/format'
import { BOOKING_STATUSES } from '../lib/permissions'
import { inputCls, primaryBtnCls, secondaryBtnCls, selectCls } from '../components/styles'
import type { AppData } from '../types'

type ReportType = 'bookings' | 'payments' | 'expenses' | 'combined'
interface Report { columns: string[]; rows: (string | number)[][]; money: number[] }

function build(type: ReportType, data: AppData, from: string, to: string, villa: string, basis: 'stay' | 'cash'): Report {
  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to)
  const villaOk = (v: string) => villa === 'All rooms' || v === villa

  if (type === 'bookings') {
    const rows = data.bookings
      .filter((b) => villaOk(b.villa) && inRange(b.checkIn))
      .sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1))
      .map((b) => [b.ref, b.villa, b.guest, b.phone, b.checkIn, b.checkOut, b.guests, b.status, b.total, paidOf(b), b.source])
    return { columns: ['Reference', 'Room', 'Guest', 'Phone', 'Check-in', 'Check-out', 'Guests', 'Status', 'Total', 'Paid', 'Source'], rows, money: [8, 9] }
  }
  if (type === 'payments') {
    const rows: (string | number)[][] = []
    for (const b of data.bookings) {
      if (!villaOk(b.villa)) continue
      for (const p of b.payments) {
        const ok = basis === 'cash' ? inRange(p.date) : inRange(b.checkIn)
        if (!ok) continue
        rows.push([p.date, b.ref, b.guest, b.villa, p.kind, p.amount])
      }
    }
    rows.sort((a, b) => (String(a[0]) < String(b[0]) ? 1 : -1))
    return { columns: ['Date', 'Reference', 'Guest', 'Room', 'Kind', 'Amount'], rows, money: [5] }
  }
  if (type === 'expenses') {
    const rows = data.expenses
      .filter((e) => villaOk(e.villa) && e.category !== B2B_CATEGORY && inRange(e.date))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((e) => [e.date, e.category, e.villa, e.bookingRef ?? '—', e.description, e.amount])
    return { columns: ['Date', 'Category', 'Room', 'Booking', 'Description', 'Amount'], rows, money: [5] }
  }
  // combined cash book
  interface Entry { date: string; type: string; detail: string; inAmt: number; outAmt: number }
  const entries: Entry[] = []
  for (const b of data.bookings) {
    if (!villaOk(b.villa)) continue
    for (const p of b.payments) {
      if (!inRange(p.date)) continue
      if (p.kind === 'payment') entries.push({ date: p.date, type: 'Payment', detail: `${b.ref} · ${b.guest}`, inAmt: p.amount, outAmt: 0 })
      else entries.push({ date: p.date, type: 'Refund', detail: `${b.ref} · ${b.guest}`, inAmt: 0, outAmt: p.amount })
    }
  }
  for (const e of data.expenses) {
    if (!villaOk(e.villa) || !inRange(e.date)) continue
    entries.push({ date: e.date, type: e.category, detail: `${e.villa}${e.description ? ' · ' + e.description : ''}`, inAmt: 0, outAmt: e.amount })
  }
  entries.sort((a, b) => (a.date < b.date ? -1 : 1))
  let bal = 0
  const rows = entries.map((e) => {
    bal += e.inAmt - e.outAmt
    return [e.date, e.type, e.detail, e.inAmt || '', e.outAmt || '', bal]
  })
  return { columns: ['Date', 'Type', 'Detail', 'In', 'Out', 'Balance'], rows, money: [3, 4, 5] }
}

/** Credited (money in) / debited (money out) for the summary cards, from the currently shown rows. */
function summarize(type: ReportType, rows: (string | number)[][]) {
  const col = (i: number) => rows.reduce((s, r) => s + (typeof r[i] === 'number' ? r[i] : 0), 0)
  if (type === 'bookings') return { credited: col(9), debited: 0 }
  if (type === 'expenses') return { credited: 0, debited: col(5) }
  if (type === 'combined') return { credited: col(3), debited: col(4) }
  const credited = rows.reduce((s, r) => s + (r[4] === 'payment' && typeof r[5] === 'number' ? r[5] : 0), 0)
  const debited = rows.reduce((s, r) => s + (r[4] === 'refund' && typeof r[5] === 'number' ? r[5] : 0), 0)
  return { credited, debited }
}

/** A column filters by dropdown (Room/Status), free text (with !exclude), or not at all (money columns). */
function filterKind(col: string, idx: number, money: number[]): 'room' | 'status' | 'none' | 'text' {
  if (col === 'Room') return 'room'
  if (col === 'Status') return 'status'
  if (money.includes(idx)) return 'none'
  return 'text'
}

function matchText(cell: string, filter: string): boolean {
  const f = filter.trim().toLowerCase()
  if (!f) return true
  const c = cell.toLowerCase()
  if (f.startsWith('!')) { const t = f.slice(1).trim(); return t ? !c.includes(t) : true }
  return c.includes(f)
}

function toCsv(columns: string[], rows: (string | number)[][]): string {
  const esc = (c: string | number) => (typeof c === 'string' && (c.includes(',') || c.includes('"')) ? `"${c.replace(/"/g, '""')}"` : String(c))
  return [columns.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n')
}

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function ReportCard({ title, desc, onPreview, onExport, exportLabel }: { title: string; desc: string; onPreview: () => void; onExport: () => void; exportLabel: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><FileText size={16} className="text-emerald-600" />{title}</h3>
      <p className="mt-2 min-h-[40px] text-[13px] text-slate-500">{desc}</p>
      <div className="mt-3 flex gap-2">
        <button onClick={onPreview} className={secondaryBtnCls}><Eye size={15} /> Preview</button>
        <button onClick={onExport} className={primaryBtnCls}>{exportLabel === 'PDF' ? <FileText size={15} /> : <Download size={15} />} {exportLabel}</button>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'green' | 'red' | 'slate' }) {
  const color = tone === 'green' ? 'text-emerald-700' : tone === 'red' ? 'text-red-600' : 'text-slate-900'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`nums mt-2 text-[22px] font-semibold tracking-tight ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  )
}

const filterInputCls = 'w-full min-w-[64px] rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 placeholder:text-slate-300 focus:border-emerald-600 focus:outline-none'
const filterSelectCls = 'w-full min-w-[80px] rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 focus:border-emerald-600 focus:outline-none'

export function Reports() {
  const { data } = useStore()
  const [from, setFrom] = useState(toISO(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)))
  const [to, setTo] = useState(TODAY_ISO)
  const [villa, setVilla] = useState('All rooms')
  const [basis, setBasis] = useState<'stay' | 'cash'>('stay')
  const [active, setActive] = useState<{ type: ReportType; title: string } | null>(null)
  const [filters, setFilters] = useState<Record<number, string>>({})
  const [bannerOpen, setBannerOpen] = useState(false)

  const report = active ? build(active.type, data, from, to, villa, basis) : null

  const filtered = useMemo(() => {
    if (!report) return []
    return report.rows.filter((row) =>
      report.columns.every((col, i) => {
        const kind = filterKind(col, i, report.money)
        const f = filters[i] ?? ''
        if (kind === 'none') return true
        if (kind === 'room' || kind === 'status') return !f || f === 'All' || String(row[i]) === f
        return matchText(String(row[i]), f)
      }),
    )
  }, [report, filters])

  const summary = report && active ? summarize(active.type, filtered) : { credited: 0, debited: 0 }

  function openPreview(type: ReportType, title: string) {
    setActive({ type, title })
    setFilters({})
    setBannerOpen(true)
  }

  function exportCsv(type: ReportType, title: string) {
    const r = build(type, data, from, to, villa, basis)
    download(`${title.toLowerCase().replace(/\s+/g, '-')}_${from}_${to}.csv`, toCsv(r.columns, r.rows))
  }

  return (
    <>
      <div className="mb-6"><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reports</h1></div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></label>
          <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></label>
          <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">Room</span><select value={villa} onChange={(e) => setVilla(e.target.value)} className={selectCls}><option>All rooms</option>{ROOM_NAMES.map((v) => (<option key={v}>{v}</option>))}</select></label>
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-500">Period basis</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
              <button onClick={() => setBasis('stay')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${basis === 'stay' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Stay month</button>
              <button onClick={() => setBasis('cash')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${basis === 'cash' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Cash date</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportCard title="Bookings" desc="All bookings with guest, stay, totals and amount paid." exportLabel="CSV" onPreview={() => openPreview('bookings', 'Bookings')} onExport={() => exportCsv('bookings', 'Bookings')} />
        <ReportCard title="Payments & Refunds" desc="Every payment and refund line in the period." exportLabel="CSV" onPreview={() => openPreview('payments', 'Payments & Refunds')} onExport={() => exportCsv('payments', 'Payments')} />
        <ReportCard title="Expenses" desc="Operating expenses by room and category." exportLabel="CSV" onPreview={() => openPreview('expenses', 'Expenses')} onExport={() => exportCsv('expenses', 'Expenses')} />
        <ReportCard title="Combined Report" desc="Cash book: payments in, refunds + expenses out, with running balance." exportLabel="PDF" onPreview={() => openPreview('combined', 'Combined Report')} onExport={() => window.print()} />
      </div>

      {report && active && (
        <>
          {bannerOpen && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span className="flex-1">Your {active.title.toLowerCase()} is ready. Please review the details below.</span>
              <button onClick={() => setBannerOpen(false)} aria-label="Dismiss" className="text-emerald-500 hover:text-emerald-700"><X size={16} /></button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard label="Total Credited" value={formatINR(summary.credited)} sub="money in" tone="green" />
            <SummaryCard label="Total Debited" value={formatINR(summary.debited)} sub="refunds + expenses out" tone="red" />
            <SummaryCard label="Overall Total" value={formatINR(summary.credited - summary.debited)} sub="credited − debited" tone="slate" />
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-slate-900">{active.title} · {filtered.length} Rows</h2>
              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-slate-400 sm:inline">Tip: type <code className="rounded bg-slate-100 px-1 text-slate-500">!term</code> to exclude</span>
                <button onClick={() => download(`${active.title.toLowerCase().replace(/\s+/g, '-')}_${from}_${to}.csv`, toCsv(report.columns, filtered))} className={primaryBtnCls}><Download size={15} /> Download CSV</button>
              </div>
            </div>
            <div className="max-h-[520px] overflow-auto border-t border-slate-200">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b border-slate-200">
                    {report.columns.map((c, i) => (
                      <th key={c} className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${report.money.includes(i) ? 'text-right' : 'text-left'}`}>{c}</th>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-200 bg-white">
                    {report.columns.map((c, i) => {
                      const kind = filterKind(c, i, report.money)
                      const val = filters[i] ?? ''
                      const set = (v: string) => setFilters((f) => ({ ...f, [i]: v }))
                      return (
                        <th key={c} className="px-2 py-1.5 align-top">
                          {kind === 'room' && (
                            <select value={val || 'All'} onChange={(e) => set(e.target.value)} className={filterSelectCls}>
                              <option>All</option>{ROOM_NAMES.map((v) => (<option key={v}>{v}</option>))}
                            </select>
                          )}
                          {kind === 'status' && (
                            <select value={val || 'All'} onChange={(e) => set(e.target.value)} className={filterSelectCls}>
                              <option>All</option>{BOOKING_STATUSES.map((s) => (<option key={s}>{s}</option>))}
                            </select>
                          )}
                          {kind === 'text' && (
                            <input value={val} onChange={(e) => set(e.target.value)} placeholder="filter… !excl" className={filterInputCls} />
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((row, ri) => (
                    <tr key={ri} className="hover:bg-slate-50">
                      {row.map((cell, ci) => {
                        const isMoney = report.money.includes(ci) && typeof cell === 'number'
                        return (
                          <td key={ci} className={`px-3 py-2.5 ${report.money.includes(ci) ? 'nums text-right text-slate-900' : 'text-slate-700'}`}>
                            {isMoney ? formatINR(cell as number) : String(cell)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={report.columns.length} className="px-4 py-10 text-center text-sm text-slate-500">No rows match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}
