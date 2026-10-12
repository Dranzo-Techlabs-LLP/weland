import { useMemo, useState } from 'react'
import { CheckCircle2, Download, Eye, FileText, X } from 'lucide-react'
import { B2B_CATEGORY, b2bRowsOf, paidOf, useStore } from '../data/store'
import { bookingHasRoom, ROOM_OPTIONS } from '../lib/config'
import { formatINR, TODAY, TODAY_ISO, toISO } from '../lib/format'
import { buildXlsx } from '../lib/xlsx'
import { BOOKING_STATUSES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../lib/permissions'
import { inputCls, primaryBtnCls, secondaryBtnCls, selectCls } from '../components/styles'
import type { AppData, Booking } from '../types'

type ReportType = 'bookings' | 'payments' | 'expenses' | 'combined'
interface Report { columns: string[]; rows: (string | number)[][]; money: number[] }

/** Payment methods used on a booking, in order ("UPI, Cash"); "—" when none was recorded. */
const methodsOf = (b: Booking) =>
  [...new Set(b.payments.filter((p) => p.kind === 'payment' && p.method).map((p) => p.method as string))].join(', ') || '—'

function build(type: ReportType, data: AppData, from: string, to: string, villa: string, basis: 'stay' | 'cash'): Report {
  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to)
  const villaOk = (v: string) => villa === 'All rooms' || bookingHasRoom(v, villa)

  if (type === 'bookings') {
    const rows = data.bookings
      .filter((b) => villaOk(b.villa) && inRange(b.checkIn))
      .sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1))
      .map((b) => [b.ref, b.villa, b.guest, b.phone, b.checkIn, b.checkOut, b.guests, b.status, b.total, paidOf(b), methodsOf(b), b.source])
    return { columns: ['Reference', 'Room', 'Guest', 'Phone', 'Check-in', 'Check-out', 'Guests', 'Status', 'Total', 'Paid', 'Payment method', 'Source'], rows, money: [8, 9] }
  }
  if (type === 'payments') {
    const rows: (string | number)[][] = []
    for (const b of data.bookings) {
      if (!villaOk(b.villa)) continue
      // the booking's total B2B commission, shown on each of its rows
      const b2b = b2bRowsOf(data.expenses, b.ref).reduce((s, e) => s + e.amount, 0)
      for (const p of b.payments) {
        const ok = basis === 'cash' ? inRange(p.date) : inRange(b.checkIn)
        if (!ok) continue
        rows.push([p.date, b.ref, b.guest, b.villa, p.kind, p.method || '—', p.amount, b2b || '—'])
      }
    }
    rows.sort((a, b) => (String(a[0]) < String(b[0]) ? 1 : -1))
    return { columns: ['Date', 'Reference', 'Guest', 'Room', 'Kind', 'Method', 'Amount', 'B2B commission'], rows, money: [6, 7] }
  }
  if (type === 'expenses') {
    const rows = data.expenses
      .filter((e) => villaOk(e.villa) && e.category !== B2B_CATEGORY && inRange(e.date))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((e) => [e.date, e.category, e.villa, e.bookingRef ?? '—', e.description, e.amount])
    return { columns: ['Date', 'Category', 'Room', 'Booking', 'Description', 'Amount'], rows, money: [5] }
  }
  // combined cash book: every money line with its details
  interface Entry { date: string; type: string; category: string; room: string; booking: string; description: string; method: string; inAmt: number; outAmt: number }
  const entries: Entry[] = []
  for (const b of data.bookings) {
    if (!villaOk(b.villa)) continue
    for (const p of b.payments) {
      if (!inRange(p.date)) continue
      const line = { date: p.date, category: '—', room: b.villa, booking: b.ref, description: b.guest, method: p.method || '—' }
      if (p.kind === 'payment') entries.push({ ...line, type: p.advance ? 'Advance' : 'Payment', inAmt: p.amount, outAmt: 0 })
      else entries.push({ ...line, type: 'Refund', inAmt: 0, outAmt: p.amount })
    }
  }
  for (const e of data.expenses) {
    if (!villaOk(e.villa) || !inRange(e.date)) continue
    entries.push({ date: e.date, type: 'Expense', category: e.category, room: e.villa, booking: e.bookingRef || '—', description: e.description || '—', method: '—', inAmt: 0, outAmt: e.amount })
  }
  entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  let bal = 0
  const rows = entries.map((e) => {
    bal += e.inAmt - e.outAmt
    return [e.date, e.type, e.category, e.room, e.booking, e.description, e.method, e.inAmt || '', e.outAmt || '', bal]
  })
  return { columns: ['Date', 'Type', 'Category', 'Room', 'Booking', 'Description', 'Method', 'In', 'Out', 'Balance'], rows, money: [7, 8, 9] }
}

/** Credited (money in) / debited (money out) for the summary cards, from the currently shown rows. */
function summarize(type: ReportType, rows: (string | number)[][]) {
  const col = (i: number) => rows.reduce((s, r) => s + (typeof r[i] === 'number' ? r[i] : 0), 0)
  if (type === 'bookings') return { credited: col(9), debited: 0 }
  if (type === 'expenses') return { credited: 0, debited: col(5) }
  if (type === 'combined') return { credited: col(7), debited: col(8) }
  const credited = rows.reduce((s, r) => s + (r[4] === 'payment' && typeof r[6] === 'number' ? r[6] : 0), 0)
  const debited = rows.reduce((s, r) => s + (r[4] === 'refund' && typeof r[6] === 'number' ? r[6] : 0), 0)
  return { credited, debited }
}

/** A column filters by dropdown (Room/Status/Method/Type/Category), free text (with !exclude), or not at all (money columns). */
function filterKind(col: string, idx: number, money: number[]): 'room' | 'status' | 'method' | 'type' | 'category' | 'none' | 'text' {
  if (col === 'Room') return 'room'
  if (col === 'Status') return 'status'
  if (col === 'Type') return 'type'
  if (col === 'Category') return 'category'
  if (col === 'Payment method' || col === 'Method') return 'method'
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

const RESORT_HEADING = 'WeLand Resorts'

/** CSV with the resort name and the report name on top, the table, and a Total row at the end. */
function toCsv(columns: string[], rows: (string | number)[][], heading: string, total: (string | number)[]): string {
  const esc = (c: string | number) => (typeof c === 'string' && (c.includes(',') || c.includes('"')) ? `"${c.replace(/"/g, '""')}"` : String(c))
  return [RESORT_HEADING, heading, '', columns.join(','), ...rows.map((r) => r.map(esc).join(',')), total.map(esc).join(',')].join('\n')
}

/** The Total row of a CSV: money columns added up (Payments & Refunds: payments less refunds, and each booking's B2B once). */
function csvTotal(type: ReportType, report: Report): (string | number)[] {
  const total: (string | number)[] = report.columns.map(() => '')
  if (type === 'payments') {
    total[0] = 'Total Amount (payments less refunds)'
    total[6] = report.rows.reduce((s, r) => s + (typeof r[6] === 'number' ? (r[4] === 'refund' ? -r[6] : r[6]) : 0), 0)
    // the B2B commission is repeated on each of a booking's rows: count it once per booking
    const seen = new Set<string>()
    total[7] = report.rows.reduce((s, r) => {
      const ref = String(r[1])
      if (seen.has(ref) || typeof r[7] !== 'number') return s
      seen.add(ref)
      return s + r[7]
    }, 0)
    return total
  }
  total[0] = 'Total Amount'
  for (const i of report.money) total[i] = report.rows.reduce((s, r) => s + (typeof r[i] === 'number' ? r[i] : 0), 0)
  return total
}

/** File-name part of a report title: letters and digits only, e.g. "payments-refunds". */
const fileBase = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const csvHeading = (type: ReportType, title: string) => (type === 'payments' ? 'Payments & Refunds' : title)

function downloadXlsx(name: string, bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function download(name: string, csv: string) {
  // the byte-order mark makes Excel read the file as UTF-8 (so "—" doesn't show as "â€”")
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function ReportCard({ title, desc, onPreview, onExport, onExcel, exportLabel }: { title: string; desc: string; onPreview: () => void; onExport: () => void; onExcel?: () => void; exportLabel: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><FileText size={16} className="text-emerald-600" />{title}</h3>
      <p className="mt-2 min-h-[40px] text-[13px] text-slate-500">{desc}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={onPreview} className={secondaryBtnCls}><Eye size={15} /> Preview</button>
        <button onClick={onExport} className={primaryBtnCls}>{exportLabel === 'PDF' ? <FileText size={15} /> : <Download size={15} />} {exportLabel}</button>
        {onExcel && <button onClick={onExcel} className={primaryBtnCls}><Download size={15} /> Excel</button>}
      </div>
    </div>
  )
}

const COMBINED_TYPES = ['Payment', 'Advance', 'Refund', 'Expense']

function SummaryCard({ label, value, sub, tone }: { label: string; value: string; sub: React.ReactNode; tone: 'green' | 'red' | 'slate' }) {
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
        if (kind === 'room') return !f || f === 'All' || bookingHasRoom(String(row[i]), f)
        if (kind === 'status') return !f || f === 'All' || String(row[i]) === f
        if (kind === 'method') return !f || f === 'All' || String(row[i]).split(', ').includes(f)
        if (kind === 'type' || kind === 'category') return !f || f === 'All' || String(row[i]) === f
        return matchText(String(row[i]), f)
      }),
    )
  }, [report, filters])

  const summary = report && active ? summarize(active.type, filtered) : { credited: 0, debited: 0 }
  // Payments & Refunds: the B2B commission of the bookings listed, taken off Total Credited (0 on the other reports)
  // Payments & Refunds: payments received in cash vs. by bank / digital (UPI, card, bank transfer). A payment with no method counts as cash (the form's default).
  const paymentRows = active?.type === 'payments' ? filtered.filter((r) => r[4] === 'payment' && typeof r[6] === 'number') : []
  const cashTotal = paymentRows.filter((r) => r[5] === 'Cash' || r[5] === '—').reduce((sum, r) => sum + (r[6] as number), 0)
  const bankTotal = paymentRows.reduce((sum, r) => sum + (r[6] as number), 0) - cashTotal
  const b2bTotal = active?.type === 'payments'
    ? [...new Set(filtered.map((r) => String(r[1]).toLowerCase()))]
        .reduce((sum, ref) => sum + b2bRowsOf(data.expenses, ref).reduce((a, e) => a + e.amount, 0), 0)
    : 0

  function openPreview(type: ReportType, title: string) {
    setActive({ type, title })
    setFilters({})
    setBannerOpen(true)
  }

  /** The styled Excel file: "WeLand Resorts", the report name, the table and a Total row. */
  function exportExcel(type: ReportType, title: string, rep?: Report) {
    const r = rep ?? build(type, data, from, to, villa, basis)
    const heading = csvHeading(type, title)
    downloadXlsx(
      `${fileBase(title)}_${from}_${to}.xlsx`,
      buildXlsx({ sheetName: heading, heading: RESORT_HEADING, subheading: heading, columns: r.columns, rows: r.rows, money: r.money, total: csvTotal(type, r) }),
    )
  }

  function exportCsv(type: ReportType, title: string) {
    const r = build(type, data, from, to, villa, basis)
    download(`${fileBase(title)}_${from}_${to}.csv`, toCsv(r.columns, r.rows, csvHeading(type, title), csvTotal(type, r)))
  }

  return (
    <>
      <div className="mb-6"><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reports</h1></div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
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
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportCard title="Bookings" desc="All bookings with guest, stay, totals and amount paid." exportLabel="CSV" onPreview={() => openPreview('bookings', 'Bookings')} onExport={() => exportCsv('bookings', 'Bookings')} onExcel={() => exportExcel('bookings', 'Bookings')} />
        <ReportCard title="Payments & Refunds" desc="Every payment and refund line in the period." exportLabel="CSV" onPreview={() => openPreview('payments', 'Payments & Refunds')} onExport={() => exportCsv('payments', 'Payments')} onExcel={() => exportExcel('payments', 'Payments')} />
        <ReportCard title="Expenses" desc="Operating expenses by room and category." exportLabel="CSV" onPreview={() => openPreview('expenses', 'Expenses')} onExport={() => exportCsv('expenses', 'Expenses')} onExcel={() => exportExcel('expenses', 'Expenses')} />
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
            <SummaryCard
              label="Total Credited"
              value={formatINR(summary.credited - b2bTotal)}
              sub="money in"
              tone="green"
            />
            {active.type === 'payments' ? (
              <>
                <SummaryCard label="Collected in Cash" value={formatINR(cashTotal)} sub="payments received as cash" tone="slate" />
                <SummaryCard label="Collected by Bank & Digital" value={formatINR(bankTotal)} sub="UPI, card, bank transfer" tone="slate" />
              </>
            ) : (
              <>
                <SummaryCard label="Total Debited" value={formatINR(summary.debited)} sub="refunds + expenses out" tone="red" />
                <SummaryCard label="Overall Total" value={formatINR(summary.credited - summary.debited)} sub="credited − debited" tone="slate" />
              </>
            )}
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-slate-900">{active.title} · {filtered.length} Rows</h2>
              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-slate-400 sm:inline">Tip: type <code className="rounded bg-slate-100 px-1 text-slate-500">!term</code> to exclude</span>
                <button onClick={() => download(`${fileBase(active.title)}_${from}_${to}.csv`, toCsv(report.columns, filtered, csvHeading(active.type, active.title), csvTotal(active.type, { ...report, rows: filtered })))} className={primaryBtnCls}><Download size={15} /> Download CSV</button>
                <button onClick={() => exportExcel(active.type, active.title, { ...report, rows: filtered })} className={primaryBtnCls}><Download size={15} /> Download Excel</button>
              </div>
            </div>
            <div className="max-h-[520px] overflow-auto border-t border-slate-200 print:max-h-none print:overflow-visible">
              <table className={`w-full ${report.columns.length > 8 ? 'min-w-[1100px]' : 'min-w-[860px]'} border-collapse text-sm print:min-w-0 print:text-xs`}>
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b border-slate-200">
                    {report.columns.map((c, i) => (
                      <th key={c} className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${report.money.includes(i) ? 'text-right' : 'text-left'}`}>{c}</th>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-200 bg-white print:hidden">
                    {report.columns.map((c, i) => {
                      const kind = filterKind(c, i, report.money)
                      const val = filters[i] ?? ''
                      const set = (v: string) => setFilters((f) => ({ ...f, [i]: v }))
                      return (
                        <th key={c} className="px-2 py-1.5 align-top">
                          {kind === 'room' && (
                            <select value={val || 'All'} onChange={(e) => set(e.target.value)} className={filterSelectCls}>
                              <option>All</option>{ROOM_OPTIONS.map((v) => (<option key={v}>{v}</option>))}
                            </select>
                          )}
                          {kind === 'status' && (
                            <select value={val || 'All'} onChange={(e) => set(e.target.value)} className={filterSelectCls}>
                              <option>All</option>{BOOKING_STATUSES.map((s) => (<option key={s}>{s}</option>))}
                            </select>
                          )}
                          {kind === 'type' && (
                            <select value={val || 'All'} onChange={(e) => set(e.target.value)} className={filterSelectCls}>
                              <option>All</option>{COMBINED_TYPES.map((t) => (<option key={t}>{t}</option>))}
                            </select>
                          )}
                          {kind === 'category' && (
                            <select value={val || 'All'} onChange={(e) => set(e.target.value)} className={filterSelectCls}>
                              <option>All</option>{EXPENSE_CATEGORIES.map((c) => (<option key={c}>{c}</option>))}
                            </select>
                          )}
                          {kind === 'method' && (
                            <select value={val || 'All'} onChange={(e) => set(e.target.value)} className={filterSelectCls}>
                              <option>All</option>{PAYMENT_METHODS.map((m) => (<option key={m}>{m}</option>))}
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
