// ------------------------------------------------------------------
//  Management Report: a multi-sheet Excel workbook for owners and management,
//  laid out like the resort accounts template (Dashboard, P&L, Monthly, Cash Flow,
//  Room Summary, Receivables, B2B Commission, Bookings, Payments, Expenses, Setup)
//  and filled from Weland's bookings, payments and expenses.
//
//  Revenue follows each booking's check-in date (stay month, as on the Accounting
//  page); cash follows the payment / expense date. B2B commission follows its
//  booking's check-in. Balances and overdue days are as of `today`.
// ------------------------------------------------------------------
import { B2B_CATEGORY, effectiveRate, paidOf } from '../data/store'
import { ALL_ROOMS, bookingHasRoom, bookingRooms, FULL_PROPERTY, isFullProperty, primaryRoom, RESORT, ROOM_NAMES, ROOMS } from './config'
import { fmtDate, formatINR, monthLabel, parseISO, toISO } from './format'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from './permissions'
import { colName, dateSerial } from './xlsx'
import { inrFmt, Workbook, type BorderSide, type CellStyle, type CellValue, type NumFmt, type Sheet } from './xlsxBook'
import type { AppData, Booking, Expense, Payment } from '../types'

export const MANAGEMENT_SHEETS = [
  'Dashboard', 'P&L', 'Monthly', 'Cash Flow', 'Room Summary', 'Receivables',
  'B2B Commission', 'Bookings', 'Payments', 'Expenses', 'Balance Check', 'Setup & Notes',
]

/**
 * The Reports page's Period basis.
 * stay: bookings checking in during the period, with all their payments (any payment date); the P&L counts what was billed.
 * cash: money by the date it was paid; the P&L counts the money received (cash basis), as the Accounting page does.
 */
export type PeriodBasis = 'stay' | 'cash'

export interface ManagementOptions {
  from: string // yyyy-mm-dd; empty = from the earliest record
  to: string // yyyy-mm-dd; empty = today
  villa: string // "All rooms" or one room / Full Property
  today: string // as-of date for balances and overdue days
  basis?: PeriodBasis // default: stay
}

// ---------------------------------------------------------------- figures

const refKey = (r?: string) => (r ?? '').trim().toLowerCase()
const sum = <T>(list: T[], f: (x: T) => number) => list.reduce((s, x) => s + f(x), 0)
/** A payment with no method counts as cash, as on the Reports page. */
const isCash = (p: Payment) => !p.method || p.method === 'Cash'
const monthKey = (iso: string) => iso.slice(0, 7)
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

function daysBetween(a: string, b: string): number {
  return (dateSerial(b) ?? 0) - (dateSerial(a) ?? 0)
}
function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}
function monthKeys(from: string, to: string): string[] {
  const out: string[] = []
  let y = Number(from.slice(0, 4))
  let m = Number(from.slice(5, 7))
  const end = monthKey(to)
  for (;;) {
    const k = `${y}-${String(m).padStart(2, '0')}`
    out.push(k)
    if (k >= end || out.length >= 120) break
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return out
}
const nextMonthKey = (k: string) => {
  const y = Number(k.slice(0, 4))
  const m = Number(k.slice(5, 7))
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}
const monthName = (k: string) => monthLabel(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1)

/** "September 2026", "August – October 2026", or "3 Sep 2026 – 18 Oct 2026". */
function periodLabel(from: string, to: string): string {
  const wholeMonths = from.endsWith('-01') && monthKey(addDays(to, 1)) !== monthKey(to)
  if (!wholeMonths) return `${fmtDate(from)} – ${fmtDate(to)}`
  const a = monthKey(from)
  const b = monthKey(to)
  if (a === b) return monthName(a)
  return a.slice(0, 4) === b.slice(0, 4) ? `${monthName(a).split(' ')[0]} – ${monthName(b)}` : `${monthName(a)} – ${monthName(b)}`
}

/** Everything the report needs about one booking (money across all its payments). */
export interface BookingFacts {
  b: Booking
  cancelled: boolean
  nights: number
  roomNights: number // nights × rooms booked (Full Property = every unit)
  bank: number // payments by UPI / card / bank transfer
  cash: number
  refunds: number
  received: number // payments − refunds
  b2bOut: number // B2B commission the resort pays out
  b2bExt: number // B2B commission the partner kept from the guest's payment
  billed: number // the booking total (0 when cancelled)
  retained: number // cancelled: what was kept after refunds
  balance: number // what the guest still owes (0 when cancelled; below 0 = overpaid)
  netRevenue: number // billed + retained − all B2B commission
  overdue: number // days past check-out with a balance due
  payStatus: string
}

export interface PayLine { p: Payment; b: Booking; type: string; via: 'Cash' | 'Bank & digital'; signed: number }
export interface B2bLine { e: Expense; booking?: Booking; date: string } // date = the booking's check-in, or the entry date

export interface ManagementModel {
  from: string
  to: string
  villa: string
  today: string
  basis: PeriodBasis
  periodLabel: string
  months: string[]
  upcomingKey: string
  scope: Booking[] // every booking in the room filter
  facts: Map<Booking, BookingFacts>
  stays: BookingFacts[] // check-in in the period (all statuses)
  active: BookingFacts[] // stays that are not cancelled
  payments: PayLine[] // stay basis: every payment of the period's stays; cash basis: paid in the period
  expenses: Expense[] // dated in the period
  b2b: B2bLine[] // stay basis: commission of the period's stays (entries with no booking by their own date); cash basis: entries dated in the period
  b2bStay: B2bLine[] // commission of the period's stays, whatever the basis (for the views by check-in)
  units: string[]
  unitNights: { unit: string; nights: number; bookings: number }[] // nights each unit is booked within the period
  k: {
    billed: number; retained: number; bookings: number; cancelled: number; roomNights: number; guests: number
    income: number // stay basis: billed + retained; cash basis: money received less refunds
    b2bOut: number; b2bExt: number; b2b: number; netRevenue: number; opex: number; netProfit: number; margin: number
    bankAdvance: number; bankBalance: number; bankRefunds: number; cashIn: number; cashRefunds: number
    credited: number; bankIn: number; refunds: number // payments before refunds (the Reports page's Total Credited), and refunds
    bankNet: number; cashNet: number; collected: number
    b2bPaidByDate: number; b2bExtByDate: number
    receivable: number; receivableCount: number; credit: number
    upcomingCount: number; upcomingBilled: number; upcomingHeld: number; upcomingHeldInPeriod: number; upcomingBalance: number
    futureAdvances: number; avgBookingValue: number; collectionRate: number; b2bShare: number
  }
}

function factsOf(b: Booking, b2bByRef: Map<string, Expense[]>, today: string): BookingFacts {
  let bank = 0
  let cash = 0
  let refunds = 0
  for (const p of b.payments) {
    if (p.kind === 'refund') refunds += p.amount
    else if (isCash(p)) cash += p.amount
    else bank += p.amount
  }
  const received = bank + cash - refunds
  const entries = b2bByRef.get(refKey(b.ref)) ?? []
  const b2bOut = sum(entries.filter((e) => !e.external), (e) => e.amount)
  const b2bExt = sum(entries.filter((e) => e.external), (e) => e.amount)
  const cancelled = b.status === 'cancelled'
  const billed = cancelled ? 0 : b.total
  const retained = cancelled ? Math.max(0, received) : 0
  const balance = cancelled ? 0 : b.total - received - b2bExt
  const nights = Math.max(0, daysBetween(b.checkIn, b.checkOut))
  const overdue = !cancelled && balance > 0 && b.checkOut < today ? daysBetween(b.checkOut, today) : 0
  const payStatus = cancelled ? 'Cancelled'
    : b.total === 0 && received === 0 ? 'Not priced'
    : balance < 0 ? 'Overpaid'
    : balance === 0 ? 'Paid'
    : received + b2bExt > 0 ? 'Part paid' : 'Unpaid'
  return {
    b, cancelled, nights, roomNights: nights * Math.max(1, bookingRooms(b.villa).length),
    bank, cash, refunds, received, b2bOut, b2bExt, billed, retained, balance,
    netRevenue: billed + retained - b2bOut - b2bExt, overdue, payStatus,
  }
}

export function managementModel(data: AppData, o: ManagementOptions): ManagementModel {
  const roomOk = (v: string) => o.villa === ALL_ROOMS || bookingHasRoom(v, o.villa)
  const scope = data.bookings.filter((b) => roomOk(b.villa))

  // the period: as chosen, or the span of the records when a date is left empty
  let from = o.from
  let to = o.to || o.today
  if (!from) {
    const dates = [...scope.map((b) => b.checkIn), ...scope.flatMap((b) => b.payments.map((p) => p.date)), ...data.expenses.map((e) => e.date)].filter(Boolean).sort()
    from = dates[0] && dates[0] < to ? dates[0] : `${monthKey(to)}-01`
  }
  if (from > to) [from, to] = [to, from]
  const inPeriod = (d: string) => d >= from && d <= to

  const b2bAll = data.expenses.filter((e) => e.category === B2B_CATEGORY)
  const b2bByRef = new Map<string, Expense[]>()
  for (const e of b2bAll) {
    const r = refKey(e.bookingRef)
    if (r) b2bByRef.set(r, [...(b2bByRef.get(r) ?? []), e])
  }
  const facts = new Map<Booking, BookingFacts>()
  for (const b of scope) facts.set(b, factsOf(b, b2bByRef, o.today))
  const F = (b: Booking) => facts.get(b) as BookingFacts

  const stays = scope.filter((b) => inPeriod(b.checkIn)).sort((a, b) => (a.checkIn < b.checkIn ? -1 : a.checkIn > b.checkIn ? 1 : a.ref < b.ref ? -1 : 1)).map(F)
  const active = stays.filter((f) => !f.cancelled)

  const basis: PeriodBasis = o.basis ?? 'stay'
  const line = (p: Payment, b: Booking): PayLine => {
    const refund = p.kind === 'refund'
    return { p, b, type: refund ? 'Refund' : p.advance ? 'Advance' : 'Balance payment', via: isCash(p) ? 'Cash' : 'Bank & digital', signed: refund ? -p.amount : p.amount }
  }
  // money dated in the period, and every payment of the period's stays (as Reports → Payments & Refunds on each basis)
  const byDate: PayLine[] = []
  const forStays: PayLine[] = []
  for (const b of scope) {
    for (const p of b.payments) {
      if (inPeriod(p.date)) byDate.push(line(p, b))
      if (inPeriod(b.checkIn)) forStays.push(line(p, b))
    }
  }
  const payments = (basis === 'stay' ? forStays : byDate)
    .sort((a, b) => (a.p.date < b.p.date ? -1 : a.p.date > b.p.date ? 1 : a.b.ref < b.b.ref ? -1 : 1))

  const expenses = data.expenses.filter((e) => roomOk(e.villa) && inPeriod(e.date)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const byRef = new Map(data.bookings.map((b) => [refKey(b.ref), b]))
  const linked = (e: Expense) => (e.bookingRef ? byRef.get(refKey(e.bookingRef)) : undefined)
  const b2bStay: B2bLine[] = []
  for (const e of b2bAll) {
    const bk = linked(e)
    if (bk) {
      if (roomOk(bk.villa) && inPeriod(bk.checkIn)) b2bStay.push({ e, booking: bk, date: bk.checkIn })
    } else if (roomOk(e.villa) && inPeriod(e.date)) {
      b2bStay.push({ e, date: e.date })
    }
  }
  // cash basis: commission by its entry date, as the Expenses report and the Accounting page on Cash date
  const b2b = basis === 'stay' ? b2bStay : expenses.filter((e) => e.category === B2B_CATEGORY).map((e) => ({ e, booking: linked(e), date: e.date }))

  // nights each unit is booked within the period (overlapping stays count once)
  const units = o.villa === ALL_ROOMS || o.villa === FULL_PROPERTY ? ROOM_NAMES.slice() : [o.villa]
  const live = scope.filter((b) => b.status !== 'cancelled' && b.checkIn <= to && b.checkOut > from)
  const unitNights = units.map((unit) => {
    const nights = new Set<string>()
    let bookings = 0
    for (const b of live) {
      if (!bookingHasRoom(b.villa, unit)) continue
      bookings += 1
      for (let d = b.checkIn < from ? from : b.checkIn; d < b.checkOut && d <= to; d = addDays(d, 1)) nights.add(d)
    }
    return { unit, nights: nights.size, bookings }
  })

  const upcomingKey = nextMonthKey(monthKey(to))
  const upcoming = scope.filter((b) => b.status !== 'cancelled' && monthKey(b.checkIn) === upcomingKey).map(F)

  const pay = (f: (l: PayLine) => boolean) => sum(payments.filter(f), (l) => l.p.amount)
  const billed = sum(active, (f) => f.billed)
  const retained = sum(stays, (f) => f.retained)
  const b2bOut = sum(b2b.filter((l) => !l.e.external), (l) => l.e.amount)
  const b2bExt = sum(b2b.filter((l) => l.e.external), (l) => l.e.amount)
  const opex = sum(expenses.filter((e) => e.category !== B2B_CATEGORY), (e) => e.amount)
  const bankAdvance = pay((l) => l.via !== 'Cash' && l.type === 'Advance')
  const bankBalance = pay((l) => l.via !== 'Cash' && l.type === 'Balance payment')
  const bankRefunds = pay((l) => l.via !== 'Cash' && l.type === 'Refund')
  const cashIn = pay((l) => l.via === 'Cash' && l.type !== 'Refund')
  const cashRefunds = pay((l) => l.via === 'Cash' && l.type === 'Refund')
  const credited = bankAdvance + bankBalance + cashIn
  const collected = credited - bankRefunds - cashRefunds
  // stay basis: what the stays were billed, less all their commission. Cash basis: the money received, less the
  // commission the resort paid out (commission a partner kept never reached the resort, so it is already out).
  const income = basis === 'stay' ? billed + retained : collected
  const netRevenue = income - (basis === 'stay' ? b2bOut + b2bExt : b2bOut)
  const netProfit = netRevenue - opex
  const owing = active.filter((f) => f.balance > 0)

  return {
    from, to, villa: o.villa, today: o.today, basis,
    periodLabel: periodLabel(from, to),
    months: monthKeys(from, to), upcomingKey, scope, facts, stays, active, payments, expenses, b2b, b2bStay, units, unitNights,
    k: {
      billed, retained, bookings: active.length, cancelled: stays.length - active.length,
      roomNights: sum(active, (f) => f.roomNights), guests: sum(active, (f) => f.b.guests),
      income, b2bOut, b2bExt, b2b: b2bOut + b2bExt, netRevenue, opex, netProfit,
      margin: income ? netProfit / income : 0,
      bankAdvance, bankBalance, bankRefunds, cashIn, cashRefunds,
      bankNet: bankAdvance + bankBalance - bankRefunds, cashNet: cashIn - cashRefunds,
      collected, credited, bankIn: bankAdvance + bankBalance, refunds: bankRefunds + cashRefunds,
      b2bPaidByDate: sum(expenses.filter((e) => e.category === B2B_CATEGORY && !e.external), (e) => e.amount),
      b2bExtByDate: sum(expenses.filter((e) => e.category === B2B_CATEGORY && e.external), (e) => e.amount),
      receivable: sum(owing, (f) => f.balance), receivableCount: owing.length,
      credit: -sum(active.filter((f) => f.balance < 0), (f) => f.balance),
      upcomingCount: upcoming.length, upcomingBilled: sum(upcoming, (f) => f.billed), upcomingHeld: sum(upcoming, (f) => f.received),
      upcomingHeldInPeriod: sum(byDate.filter((l) => upcoming.some((f) => f.b === l.b)), (l) => l.signed),
      upcomingBalance: sum(upcoming, (f) => Math.max(0, f.balance)),
      futureAdvances: sum(scope.filter((b) => b.status !== 'cancelled' && b.checkIn > o.today), (b) => F(b).received),
      avgBookingValue: active.length ? billed / active.length : 0,
      collectionRate: billed ? (sum(active, (f) => f.received + f.b2bExt)) / billed : 0,
      b2bShare: (basis === 'stay' ? billed : credited) ? (b2bOut + b2bExt) / (basis === 'stay' ? billed : credited) : 0,
    },
  }
}

// ---------------------------------------------------------------- look

// Brand colours from the logo (maroon and gold), with warm neutrals
const C = {
  maroon: '5E2432', maroonDark: '45182A', gold: 'E8CF96', goldDeep: 'A8844F', goldTint: 'F7EEDC',
  maroonTint: 'F5ECEE', cream: 'FBF8F3', ink: '1E293B', muted: '6B7280', line: 'E6E0D6',
  white: 'FFFFFF', green: '047857', red: 'B91C1C',
}
const thin = (color: string): BorderSide => ({ style: 'thin', color })
const grid = { top: thin(C.line), bottom: thin(C.line), left: thin(C.line), right: thin(C.line) }

type Kind = 'text' | 'money' | 'date' | 'month' | 'int' | 'pct' | 'center'
const FMT: Partial<Record<Kind, NumFmt>> = { date: 'date', month: 'month', int: 'int', pct: 'pct' }
const ALIGN: Record<Kind, CellStyle['h']> = { text: 'left', money: 'right', date: 'center', month: 'left', int: 'right', pct: 'right', center: 'center' }
/** Number format for a cell: ₹ amounts pick theirs by value, so a negative amount keeps its minus sign. */
const fmtOf = (kind: Kind, v?: CellValue) => (kind === 'money' ? inrFmt(typeof v === 'number' ? v : 0) : FMT[kind])
const isNeg = (kind: Kind, v?: CellValue) => kind === 'money' && typeof v === 'number' && v < 0
const indentOf = (kind: Kind) => (kind === 'text' || kind === 'month' ? 1 : undefined)

function themeOf(wb: Workbook) {
  const st = (s: CellStyle) => wb.style(s)
  return {
    band: st({ fill: C.maroon }),
    bandTitle: st({ fill: C.maroon, bold: true, size: 16, color: C.gold, h: 'left', indent: 1 }),
    bandSub: st({ fill: C.maroon, size: 10, color: 'F3E9DA', h: 'left', indent: 1 }),
    rule: st({ fill: C.gold }),
    title: st({ bold: true, size: 15, color: C.maroon, h: 'left' }),
    desc: st({ italic: true, size: 9.5, color: C.muted, h: 'left' }),
    th: (kind: Kind = 'text') => st({
      bold: true, size: 10, color: C.white, fill: C.maroon, h: kind === 'text' ? 'left' : kind === 'month' ? 'right' : 'center', indent: kind === 'text' ? 1 : undefined, wrap: true,
      top: thin(C.maroonDark), bottom: thin(C.maroonDark), left: thin(C.maroonDark), right: thin(C.maroonDark), fmt: kind === 'month' ? 'month' : undefined,
    }),
    td: (kind: Kind, alt: boolean, o: { muted?: boolean; v?: CellValue } = {}) => st({
      ...grid, fill: alt ? C.cream : undefined, fmt: fmtOf(kind, o.v), h: ALIGN[kind], indent: indentOf(kind), size: 10,
      italic: o.muted || undefined, color: isNeg(kind, o.v) ? C.red : o.muted ? C.muted : undefined,
    }),
    total: (kind: Kind, v?: CellValue) => st({
      bold: true, size: 10, color: isNeg(kind, v) ? C.red : C.maroon, fill: C.goldTint, fmt: fmtOf(kind, v), h: ALIGN[kind], indent: indentOf(kind),
      top: thin(C.maroon), bottom: { style: 'double', color: C.maroon }, left: thin(C.line), right: thin(C.line),
    }),
    section: st({ bold: true, size: 10, color: C.maroon, fill: C.maroonTint, h: 'left', indent: 1, bottom: thin(C.gold), top: thin(C.line) }),
    // statement lines (P&L, Cash Flow, Dashboard)
    line: (kind: Kind, o: { memo?: boolean; level?: 'item' | 'sub' | 'grand'; v?: CellValue; tone?: boolean } = {}) => {
      const level = o.level ?? 'item'
      const neg = isNeg(kind, o.v)
      const color = neg ? C.red : o.tone && typeof o.v === 'number' ? C.green : o.memo ? C.muted : level === 'grand' ? C.maroon : undefined
      const base: CellStyle = { size: 10, fmt: fmtOf(kind, o.v), h: ALIGN[kind], indent: kind === 'text' ? (level === 'item' ? 2 : 1) : undefined, color, italic: o.memo || undefined }
      if (level === 'sub') return st({ ...base, bold: true, top: thin(C.goldDeep), bottom: thin(C.line) })
      if (level === 'grand') return st({ ...base, bold: true, fill: C.goldTint, top: thin(C.maroon), bottom: { style: 'double', color: C.maroon } })
      return st({ ...base, bottom: { style: 'hair', color: C.line } })
    },
    note: st({ size: 10, h: 'left', v: 'top', wrap: true }),
    noteNum: st({ size: 10, bold: true, color: C.maroon, h: 'right', v: 'top' }),
    key: st({ size: 10, color: C.muted, h: 'left', indent: 1, bottom: { style: 'hair', color: C.line } }),
    value: st({ size: 10, bold: true, h: 'left', indent: 1, bottom: { style: 'hair', color: C.line } }),
    empty: st({ italic: true, size: 10, color: C.muted, h: 'left', indent: 1, ...grid }),
    tile: (part: 'label' | 'value' | 'sub', side: 'l' | 'r', o: { fmt?: NumFmt; color?: string } = {}) => {
      const edge = side === 'l' ? { left: thin(C.line) } : { right: thin(C.line) }
      if (part === 'label') return st({ ...edge, fill: C.cream, bold: true, size: 8.5, color: C.goldDeep, h: 'left', indent: 1, v: 'bottom', top: { style: 'medium', color: C.gold } })
      if (part === 'value') return st({ ...edge, fill: C.cream, bold: true, size: 18, color: o.color ?? C.maroon, h: 'left', indent: 1, fmt: o.fmt })
      return st({ ...edge, fill: C.cream, size: 9, color: C.muted, h: 'left', indent: 1, v: 'top', bottom: thin(C.line), wrap: true })
    },
  }
}
type Theme = ReturnType<typeof themeOf>

const ref = (c: number, r: number) => `${colName(c)}${r}`
const rng = (c: number, r1: number, r2: number) => `${colName(c)}${r1}:${colName(c)}${r2}`
const asDate = (iso?: string) => (iso ? dateSerial(iso) : null)
const pctText = (x: number) => `${(x * 100).toFixed(1)}%`

/** A figure the Balance Check sheet compares: a sheet-qualified cell reference and its value. */
interface Mark { ref: string; v: number }
interface Ctx { wb: Workbook; t: Theme; m: ManagementModel; subtitle: string; footer: string; logo: boolean; rates: Record<string, number>; capacity: Record<string, string>; marks: Record<string, Mark> }

function mark(ctx: Ctx, key: string, sh: Sheet, row: number, col: number, v: number) {
  ctx.marks[key] = { ref: `'${sh.name.replace(/'/g, "''")}'!$${colName(col)}$${row}`, v }
}

/** Brand header on every sheet: logo + resort name on a maroon band, a gold rule, then the sheet title and description. */
function frame(sh: Sheet, ctx: Ctx, lastCol: number, title: string, desc: string) {
  const { t } = ctx
  sh.height(1, 30); sh.height(2, 22); sh.height(3, 4); sh.height(4, 28); sh.height(5, 18); sh.height(6, 6)
  for (let c = 0; c <= lastCol; c++) {
    sh.set(1, c, null, t.band)
    sh.set(2, c, null, t.band)
    sh.set(3, c, null, t.rule)
  }
  sh.set(1, 1, RESORT.name, t.bandTitle); sh.merge(1, 1, 1, lastCol)
  sh.set(2, 1, ctx.subtitle, t.bandSub); sh.merge(2, 1, 2, lastCol)
  sh.set(4, 1, title, t.title); sh.merge(4, 1, 4, lastCol)
  sh.set(5, 1, desc, t.desc); sh.merge(5, 1, 5, lastCol)
  if (ctx.logo) sh.logo = { col: 0, row: 0, x: 10, y: 5, size: 58 }
  sh.footer = ctx.footer
}

interface Col { title: string; width: number; kind: Kind; total?: 'sum' | 'none' }
type RowValue = string | number | null | undefined

/**
 * A ledger table: maroon header, zebra rows, a Total row with live SUM formulas.
 * Columns start at B (A is the margin under the logo). Returns where things landed.
 */
function table(sh: Sheet, ctx: Ctx, top: number, cols: Col[], rows: RowValue[][], o: { totalLabel?: string; muted?: (i: number) => boolean; emptyText?: string; filter?: boolean; customTotal?: Record<number, { f: string; v: number }>; marks?: Record<number, string> } = {}) {
  const { t } = ctx
  const c0 = 1
  sh.height(top, 32)
  cols.forEach((col, i) => sh.set(top, c0 + i, col.title, t.th(col.kind === 'text' || col.kind === 'month' ? 'text' : 'center')))
  const first = top + 1
  if (rows.length === 0) {
    sh.set(first, c0, o.emptyText ?? 'No records in this period.', t.empty)
    for (let i = 1; i < cols.length; i++) sh.set(first, c0 + i, null, t.empty)
    sh.merge(first, c0, first, c0 + cols.length - 1)
    // an empty table still answers the Balance Check: its totals are 0
    for (const key of Object.values(o.marks ?? {})) ctx.marks[key] = { ref: '0', v: 0 }
    return { top, first, last: first, totalRow: first, cols: c0 }
  }
  rows.forEach((r, ri) => {
    const row = first + ri
    const alt = ri % 2 === 1
    const muted = o.muted?.(ri) ?? false
    cols.forEach((col, ci) => {
      const raw = r[ci]
      let v: CellValue = raw === undefined ? null : raw
      if ((col.kind === 'date' || col.kind === 'month') && typeof raw === 'string') v = asDate(raw)
      sh.set(row, c0 + ci, v, t.td(col.kind, alt, { muted, v }))
    })
  })
  const last = first + rows.length - 1
  const totalRow = last + 1
  sh.height(totalRow, 24)
  cols.forEach((col, ci) => {
    const c = c0 + ci
    if (ci === 0) return sh.set(totalRow, c, o.totalLabel ?? 'Total', t.total('text'))
    const custom = o.customTotal?.[ci]
    const key = o.marks?.[ci]
    if (custom) {
      if (key) mark(ctx, key, sh, totalRow, c, custom.v)
      return sh.set(totalRow, c, custom.v, t.total(col.kind, custom.v), custom.f)
    }
    if (col.total === 'sum' || (col.total === undefined && (col.kind === 'money' || col.kind === 'int'))) {
      const v = rows.reduce((s, r) => s + (typeof r[ci] === 'number' ? (r[ci] as number) : 0), 0)
      if (key) mark(ctx, key, sh, totalRow, c, v)
      return sh.set(totalRow, c, v, t.total(col.kind, v), `SUM(${rng(c, first, last)})`)
    }
    sh.set(totalRow, c, null, t.total('text'))
  })
  if (o.filter !== false) sh.autoFilter = `${ref(c0, top)}:${ref(c0 + cols.length - 1, last)}`
  return { top, first, last, totalRow, cols: c0 }
}

/** "2–6": a room's guest range, as saved on the Rooms page. */
function capacityOf(name: string, data: AppData): string {
  const rm = ROOMS.find((r) => r.name === name)
  const ov = data.villaOverrides[name]
  return `${ov?.minGuests ?? rm?.minGuests ?? 1}–${ov?.maxGuests ?? rm?.maxGuests ?? 1}`
}

interface SummaryLine { key?: string; label: string; value: number; f: string; level?: 'item' | 'sub'; memo?: boolean }

/** A small Summary block under a ledger: labels from column B, live formulas in `valueCol` ({L0}, {L1}… = earlier lines). */
function summaryBlock(sh: Sheet, ctx: Ctx, row: number, valueCol: number, lines: SummaryLine[]) {
  const { t, wb } = ctx
  sh.set(row, 1, 'Summary', wb.style({ bold: true, size: 12, color: C.maroon, h: 'left' }))
  sh.height(row, 22)
  lines.forEach((l, i) => {
    const r = row + 1 + i
    const level = l.level ?? 'item'
    for (let c = 1; c < valueCol; c++) sh.set(r, c, c === 1 ? l.label : null, t.line('text', { level, memo: l.memo }))
    sh.merge(r, 1, r, valueCol - 1)
    const f = l.f.replace(/\{L(\d+)\}/g, (_, n: string) => ref(valueCol, row + 1 + Number(n)))
    sh.set(r, valueCol, l.value, t.line('money', { level, memo: l.memo, v: l.value }), f)
    if (l.key) mark(ctx, l.key, sh, r, valueCol, l.value)
  })
}

function widths(sh: Sheet, cols: Col[]) {
  sh.widths = [10, ...cols.map((c) => c.width)]
}

// ---------------------------------------------------------------- sheets

interface DashLine { id?: string; label: string; value: number; kind?: 'money' | 'int' | 'pct'; level?: 'item' | 'sub' | 'grand'; memo?: boolean; f?: string; tone?: boolean }

/**
 * A Dashboard block (title, caption, lines) in one of the two columns; returns the next free row.
 * Line ids are shared across the sheet (`refs`), so a formula can use a line of an earlier block.
 */
function dashSection(sh: Sheet, ctx: Ctx, refs: Record<string, string>, row: number, col: number, title: string, caption: string, lines: DashLine[]): number {
  const { t, wb } = ctx
  sh.height(row, 22)
  sh.set(row, col, title, t.section)
  sh.set(row, col + 1, null, t.section)
  sh.set(row + 1, col, caption, wb.style({ italic: true, size: 9, color: C.muted, h: 'left', indent: 1 }))
  sh.merge(row + 1, col, row + 1, col + 1)
  sh.height(row + 1, 16)
  let r = row + 2
  for (const l of lines) {
    const kind = l.kind ?? 'money'
    const level = l.level ?? 'item'
    if (l.id) {
      refs[l.id] = ref(col + 1, r)
      mark(ctx, `dash.${l.id}`, sh, r, col + 1, l.value)
    }
    sh.height(r, level === 'item' ? 19 : 22)
    sh.set(r, col, l.label, t.line('text', { level, memo: l.memo }))
    const f = l.f?.replace(/\{(\w+)\}/g, (_, id: string) => refs[id] ?? '0')
    sh.set(r, col + 1, l.value, t.line(kind, { level, memo: l.memo, v: l.value, tone: l.tone }), f)
    r += 1
  }
  sh.height(r, 12)
  return r + 1
}

function dashboard(ctx: Ctx) {
  const { wb, t, m } = ctx
  const k = m.k
  const sh = wb.sheet('Dashboard')
  sh.widths = [10, 44, 17, 3, 44, 17]
  sh.landscape = false
  sh.fitPage = true
  sh.tabColor = C.maroon
  const stay = m.basis === 'stay'
  frame(sh, ctx, 5, `Dashboard · ${m.periodLabel}`, stay
    ? 'Stay month: the bookings checking in during the period, with all their payments (any payment date). Expenses by their date.'
    : 'Cash date: money by the date it was paid and expenses by their date; the result is the money received (cash basis).')

  // KPI tiles: two per row
  const tiles: { label: string; value: number; fmt: NumFmt; sub: string; color?: string }[] = [
    { label: 'ROOM REVENUE BILLED', value: k.billed, fmt: 'inr', sub: `${k.bookings} bookings · ${k.roomNights} room-nights · ${k.guests} guests` },
    {
      label: stay ? 'TOTAL CREDITED (FOR THESE STAYS)' : 'TOTAL CREDITED (BY PAYMENT DATE)', value: k.credited, fmt: 'inr',
      sub: `Cash ${formatINR(k.cashIn)} · Bank & digital ${formatINR(k.bankIn)} · ${k.refunds ? `less refunds ${formatINR(k.refunds)} = net ${formatINR(k.collected)}` : 'no refunds'}`,
    },
    {
      label: stay ? 'NET PROFIT / (LOSS)' : 'NET PROFIT / (LOSS) · CASH BASIS', value: k.netProfit, fmt: 'inr', color: k.netProfit < 0 ? C.red : C.green,
      sub: stay ? `${pctText(k.margin)} of income · after B2B commission and expenses` : `${pctText(k.margin)} of money received · after B2B paid out and expenses`,
    },
    { label: 'OUTSTANDING FROM GUESTS', value: k.receivable, fmt: 'inr', sub: `${k.receivableCount} booking${k.receivableCount === 1 ? '' : 's'} with a balance due (as of ${fmtDate(m.today)})` },
    { label: 'EXPENSES PAID (BY EXPENSE DATE)', value: k.opex + k.b2bPaidByDate, fmt: 'inr', sub: `Operating ${formatINR(k.opex)} · B2B commission paid out ${formatINR(k.b2bPaidByDate)}` },
    {
      label: stay ? 'B2B COMMISSION (THESE STAYS)' : 'B2B COMMISSION (BY ENTRY DATE)', value: k.b2b, fmt: 'inr',
      sub: `${pctText(k.b2bShare)} of ${stay ? 'billed' : 'money credited'} · paid out ${formatINR(k.b2bOut)} · kept by partners ${formatINR(k.b2bExt)}`,
    },
  ]
  tiles.forEach((tile, i) => {
    const r = 7 + Math.floor(i / 2) * 4
    const c = i % 2 === 0 ? 1 : 4
    sh.height(r, 18); sh.height(r + 1, 30); sh.height(r + 2, 28); sh.height(r + 3, 8)
    sh.set(r, c, tile.label, t.tile('label', 'l')); sh.set(r, c + 1, null, t.tile('label', 'r')); sh.merge(r, c, r, c + 1)
    const fmt = tile.fmt === 'inr' ? inrFmt(tile.value) : tile.fmt
    sh.set(r + 1, c, tile.value, t.tile('value', 'l', { fmt, color: tile.color })); sh.set(r + 1, c + 1, null, t.tile('value', 'r')); sh.merge(r + 1, c, r + 1, c + 1)
    if (i === 0) mark(ctx, 'dash.tileBilled', sh, r + 1, c, tile.value)
    if (i === 1) mark(ctx, 'dash.tileCredited', sh, r + 1, c, tile.value)
    sh.set(r + 2, c, tile.sub, t.tile('sub', 'l')); sh.set(r + 2, c + 1, null, t.tile('sub', 'r')); sh.merge(r + 2, c, r + 2, c + 1)
  })

  // two columns of blocks under the tiles: cash on the left, result and position on the right
  const refs: Record<string, string> = {}
  let left = 20
  // the same terms as Reports → Payments & Refunds: payments before refunds, then refunds, then net
  const when = stay ? 'for stays checking in during the period (any payment date)' : 'by payment date'
  left = dashSection(sh, ctx, refs, left, 1, '1 · COLLECTED BY BANK & DIGITAL', `UPI, card and bank transfer, ${when}`, [
    { id: 'bAdv', label: 'Advances received', value: k.bankAdvance },
    { id: 'bBal', label: 'Balance payments received', value: k.bankBalance },
    { id: 'bIn', label: 'Collected by bank & digital', value: k.bankIn, level: 'sub', f: '{bAdv}+{bBal}' },
    { id: 'bRef', label: 'Less: refunds paid by bank & digital', value: k.bankRefunds },
    { id: 'bank', label: 'Net bank & digital (match to the bank)', value: k.bankNet, level: 'sub', f: '{bIn}-{bRef}' },
  ])
  left = dashSection(sh, ctx, refs, left, 1, '2 · COLLECTED IN CASH', `Cash (and payments with no method), ${when}`, [
    { id: 'cIn', label: 'Collected in cash', value: k.cashIn },
    { id: 'cRef', label: 'Less: cash refunds paid', value: k.cashRefunds },
    { id: 'cash', label: 'Net cash received', value: k.cashNet, level: 'sub', f: '{cIn}-{cRef}' },
    { id: 'credited', label: 'Total credited (cash + bank & digital)', value: k.credited, level: 'grand', f: '{cIn}+{bIn}' },
    { id: 'collected', label: 'Net collected after refunds', value: k.collected, level: 'sub', f: '{bank}+{cash}' },
  ])
  dashSection(sh, ctx, refs, left, 1, `3 · UPCOMING STAYS · ${monthName(m.upcomingKey).toUpperCase()}`, 'Bookings checking in next month', [
    { label: 'Bookings', value: k.upcomingCount, kind: 'int' },
    { label: 'Total billed', value: k.upcomingBilled },
    { label: 'Advances held (received so far)', value: k.upcomingHeld },
    { label: 'of which received in this period', value: k.upcomingHeldInPeriod, memo: true },
    { label: 'Balance still to collect', value: k.upcomingBalance, level: 'sub' },
  ])

  let right = 20
  right = dashSection(sh, ctx, refs, right, 4, stay ? '4 · RESULT' : '4 · RESULT · CASH BASIS', stay
    ? 'Bookings checking in during the period; operating expenses by their date'
    : 'Money received in the period; B2B paid out and expenses by their date', stay
    ? [
      { id: 'billed', label: 'Room revenue billed', value: k.billed },
      { id: 'ret', label: 'Retained on cancelled bookings', value: k.retained },
      { id: 'b2b', label: 'Less: B2B commission on these stays', value: k.b2b },
      { id: 'net', label: 'Net revenue', value: k.netRevenue, level: 'sub', f: '{billed}+{ret}-{b2b}' },
      { id: 'opex', label: 'Less: operating expenses', value: k.opex },
      { id: 'profit', label: 'Net profit / (loss)', value: k.netProfit, level: 'grand', f: '{net}-{opex}', tone: true },
      { label: 'Net margin (of billed + retained)', value: k.margin, kind: 'pct', f: 'IF(({billed}+{ret})=0,0,{profit}/({billed}+{ret}))' },
    ]
    : [
      { id: 'inc', label: 'Payments received (total credited)', value: k.credited },
      { id: 'ref', label: 'Less: refunds paid', value: k.refunds },
      { id: 'b2b', label: 'Less: B2B commission paid out', value: k.b2bOut },
      { id: 'net', label: 'Net revenue (money kept)', value: k.netRevenue, level: 'sub', f: '{inc}-{ref}-{b2b}' },
      { id: 'opex', label: 'Less: operating expenses', value: k.opex },
      { id: 'profit', label: 'Net profit / (loss)', value: k.netProfit, level: 'grand', f: '{net}-{opex}', tone: true },
      { label: 'Net margin (of money received after refunds)', value: k.margin, kind: 'pct', f: 'IF(({inc}-{ref})=0,0,{profit}/({inc}-{ref}))' },
      { label: 'B2B kept by partners (already out of the payments)', value: k.b2bExt, memo: true },
    ])
  right = dashSection(sh, ctx, refs, right, 4, '5 · EXPENSES PAID', 'By expense date', [
    { id: 'eOp', label: 'Operating expenses (excl. B2B commission)', value: k.opex },
    { id: 'eB2b', label: 'B2B commission paid out by the resort', value: k.b2bPaidByDate },
    { label: 'Total paid out', value: k.opex + k.b2bPaidByDate, level: 'sub', f: 'SUM({eOp}:{eB2b})' },
    { label: 'B2B kept by partners (not paid by the resort)', value: k.b2bExtByDate, memo: true },
  ])
  dashSection(sh, ctx, refs, right, 4, '6 · POSITION', `As of ${fmtDate(m.today)}`, [
    { label: 'Guest balances receivable (this period’s stays)', value: k.receivable },
    { label: 'Credit with guests (overpaid)', value: k.credit, memo: true },
    { label: 'Advances held for stays after today', value: k.futureAdvances },
    { label: 'Average booking value', value: k.avgBookingValue },
    { label: 'Collection rate (received ÷ billed)', value: k.collectionRate, kind: 'pct' },
  ])
}

/** Statement sheets (P&L, Cash Flow): line items down, months across, Total at the end. */
interface StatementLine { id?: string; label: string; values?: number[]; level?: 'section' | 'item' | 'sub' | 'grand'; memo?: boolean; kind?: 'money' | 'pct'; f?: string; tone?: boolean; cumulative?: boolean }

function statement(ctx: Ctx, name: string, title: string, desc: string, lines: StatementLine[]) {
  const { wb, t, m } = ctx
  const sh = wb.sheet(name)
  const n = m.months.length
  const totalCol = 2 + n
  sh.widths = [10, 46, ...m.months.map(() => 14), 16]
  sh.tabColor = C.maroon
  frame(sh, ctx, totalCol, title, desc)
  sh.height(7, 26)
  sh.set(7, 1, 'Line item', t.th('text'))
  m.months.forEach((mk, i) => sh.set(7, 2 + i, asDate(`${mk}-01`), t.th('month')))
  sh.set(7, totalCol, 'Total', t.th('center'))
  sh.freeze = { rows: 7, cols: 2 }

  const rows: Record<string, number> = {}
  let r = 8
  for (const l of lines) {
    const level = l.level ?? 'item'
    if (level === 'section') {
      sh.height(r, 20)
      sh.set(r, 1, l.label, t.section)
      for (let c = 2; c <= totalCol; c++) sh.set(r, c, null, t.section)
      r += 1
      continue
    }
    if (l.id) rows[l.id] = r
    const kind = l.kind ?? 'money'
    const vals = l.values ?? m.months.map(() => 0)
    sh.height(r, level === 'item' ? 19 : 22)
    sh.set(r, 1, l.label, t.line('text', { level, memo: l.memo }))
    const fill = (c: number) => l.f?.replace(/\{(\w+)\}/g, (_, id: string) => `${colName(c)}${rows[id]}`).replace(/\{col\}/g, colName(c))
    let running = 0
    vals.slice(0, n).forEach((v, i) => {
      const c = 2 + i
      let formula = fill(c)
      let value = v
      if (l.cumulative) {
        running += v
        value = running
        formula = i === 0 ? `${colName(c)}${rows.net}` : `${colName(c - 1)}${r}+${colName(c)}${rows.net}`
      }
      sh.set(r, c, value, t.line(kind, { level, memo: l.memo, v: value, tone: l.tone }), formula)
    })
    // the Total column (a percentage line passes its total as the value after the months)
    const total = kind === 'pct' ? 0 : vals.slice(0, n).reduce((s, v) => s + v, 0)
    if (l.cumulative) {
      sh.set(r, totalCol, null, t.line('money', { level, memo: l.memo }))
    } else if (kind === 'pct') {
      sh.set(r, totalCol, vals[n] ?? 0, t.line('pct', { level, memo: l.memo }), fill(totalCol))
    } else {
      const f = l.f ? fill(totalCol) : `SUM(${colName(2)}${r}:${colName(totalCol - 1)}${r})`
      sh.set(r, totalCol, total, t.line(kind, { level, memo: l.memo, v: total, tone: l.tone }), f)
      if (l.id) mark(ctx, `${name}.${l.id}`, sh, r, totalCol, total)
    }
    r += 1
  }
  return sh
}

function pnl(ctx: Ctx) {
  const { m } = ctx
  const by = <T>(list: T[], date: (x: T) => string, amount: (x: T) => number) => m.months.map((mk) => sum(list.filter((x) => monthKey(date(x)) === mk), amount))
  const opex = m.expenses.filter((e) => e.category !== B2B_CATEGORY)
  const cats = [...EXPENSE_CATEGORIES.filter((c) => c !== B2B_CATEGORY), ...[...new Set(opex.map((e) => e.category))].filter((c) => !EXPENSE_CATEGORIES.includes(c)).sort()]
  const catLines: StatementLine[] = cats.map((c, i) => ({
    id: i === 0 ? 'cat0' : i === cats.length - 1 ? 'catN' : undefined,
    label: c,
    values: by(opex.filter((e) => e.category === c), (e) => e.date, (e) => e.amount),
  }))
  const opexSum = cats.length > 1 ? 'SUM({cat0}:{catN})' : cats.length === 1 ? '{cat0}' : undefined
  const add = (...a: number[][]) => m.months.map((_, i) => a.reduce((s, x) => s + x[i], 0))
  const less = (a: number[], b: number[]) => a.map((x, i) => x - b[i])
  const totalOf = (v: number[]) => v.reduce((s, x) => s + x, 0)
  const opexTotal = add(...catLines.map((l) => l.values as number[]))
  const b2bOut = by(m.b2b.filter((l) => !l.e.external), (l) => l.date, (l) => l.e.amount)
  const b2bExt = by(m.b2b.filter((l) => l.e.external), (l) => l.date, (l) => l.e.amount)
  const marginOf = (income: number[], profit: number[]) =>
    [...m.months.map((_, i) => (income[i] ? profit[i] / income[i] : 0)), totalOf(income) ? totalOf(profit) / totalOf(income) : 0]
  const expenseLines: StatementLine[] = [
    { label: 'LESS: OPERATING EXPENSES', level: 'section' },
    ...catLines,
    { id: 'opex', label: 'Total operating expenses', values: opexTotal, level: 'sub', f: opexSum },
  ]

  if (m.basis === 'cash') {
    // cash basis: the money received (net of refunds), less the commission the resort paid out
    const received = by(m.payments.filter((l) => l.type !== 'Refund'), (l) => l.p.date, (l) => l.p.amount)
    const refunds = by(m.payments.filter((l) => l.type === 'Refund'), (l) => l.p.date, (l) => l.p.amount)
    const income = less(received, refunds)
    const net = less(income, b2bOut)
    const profit = less(net, opexTotal)
    const sh = statement(ctx, 'P&L', `Profit & Loss (cash basis) · ${m.periodLabel}`, 'Cash date: money received by payment month; B2B commission paid out and operating expenses by their own month.', [
      { label: 'INCOME (MONEY RECEIVED)', level: 'section' },
      { id: 'rcv', label: 'Payments received (total credited)', values: received },
      { id: 'ref', label: 'Less: refunds paid', values: refunds },
      { id: 'inc', label: 'Money received after refunds', values: income, level: 'sub', f: '{rcv}-{ref}' },
      { label: 'LESS: B2B COMMISSION', level: 'section' },
      { id: 'out', label: 'Paid out by the resort', values: b2bOut },
      { id: 'net', label: 'NET REVENUE', values: net, level: 'grand', f: '{inc}-{out}' },
      ...expenseLines,
      { id: 'profit', label: 'NET PROFIT / (LOSS)', values: profit, level: 'grand', f: '{net}-{opex}', tone: true },
      { label: 'Net margin (of money received after refunds)', values: marginOf(income, profit), kind: 'pct', f: 'IF({inc}=0,0,{profit}/{inc})' },
      { label: 'MEMO', level: 'section' },
      { label: 'B2B kept by partners (already out of the payments)', values: b2bExt, memo: true },
    ])
    sh.fitPage = true
    return
  }

  const billed = by(m.active, (f) => f.b.checkIn, (f) => f.billed)
  const retained = by(m.stays, (f) => f.b.checkIn, (f) => f.retained)
  const income = add(billed, retained)
  const b2b = add(b2bOut, b2bExt)
  const net = less(income, b2b)
  const profit = less(net, opexTotal)
  const sh = statement(ctx, 'P&L', `Profit & Loss · ${m.periodLabel}`, 'Stay month: income and B2B commission by check-in month; operating expenses by expense month.', [
    { label: 'INCOME', level: 'section' },
    { id: 'billed', label: 'Room revenue billed', values: billed },
    { id: 'ret', label: 'Retained on cancelled bookings', values: retained },
    { id: 'inc', label: 'Total income', values: income, level: 'sub', f: 'SUM({billed}:{ret})' },
    { label: 'LESS: B2B COMMISSION', level: 'section' },
    { id: 'out', label: 'Paid out by the resort', values: b2bOut },
    { id: 'ext', label: 'Kept by partners from the guest payment', values: b2bExt },
    { id: 'b2b', label: 'Total B2B commission', values: b2b, level: 'sub', f: 'SUM({out}:{ext})' },
    { id: 'net', label: 'NET REVENUE', values: net, level: 'grand', f: '{inc}-{b2b}' },
    ...expenseLines,
    { id: 'profit', label: 'NET PROFIT / (LOSS)', values: profit, level: 'grand', f: '{net}-{opex}', tone: true },
    { label: 'Net margin (of total income)', values: marginOf(income, profit), kind: 'pct', f: 'IF({inc}=0,0,{profit}/{inc})' },
  ])
  sh.fitPage = true
}

function cashFlow(ctx: Ctx) {
  const { m } = ctx
  const stay = m.basis === 'stay'
  // stay basis: each payment under the check-in month of its booking; cash basis: under the month it was paid
  const monthOf = (l: PayLine) => monthKey(stay ? l.b.checkIn : l.p.date)
  const byMonth = (f: (l: PayLine) => boolean) => m.months.map((mk) => sum(m.payments.filter((l) => monthOf(l) === mk && f(l)), (l) => l.p.amount))
  const methods = [...PAYMENT_METHODS, ...[...new Set(m.payments.map((l) => l.p.method).filter((x): x is string => !!x && !PAYMENT_METHODS.includes(x)))].sort()]
  const receiptLines: StatementLine[] = methods.map((meth, i) => ({
    id: i === 0 ? 'r0' : i === methods.length - 1 ? 'rN' : undefined,
    label: meth === 'Cash' ? 'Cash (incl. payments with no method)' : meth,
    values: byMonth((l) => l.type !== 'Refund' && (meth === 'Cash' ? isCash(l.p) : l.p.method === meth)),
  }))
  const expBy = (f: (e: Expense) => boolean) => m.months.map((mk) => sum(m.expenses.filter((e) => monthKey(e.date) === mk && f(e)), (e) => e.amount))
  const add = (...a: number[][]) => m.months.map((_, i) => a.reduce((s, x) => s + x[i], 0))
  const less = (a: number[], b: number[]) => a.map((x, i) => x - b[i])
  const receipts = add(...receiptLines.map((l) => l.values as number[]))
  const cashRef = byMonth((l) => l.type === 'Refund' && l.via === 'Cash')
  const bankRef = byMonth((l) => l.type === 'Refund' && l.via !== 'Cash')
  const refunds = add(cashRef, bankRef)
  const netReceipts = less(receipts, refunds)
  const opex = expBy((e) => e.category !== B2B_CATEGORY)
  const b2bOut = expBy((e) => e.category === B2B_CATEGORY && !e.external)
  const out = add(opex, b2bOut)
  const net = less(netReceipts, out)
  const bankNet = less(byMonth((l) => l.via !== 'Cash' && l.type !== 'Refund'), bankRef)
  const b2bExt = expBy((e) => e.category === B2B_CATEGORY && !!e.external)
  // stay basis: what was paid before the check-in month (advances); cash basis: advances paid for later months' stays
  const timing = stay
    ? byMonth((l) => l.type !== 'Refund' && monthKey(l.p.date) < monthKey(l.b.checkIn))
    : m.months.map((mk) => sum(m.payments.filter((l) => monthKey(l.p.date) === mk && l.type === 'Advance' && monthKey(l.b.checkIn) > mk), (l) => l.p.amount))

  const sh = statement(ctx, 'Cash Flow', `Cash Flow · ${m.periodLabel}`, stay
    ? 'Stay month: money in for the stays checking in each month (any payment date), money out by expense date.'
    : 'Cash date: money in and out by the date it was paid; expenses by their date.', [
    { label: stay ? 'RECEIPTS (FOR EACH MONTH’S STAYS)' : 'RECEIPTS', level: 'section' },
    ...receiptLines,
    { id: 'rec', label: 'Total receipts', values: receipts, level: 'sub', f: methods.length > 1 ? 'SUM({r0}:{rN})' : undefined },
    { label: 'LESS: REFUNDS PAID', level: 'section' },
    { id: 'cr', label: 'Cash refunds', values: cashRef },
    { id: 'br', label: 'Bank & digital refunds', values: bankRef },
    { id: 'ref', label: 'Total refunds', values: refunds, level: 'sub', f: 'SUM({cr}:{br})' },
    { id: 'netrec', label: 'NET RECEIPTS', values: netReceipts, level: 'grand', f: '{rec}-{ref}' },
    { label: 'LESS: PAID OUT', level: 'section' },
    { id: 'op', label: 'Operating expenses', values: opex },
    { id: 'bo', label: 'B2B commission paid out', values: b2bOut },
    { id: 'out', label: 'Total paid out', values: out, level: 'sub', f: 'SUM({op}:{bo})' },
    { id: 'net', label: 'NET CASH FLOW', values: net, level: 'grand', f: '{netrec}-{out}', tone: true },
    { label: 'Cumulative net cash flow', values: net, cumulative: true },
    { label: 'MEMO', level: 'section' },
    { id: 'bnet', label: 'Net bank & digital credits (match to the bank)', values: bankNet, memo: true },
    { label: 'B2B kept by partners (not in the resort’s accounts)', values: b2bExt, memo: true },
    { label: stay ? 'Paid before the check-in month (advances)' : 'Advances received for stays in later months', values: timing, memo: true },
  ])
  sh.fitPage = true
}

function monthly(ctx: Ctx) {
  const { wb, m } = ctx
  const sh = wb.sheet('Monthly')
  sh.tabColor = C.maroon
  sh.fitPage = true
  const cols: Col[] = [
    { title: 'Month', width: 15, kind: 'month' },
    { title: 'Bookings', width: 10, kind: 'int' },
    { title: 'Cancelled', width: 10, kind: 'int' },
    { title: 'Room-nights', width: 11, kind: 'int' },
    { title: 'Guests', width: 9, kind: 'int' },
    { title: 'Billed', width: 15, kind: 'money' },
    { title: 'Retained on Cancellations', width: 14, kind: 'money' },
    { title: 'B2B Commission', width: 14, kind: 'money' },
    { title: 'Net Revenue', width: 15, kind: 'money' },
    { title: 'Received', width: 15, kind: 'money' },
    { title: 'Outstanding', width: 14, kind: 'money' },
    { title: 'Avg Booking Value', width: 14, kind: 'money', total: 'none' },
  ]
  widths(sh, cols)
  frame(sh, ctx, cols.length, `Monthly Report · ${m.periodLabel}`, 'By check-in month. Net revenue = billed + retained − B2B commission. Received and outstanding are as of today.')
  const rows = m.months.map((mk) => {
    const st = m.stays.filter((f) => monthKey(f.b.checkIn) === mk)
    const act = st.filter((f) => !f.cancelled)
    const billed = sum(act, (f) => f.billed)
    const retained = sum(st, (f) => f.retained)
    const b2b = sum(m.b2bStay.filter((l) => monthKey(l.date) === mk), (l) => l.e.amount)
    return [`${mk}-01`, act.length, st.length - act.length, sum(act, (f) => f.roomNights), sum(act, (f) => f.b.guests), billed, retained, b2b, billed + retained - b2b, sum(st, (f) => f.received), sum(act, (f) => Math.max(0, f.balance)), act.length ? Math.round(billed / act.length) : 0]
  })
  const totals = (i: number) => rows.reduce((s, r) => s + (r[i] as number), 0)
  const tb = table(sh, ctx, 7, cols, rows, {
    filter: false,
    marks: { 1: 'monthly.bookings', 3: 'monthly.roomNights', 5: 'monthly.billed', 7: 'monthly.b2b', 8: 'monthly.net', 10: 'monthly.outstanding' },
    customTotal: {
      11: {
        f: `IF(${ref(2, 7 + rows.length + 1)}=0,0,${ref(6, 7 + rows.length + 1)}/${ref(2, 7 + rows.length + 1)})`,
        v: totals(1) ? totals(5) / totals(1) : 0,
      },
    },
  })
  sh.freeze = { rows: 7, cols: 2 }
  void tb
}

function roomSummary(ctx: Ctx) {
  const { wb, t, m } = ctx
  const sh = wb.sheet('Room Summary')
  sh.tabColor = C.maroon
  sh.fitPage = true
  const cols: Col[] = [
    { title: 'Room', width: 16, kind: 'text' },
    { title: 'Bookings', width: 10, kind: 'int' },
    { title: 'Room-nights', width: 11, kind: 'int' },
    { title: 'Guests', width: 9, kind: 'int' },
    { title: 'Billed', width: 15, kind: 'money' },
    { title: 'Retained on Cancellations', width: 14, kind: 'money' },
    { title: 'B2B Commission', width: 14, kind: 'money' },
    { title: 'Net Revenue', width: 15, kind: 'money' },
    { title: 'Received', width: 15, kind: 'money' },
    { title: 'Outstanding', width: 14, kind: 'money' },
    { title: 'Share of Net Revenue', width: 12, kind: 'pct', total: 'none' },
  ]
  widths(sh, cols)
  frame(sh, ctx, cols.length, `Room Summary · ${m.periodLabel}`, 'Bookings checking in during the period, by room. A booking of several rooms counts under its first room and a whole-property booking under Full Property, as on the Accounting page.')
  const standard = [...ROOM_NAMES, FULL_PROPERTY]
  const seen = [...m.stays.map((f) => primaryRoom(f.b.villa)), ...m.b2bStay.map((l) => primaryRoom(l.booking?.villa ?? l.e.villa))]
  const names = [...standard, ...[...new Set(seen)].filter((n) => !standard.includes(n)).sort()]
  const data = names.map((name) => {
    const st = m.stays.filter((f) => primaryRoom(f.b.villa) === name)
    const act = st.filter((f) => !f.cancelled)
    const billed = sum(act, (f) => f.billed)
    const retained = sum(st, (f) => f.retained)
    const b2b = sum(m.b2bStay.filter((l) => primaryRoom(l.booking?.villa ?? l.e.villa) === name), (l) => l.e.amount)
    return { name, row: [name, act.length, sum(act, (f) => f.roomNights), sum(act, (f) => f.b.guests), billed, retained, b2b, billed + retained - b2b, sum(st, (f) => f.received), sum(act, (f) => Math.max(0, f.balance))] as (string | number)[] }
  }).filter((d) => d.row.slice(1).some((v) => v !== 0) || (m.villa === ALL_ROOMS && d.name !== FULL_PROPERTY))
  const netTotal = sum(data, (d) => d.row[7] as number)
  const first = 8
  const totalRow = first + data.length
  const rows: RowValue[][] = data.map((d) => [...d.row, netTotal ? (d.row[7] as number) / netTotal : 0])
  const tb = table(sh, ctx, 7, cols, rows, {
    filter: false,
    marks: { 1: 'rooms.bookings', 4: 'rooms.billed', 7: 'rooms.net', 9: 'rooms.outstanding' },
    customTotal: { 10: { f: `IF(${ref(8, totalRow)}=0,0,1)`, v: netTotal ? 1 : 0 } },
  })
  // share column as live formulas against the Total row
  rows.forEach((r, i) => {
    const row = first + i
    sh.set(row, 11, r[10] as number, t.td('pct', i % 2 === 1), `IF($${colName(8)}$${totalRow}=0,0,${ref(8, row)}/$${colName(8)}$${totalRow})`)
  })

  // nights each unit is booked in the period
  const top = tb.totalRow + 3
  sh.set(top - 1, 1, 'Nights booked by unit', wb.style({ bold: true, size: 12, color: C.maroon, h: 'left' }))
  sh.height(top - 1, 22)
  const unitCols: Col[] = [
    { title: 'Unit', width: 16, kind: 'text' },
    { title: 'Capacity', width: 10, kind: 'center' },
    { title: 'Base Rate / Night', width: 11, kind: 'money', total: 'none' },
    { title: 'Bookings', width: 9, kind: 'int', total: 'none' },
    { title: 'Nights Booked', width: 15, kind: 'int' },
  ]
  const unitRows: RowValue[][] = m.unitNights.map((u) => [u.unit, ctx.capacity[u.unit] ?? '—', ctx.rates[u.unit] ?? 0, u.bookings, u.nights])
  table(sh, ctx, top, unitCols, unitRows, { filter: false, totalLabel: 'All units' })
  sh.freeze = { rows: 7, cols: 0 }
}

function receivables(ctx: Ctx) {
  const { wb, m } = ctx
  const sh = wb.sheet('Receivables')
  sh.tabColor = C.goldDeep
  sh.paper = 'A3'
  const cols: Col[] = [
    { title: 'Booking ID', width: 12, kind: 'text' },
    { title: 'Guest', width: 24, kind: 'text' },
    { title: 'Phone', width: 14, kind: 'text' },
    { title: 'Room(s)', width: 16, kind: 'text' },
    { title: 'Source', width: 10, kind: 'text' },
    { title: 'Check-in', width: 13, kind: 'date' },
    { title: 'Check-out', width: 13, kind: 'date' },
    { title: 'Total', width: 13, kind: 'money' },
    { title: 'Received', width: 13, kind: 'money' },
    { title: 'Kept by Partner', width: 12, kind: 'money' },
    { title: 'Balance Due', width: 13, kind: 'money' },
    { title: 'Days Past Check-out', width: 11, kind: 'int', total: 'none' },
    { title: 'Not Yet Due', width: 13, kind: 'money' },
    { title: '1–30 Days', width: 12, kind: 'money' },
    { title: '31–60 Days', width: 12, kind: 'money' },
    { title: '61–90 Days', width: 12, kind: 'money' },
    { title: '90+ Days', width: 12, kind: 'money' },
  ]
  widths(sh, cols)
  frame(sh, ctx, cols.length, `Receivables Aging · as of ${fmtDate(m.today)}`, 'Bookings checking in during the period with a balance still due, aged by days past check-out. Guests still in house or arriving later are “not yet due”.')
  const owing = m.active.filter((f) => f.balance > 0).sort((a, b) => b.overdue - a.overdue || (a.b.checkOut < b.b.checkOut ? -1 : 1))
  const rows = owing.map((f) => {
    const d = f.overdue
    const bucket = (lo: number, hi: number) => (d >= lo && d <= hi ? f.balance : 0)
    return [f.b.ref, f.b.guest, f.b.phone, f.b.villa, f.b.source, f.b.checkIn, f.b.checkOut, f.b.total, f.received, f.b2bExt, f.balance, d, d === 0 ? f.balance : 0, bucket(1, 30), bucket(31, 60), bucket(61, 90), d > 90 ? f.balance : 0]
  })
  table(sh, ctx, 7, cols, rows, { emptyText: 'No balances due for this period’s stays.', marks: { 10: 'recv.balance' } })
  sh.freeze = { rows: 7, cols: 3 }
  sh.printTitles = [7, 7]
}

function b2bSheet(ctx: Ctx) {
  const { wb, m } = ctx
  const sh = wb.sheet('B2B Commission')
  sh.tabColor = C.goldDeep
  const cols: Col[] = [
    { title: 'Booking ID', width: 12, kind: 'text' },
    { title: 'Guest', width: 24, kind: 'text' },
    { title: 'Check-in', width: 13, kind: 'date' },
    { title: 'Source', width: 10, kind: 'text' },
    { title: 'Partner / Notes', width: 28, kind: 'text' },
    { title: 'Booking Total', width: 14, kind: 'money' },
    { title: 'Commission', width: 13, kind: 'money' },
    { title: 'Commission %', width: 12, kind: 'pct', total: 'none' },
    { title: 'Paid Out by Resort', width: 13, kind: 'money' },
    { title: 'Kept by Partner', width: 13, kind: 'money' },
    { title: 'Net to Resort', width: 14, kind: 'money' },
    { title: 'Entry Dates', width: 22, kind: 'text' },
  ]
  widths(sh, cols)
  frame(sh, ctx, cols.length, `B2B Commission · ${m.periodLabel}`, `${m.basis === 'stay' ? 'Stay month: commission on the stays checking in during the period.' : 'Cash date: commission entries dated in the period.'} “Paid out” = the resort pays the partner. “Kept by partner” = collected externally from the guest’s payment.`)
  const linked = new Map<Booking, Expense[]>()
  const loose: B2bLine[] = []
  for (const l of m.b2b) {
    if (l.booking) linked.set(l.booking, [...(linked.get(l.booking) ?? []), l.e])
    else loose.push(l)
  }
  // B2B bookings with no commission entered are listed too, so a missing entry stands out
  if (m.basis === 'stay') for (const f of m.active) if (f.b.source === 'B2B' && !linked.has(f.b)) linked.set(f.b, [])
  const rows: RowValue[][] = [...linked.entries()]
    .sort((a, b) => (a[0].checkIn < b[0].checkIn ? -1 : 1))
    .map(([b, es]) => {
      const out = sum(es.filter((e) => !e.external), (e) => e.amount)
      const ext = sum(es.filter((e) => e.external), (e) => e.amount)
      const total = b.status === 'cancelled' ? 0 : b.total
      return [b.ref, b.guest, b.checkIn, b.source, b.notes || es.map((e) => e.description).filter(Boolean).join('; ') || '', total, out + ext, total ? (out + ext) / total : 0, out, ext, total - out - ext, [...new Set(es.map((e) => fmtDate(e.date)))].join(', ') || 'No commission entered']
    })
  for (const l of loose) rows.push([l.e.bookingRef || '—', '—', null, '—', l.e.description || '', 0, l.e.amount, 0, l.e.external ? 0 : l.e.amount, l.e.external ? l.e.amount : 0, -l.e.amount, fmtDate(l.e.date)])
  const totalRow = 8 + rows.length
  const totalBooking = sum(rows, (r) => r[5] as number)
  const totalComm = sum(rows, (r) => r[6] as number)
  table(sh, ctx, 7, cols, rows, {
    emptyText: 'No B2B commission for this period’s stays.',
    marks: { 6: 'b2b.total', 8: 'b2b.out' },
    customTotal: { 7: { f: `IF(${ref(6, totalRow)}=0,0,${ref(7, totalRow)}/${ref(6, totalRow)})`, v: totalBooking ? totalComm / totalBooking : 0 } },
  })
  sh.freeze = { rows: 7, cols: 3 }
  sh.printTitles = [7, 7]
}

function bookingsSheet(ctx: Ctx) {
  const { wb, m } = ctx
  const sh = wb.sheet('Bookings')
  sh.tabColor = C.goldDeep
  sh.paper = 'A3'
  const cols: Col[] = [
    { title: 'Booking ID', width: 12, kind: 'text' },
    { title: 'Booked On', width: 13, kind: 'date' },
    { title: 'Guest', width: 24, kind: 'text' },
    { title: 'Phone', width: 14, kind: 'text' },
    { title: 'Room(s)', width: 16, kind: 'text' },
    { title: 'Source', width: 10, kind: 'text' },
    { title: 'Check-in', width: 13, kind: 'date' },
    { title: 'Check-out', width: 13, kind: 'date' },
    { title: 'Nights', width: 8, kind: 'int' },
    { title: 'Room-nights', width: 9, kind: 'int' },
    { title: 'Guests', width: 8, kind: 'int' },
    { title: 'Status', width: 12, kind: 'text' },
    { title: 'Total Billed', width: 14, kind: 'money' },
    { title: 'Bank & Digital', width: 13, kind: 'money' },
    { title: 'Cash', width: 13, kind: 'money' },
    { title: 'Refunds', width: 12, kind: 'money' },
    { title: 'Net Received', width: 14, kind: 'money' },
    { title: 'B2B Paid Out', width: 12, kind: 'money' },
    { title: 'B2B Kept by Partner', width: 12, kind: 'money' },
    { title: 'Balance Due', width: 13, kind: 'money' },
    { title: 'Payment Status', width: 12, kind: 'text' },
    { title: 'Net Revenue', width: 14, kind: 'money' },
    { title: 'Days Overdue', width: 9, kind: 'int', total: 'none' },
    { title: 'Stay Month', width: 12, kind: 'month' },
  ]
  widths(sh, cols)
  frame(sh, ctx, cols.length, `Booking Ledger · ${m.periodLabel}`, 'Every booking checking in during the period, with all its payments to date. Net received = bank & digital + cash − refunds. Cancelled bookings are greyed; the billed total leaves them out.')
  const rows = m.stays.map((f) => [
    f.b.ref, f.b.createdAt ? f.b.createdAt.slice(0, 10) : null, f.b.guest, f.b.phone, f.b.villa, f.b.source, f.b.checkIn, f.b.checkOut,
    f.nights, f.roomNights, f.b.guests, cap(f.b.status), f.b.total, f.bank, f.cash, f.refunds, f.received, f.b2bOut, f.b2bExt,
    f.balance, f.payStatus, f.netRevenue, f.overdue || null, `${monthKey(f.b.checkIn)}-01`,
  ])
  const first = 8
  const last = first + rows.length - 1
  const billedCol = 13 // column of "Total Billed" (B = 1)
  const statusCol = 12
  // stay counts and the billed total leave cancelled bookings out (as on the Dashboard and Monthly sheets);
  // the money columns count every payment and refund
  const notCancelled = (col: number, v: number) => ({ f: `SUMIFS(${rng(col, first, last)},${rng(statusCol, first, last)},"<>Cancelled")`, v })
  table(sh, ctx, 7, cols, rows, {
    totalLabel: 'Total (stays exclude cancelled)',
    muted: (i) => m.stays[i].cancelled,
    marks: { 9: 'bk.roomNights', 12: 'bk.billed', 16: 'bk.received' },
    customTotal: rows.length ? {
      8: notCancelled(9, sum(m.active, (f) => f.nights)),
      9: notCancelled(10, m.k.roomNights),
      10: notCancelled(11, m.k.guests),
      12: notCancelled(billedCol, m.k.billed),
    } : undefined,
  })
  sh.freeze = { rows: 7, cols: 4 }
  sh.printTitles = [7, 7]
  // the Reports → Bookings total counts every row, cancelled ones too
  ctx.marks['bk.totalAll'] = rows.length
    ? { ref: `SUM('${sh.name}'!$${colName(billedCol)}$${first}:$${colName(billedCol)}$${last})`, v: sum(m.stays, (f) => f.b.total) }
    : { ref: '0', v: 0 }
}

function paymentsSheet(ctx: Ctx) {
  const { wb, m } = ctx
  const sh = wb.sheet('Payments')
  sh.tabColor = C.goldDeep
  const cols: Col[] = [
    { title: 'Date', width: 13, kind: 'date' },
    { title: 'Booking ID', width: 12, kind: 'text' },
    { title: 'Guest', width: 24, kind: 'text' },
    { title: 'Room(s)', width: 16, kind: 'text' },
    { title: 'Check-in', width: 13, kind: 'date' },
    { title: 'Type', width: 15, kind: 'text' },
    { title: 'Method', width: 13, kind: 'text' },
    { title: 'Received Via', width: 15, kind: 'text' },
    { title: 'Reference', width: 18, kind: 'text' },
    { title: 'Amount', width: 14, kind: 'money' },
    { title: 'Payment Month', width: 12, kind: 'month' },
    { title: 'Stay Month', width: 12, kind: 'month' },
  ]
  widths(sh, cols)
  frame(sh, ctx, cols.length, `Payments Ledger · ${m.periodLabel}`, `${m.basis === 'stay' ? 'Stay month: every payment and refund of the bookings checking in during the period, whatever its date.' : 'Cash date: every payment and refund dated in the period.'} Refunds are negative. Bank & digital = UPI, card and bank transfer.`)
  const rows = m.payments.map((l) => [l.p.date, l.b.ref, l.b.guest, l.b.villa, l.b.checkIn, l.type, l.p.method || '—', l.via, l.p.reference || '', l.signed, `${monthKey(l.p.date)}-01`, `${monthKey(l.b.checkIn)}-01`])
  const tb = table(sh, ctx, 7, cols, rows, { totalLabel: 'Total (payments less refunds)' })
  sh.freeze = { rows: 7, cols: 0 }
  sh.printTitles = [7, 7]
  if (!rows.length) return

  // summary under the table, as live SUMIFS formulas
  const amt = rng(10, tb.first, tb.last)
  const via = rng(8, tb.first, tb.last)
  const meth = rng(7, tb.first, tb.last)
  const type = rng(6, tb.first, tb.last)
  const received = (method: string) => sum(m.payments.filter((l) => l.type !== 'Refund' && (method === 'Cash' ? isCash(l.p) : l.p.method === method)), (l) => l.p.amount)
  summaryBlock(sh, ctx, tb.totalRow + 2, 5, [
    { key: 'pay.credited', label: 'Total credited (before refunds)', value: m.k.credited, f: `SUMIFS(${amt},${type},"<>Refund")` },
    { key: 'pay.cash', label: 'Collected in cash', value: m.k.cashIn, f: `SUMIFS(${amt},${via},"Cash",${type},"<>Refund")` },
    { key: 'pay.bank', label: 'Collected by bank & digital', value: m.k.bankIn, f: `SUMIFS(${amt},${via},"Bank & digital",${type},"<>Refund")` },
    { key: 'pay.refunds', label: 'Less: refunds paid', value: m.k.refunds, f: `-SUMIFS(${amt},${type},"Refund")` },
    { key: 'pay.net', label: 'Net collected after refunds', value: m.k.collected, f: '{L0}-{L3}', level: 'sub' },
    { key: 'pay.bankNet', label: 'Net bank & digital (match to the bank)', value: m.k.bankNet, f: `SUMIFS(${amt},${via},"Bank & digital")`, memo: true },
    ...PAYMENT_METHODS.filter((x) => x !== 'Cash').map((method) => ({
      label: `Received by ${method}`, value: received(method), f: `SUMIFS(${amt},${meth},"${method}",${type},"<>Refund")`, memo: true,
    })),
  ])
}

function expensesSheet(ctx: Ctx) {
  const { wb, m } = ctx
  const sh = wb.sheet('Expenses')
  sh.tabColor = C.goldDeep
  const cols: Col[] = [
    { title: 'Date', width: 13, kind: 'date' },
    { title: 'Category', width: 16, kind: 'text' },
    { title: 'Room', width: 14, kind: 'text' },
    { title: 'Booking ID', width: 12, kind: 'text' },
    { title: 'Guest', width: 22, kind: 'text' },
    { title: 'Description', width: 34, kind: 'text' },
    { title: 'Amount', width: 14, kind: 'money' },
    { title: 'Paid By', width: 28, kind: 'text' },
    { title: 'Month', width: 12, kind: 'month' },
  ]
  widths(sh, cols)
  frame(sh, ctx, cols.length, `Expense Ledger · ${m.periodLabel}`, 'Every expense dated in the period, including B2B commission. Commission kept by a partner was not paid by the resort and is marked so.')
  const byRef = new Map(m.scope.map((b) => [refKey(b.ref), b]))
  const PARTNER = 'Partner (collected externally)'
  const rows = m.expenses.map((e) => [e.date, e.category, e.villa, e.bookingRef || '—', byRef.get(refKey(e.bookingRef))?.guest ?? '', e.description, e.amount, e.category === B2B_CATEGORY && e.external ? PARTNER : 'Resort', `${monthKey(e.date)}-01`])
  const tb = table(sh, ctx, 7, cols, rows, { totalLabel: 'Total (all entries)', muted: (i) => !!(m.expenses[i].category === B2B_CATEGORY && m.expenses[i].external) })
  sh.freeze = { rows: 7, cols: 0 }
  sh.printTitles = [7, 7]
  if (!rows.length) return

  const amt = rng(7, tb.first, tb.last)
  const cat = rng(2, tb.first, tb.last)
  const by = rng(8, tb.first, tb.last)
  summaryBlock(sh, ctx, tb.totalRow + 2, 5, [
    { key: 'exp.opex', label: 'Operating expenses (excl. B2B commission)', value: m.k.opex, f: `SUMIFS(${amt},${cat},"<>${B2B_CATEGORY}")` },
    { key: 'exp.b2bPaid', label: 'B2B commission paid out by the resort', value: m.k.b2bPaidByDate, f: `SUMIFS(${amt},${cat},"${B2B_CATEGORY}",${by},"Resort")` },
    { key: 'exp.paid', label: 'Total paid by the resort (as on Reports → Expenses)', value: m.k.opex + m.k.b2bPaidByDate, f: 'SUM({L0}:{L1})', level: 'sub' },
    { key: 'exp.b2bExt', label: 'B2B commission kept by partners (not paid by the resort)', value: m.k.b2bExtByDate, f: `SUMIFS(${amt},${by},"Partner*")`, memo: true },
  ])
}

/**
 * What Weland's own screens show for the same dates and room, worked out with their rules
 * (Reports → Payments & Refunds on Cash date, Bookings and Expenses; the Accounting page on Stay month),
 * so the Balance Check can tie the workbook to the app.
 */
function appFigures(data: AppData, m: ManagementModel) {
  const inRange = (d: string) => d >= m.from && d <= m.to
  const villaOk = (v: string) => m.villa === ALL_ROOMS || bookingHasRoom(v, m.villa)
  const stay = m.basis === 'stay'
  // Reports → Payments & Refunds: Stay month = payments of the bookings checking in; Cash date = payments dated in the period
  const payOk = (b: Booking, p: Payment) => (stay ? inRange(b.checkIn) : inRange(p.date))
  let credited = 0
  let cash = 0
  let refunded = 0
  for (const b of data.bookings) {
    if (!villaOk(b.villa)) continue
    for (const p of b.payments) {
      if (!payOk(b, p)) continue
      if (p.kind === 'refund') refunded += p.amount
      else {
        credited += p.amount
        if (isCash(p)) cash += p.amount
      }
    }
  }
  const stays = data.bookings.filter((b) => villaOk(b.villa) && inRange(b.checkIn))
  const expensesTotal = sum(data.expenses.filter((e) => villaOk(e.villa) && !(e.category === B2B_CATEGORY && e.external) && inRange(e.date)), (e) => e.amount)

  // Accounting page on the same basis (Accounting.tsx): each booking and expense counts under its first room
  const stayRefs = new Set(data.bookings.filter((b) => inRange(b.checkIn)).map((b) => b.ref.toLowerCase()))
  const knownRefs = new Set(data.bookings.map((b) => b.ref.toLowerCase()))
  const b2bOk = (e: Expense) => {
    const r = e.bookingRef?.trim().toLowerCase()
    return stay && r && knownRefs.has(r) ? stayRefs.has(r) : inRange(e.date)
  }
  const hasFull = data.bookings.some((b) => isFullProperty(b.villa)) || data.expenses.some((e) => isFullProperty(e.villa))
  const list = new Set(m.villa === ALL_ROOMS ? (hasFull ? [...ROOM_NAMES, FULL_PROPERTY] : ROOM_NAMES) : [m.villa])
  let collected = 0
  let refundedStay = 0
  let b2b = 0
  let b2bExt = 0
  let operating = 0
  for (const b of data.bookings) {
    if (!list.has(primaryRoom(b.villa))) continue
    for (const p of b.payments) {
      if (!payOk(b, p)) continue
      if (p.kind === 'payment') collected += p.amount
      else refundedStay += p.amount
    }
  }
  for (const e of data.expenses) {
    if (!list.has(primaryRoom(e.villa))) continue
    if (e.category === B2B_CATEGORY) {
      if (!b2bOk(e)) continue
      if (e.external) b2bExt += e.amount
      else b2b += e.amount
    } else if (inRange(e.date)) operating += e.amount
  }
  const contracted = sum(data.bookings.filter((b) => (m.villa === ALL_ROOMS || primaryRoom(b.villa) === m.villa) && b.status !== 'cancelled' && inRange(b.checkIn)), (b) => b.total)
  const unlisted = sum(data.expenses.filter((e) => e.category !== B2B_CATEGORY && inRange(e.date) && villaOk(e.villa) && !list.has(primaryRoom(e.villa))), (e) => e.amount)
  return {
    credited, cash, bank: credited - cash, refunded,
    bookingsTotal: sum(stays, (b) => b.total), bookingsPaid: sum(stays, (b) => paidOf(b)), expensesTotal,
    accNetRevenue: collected - refundedStay - b2b, accProfit: collected - refundedStay - b2b - operating,
    accOutstanding: contracted - (collected - refundedStay) - b2bExt, accOperating: operating, unlisted,
  }
}

interface Check { label: string; a: Mark; b: Mark; kind?: 'money' | 'int'; expected?: number; where: string }

/** Every key figure worked out two ways, with live formulas: within the workbook, and against Weland's screens. */
function balanceCheck(ctx: Ctx, data: AppData) {
  const { wb, t, m } = ctx
  const sh = wb.sheet('Balance Check')
  sh.tabColor = C.green
  sh.fitPage = true
  sh.widths = [10, 52, 16, 16, 14, 15, 70]
  frame(sh, ctx, 6, `Balance Check · ${m.periodLabel}`, 'Each figure worked out two ways. A difference of ₹0, or exactly the amount explained, means the data balances. The formulas re-check whenever the workbook changes.')
  const get = (key: string): Mark => ctx.marks[key] ?? { ref: '0', v: 0 }
  const fixed = (v: number): Mark => ({ ref: String(v), v })
  const app = appFigures(data, m)
  const k = m.k
  const cancelled = m.stays.filter((f) => f.cancelled)
  const unlinkedExt = sum(m.b2bStay.filter((l) => !l.booking && l.e.external), (l) => l.e.amount)
  const owedNet = k.receivable - k.credit // what guests still owe, less overpayments

  const stay = m.basis === 'stay'
  const basisName = stay ? 'Stay month' : 'Cash date'
  const workbook: Check[] = [
    { label: 'Total credited (payments before refunds)', a: get('pay.credited'), b: get('Cash Flow.rec'), where: 'Payments summary · Cash Flow, Total receipts' },
    { label: 'Total credited: Dashboard tile', a: get('dash.tileCredited'), b: get('pay.credited'), where: 'Dashboard · Payments summary' },
    { label: 'Collected in cash', a: get('pay.cash'), b: get('Cash Flow.r0'), where: 'Payments summary · Cash Flow, Cash' },
    { label: 'Collected by bank & digital', a: get('pay.bank'), b: get('dash.bIn'), where: 'Payments summary · Dashboard section 1' },
    { label: 'Refunds paid', a: get('pay.refunds'), b: get('Cash Flow.ref'), where: 'Payments summary · Cash Flow, Total refunds' },
    { label: 'Net collected after refunds', a: get('pay.net'), b: get('Cash Flow.netrec'), where: 'Payments summary · Cash Flow, Net receipts' },
    { label: 'Net bank & digital (to match the bank statement)', a: get('pay.bankNet'), b: get('Cash Flow.bnet'), where: 'Payments summary · Cash Flow memo' },
    { label: 'Paid out by the resort (expenses + B2B paid out)', a: get('exp.paid'), b: get('Cash Flow.out'), where: 'Expenses summary · Cash Flow, Total paid out' },
    ...(stay
      ? [
        { label: 'Room revenue billed: Bookings ledger', a: get('bk.billed'), b: get('P&L.billed'), where: 'Bookings total · P&L' },
        { label: 'Room revenue billed: Monthly', a: get('monthly.billed'), b: get('P&L.billed'), where: 'Monthly total · P&L' },
        { label: 'Room revenue billed: Room Summary', a: get('rooms.billed'), b: get('P&L.billed'), where: 'Room Summary total · P&L' },
        { label: 'Room revenue billed: Dashboard', a: get('dash.tileBilled'), b: get('P&L.billed'), where: 'Dashboard tile · P&L' },
        { label: 'B2B commission', a: get('b2b.total'), b: get('P&L.b2b'), where: 'B2B Commission total · P&L' },
        { label: 'Net revenue: Monthly', a: get('monthly.net'), b: get('P&L.net'), where: 'Monthly total · P&L' },
      ]
      : [
        { label: 'Money received after refunds', a: get('P&L.inc'), b: get('Cash Flow.netrec'), where: 'P&L income · Cash Flow, Net receipts' },
        { label: 'B2B commission paid out', a: get('P&L.out'), b: get('Cash Flow.bo'), where: 'P&L · Cash Flow, B2B commission paid out' },
        { label: 'B2B commission paid out: B2B sheet', a: get('b2b.out'), b: get('P&L.out'), where: 'B2B Commission total · P&L' },
        { label: 'Room revenue billed: Bookings ledger', a: get('bk.billed'), b: get('monthly.billed'), where: 'Bookings total · Monthly total (stays checking in)' },
        { label: 'Room revenue billed: Room Summary', a: get('rooms.billed'), b: get('monthly.billed'), where: 'Room Summary total · Monthly total' },
        { label: 'Room revenue billed: Dashboard', a: get('dash.tileBilled'), b: get('monthly.billed'), where: 'Dashboard tile · Monthly total' },
      ]),
    { label: 'Net revenue: Room Summary', a: get('rooms.net'), b: get('monthly.net'), where: 'Room Summary total · Monthly total' },
    { label: 'Net revenue: Dashboard', a: get('dash.net'), b: get('P&L.net'), where: 'Dashboard section 4 · P&L' },
    { label: 'Operating expenses', a: get('exp.opex'), b: get('P&L.opex'), where: 'Expenses summary · P&L' },
    { label: 'Net profit / (loss)', a: get('dash.profit'), b: get('P&L.profit'), where: 'Dashboard section 4 · P&L' },
    { label: 'Bookings (not cancelled)', a: get('monthly.bookings'), b: get('rooms.bookings'), kind: 'int', where: 'Monthly total · Room Summary total' },
    { label: 'Room-nights', a: get('bk.roomNights'), b: get('monthly.roomNights'), kind: 'int', where: 'Bookings total · Monthly total' },
    { label: 'Outstanding from guests: Receivables', a: get('recv.balance'), b: get('monthly.outstanding'), where: 'Receivables total · Monthly total' },
    { label: 'Outstanding from guests: Room Summary', a: get('rooms.outstanding'), b: get('recv.balance'), where: 'Room Summary total · Receivables total' },
  ]
  const toApp: Check[] = [
    { label: 'Payments & Refunds: Total Credited', a: get('pay.credited'), b: fixed(app.credited), where: `Reports → Payments & Refunds, ${basisName}, same dates and room` },
    { label: 'Payments & Refunds: Collected in Cash', a: get('pay.cash'), b: fixed(app.cash), where: `Reports → Payments & Refunds, ${basisName}` },
    { label: 'Payments & Refunds: Collected by Bank & Digital', a: get('pay.bank'), b: fixed(app.bank), where: `Reports → Payments & Refunds, ${basisName}` },
    { label: 'Payments & Refunds: Refunded', a: get('pay.refunds'), b: fixed(app.refunded), where: `Reports → Payments & Refunds, ${basisName}` },
    { label: 'Bookings report: Total column', a: get('bk.totalAll'), b: fixed(app.bookingsTotal), where: 'Reports → Bookings (check-in in the period, cancelled included)' },
    { label: 'Bookings report: Paid column', a: get('bk.received'), b: fixed(app.bookingsPaid), where: 'Reports → Bookings · Bookings sheet, Net Received' },
    { label: 'Expenses report: Total', a: get('exp.paid'), b: fixed(app.expensesTotal), where: 'Reports → Expenses (commission kept by partners left out)' },
  ]
  if (m.villa === ALL_ROOMS) {
    const noRoom = app.unlisted ? ` · expenses with no room (${formatINR(app.unlisted)}) are left out there` : ''
    toApp.push({ label: 'Accounting: Operating expenses', a: get('exp.opex'), b: fixed(app.accOperating), expected: app.unlisted, where: `Accounting, ${basisName}${noRoom}` })
    if (stay) {
      // the Accounting page counts money received; on Stay month this workbook counts what was billed
      const extCancelled = sum(cancelled, (f) => f.b2bExt)
      const negCancelled = sum(cancelled, (f) => Math.max(0, -f.received))
      const netGap = owedNet - extCancelled - unlinkedExt + negCancelled
      toApp.push(
        { label: 'Accounting: Net Revenue', a: get('P&L.net'), b: fixed(app.accNetRevenue), expected: netGap, where: netGap ? `Accounting counts money received · gap = still owed by guests, ${formatINR(netGap)}` : 'Accounting, Stay month (every stay is fully paid, so they agree)' },
        { label: 'Accounting: Profit', a: get('P&L.profit'), b: fixed(app.accProfit), expected: netGap - app.unlisted, where: netGap - app.unlisted ? `Accounting, Stay month · gap = still owed ${formatINR(netGap)}${app.unlisted ? ` − expenses with no room ${formatINR(app.unlisted)}` : ''}` : 'Accounting, Stay month' },
        { label: 'Accounting: Outstanding', a: get('recv.balance'), b: fixed(app.accOutstanding), expected: k.credit + sum(cancelled, (f) => f.received + f.b2bExt) + unlinkedExt, where: 'Accounting, Stay month · it nets overpayments and money on cancelled stays' },
      )
    } else {
      // on Cash date both count the money received, so they agree
      toApp.push(
        { label: 'Accounting: Net Revenue', a: get('P&L.net'), b: fixed(app.accNetRevenue), where: 'Accounting, Cash date' },
        { label: 'Accounting: Profit', a: get('P&L.profit'), b: fixed(app.accProfit), expected: -app.unlisted, where: `Accounting, Cash date${noRoom}` },
      )
    }
  }

  const head = (r: number, text: string, cols: string[]) => {
    sh.set(r, 1, text, t.section)
    for (let c = 2; c <= 6; c++) sh.set(r, c, null, t.section)
    sh.height(r, 20)
    sh.height(r + 1, 30)
    cols.forEach((c, i) => sh.set(r + 1, 1 + i, c, t.th(i === 0 || i === 5 ? 'text' : 'center')))
    return r + 2
  }
  let failures = 0
  const rowsOut = (start: number, checks: Check[]) => {
    let r = start
    checks.forEach((ch, i) => {
      const alt = i % 2 === 1
      const kind = ch.kind ?? 'money'
      const diff = ch.a.v - ch.b.v
      const expected = ch.expected ?? 0
      const ok = Math.abs(diff - expected) < 0.5
      if (!ok) failures += 1
      const status = ok ? (expected ? '✓ Explained' : '✓ Balanced') : '✗ Check'
      sh.height(r, 20)
      sh.set(r, 1, ch.label, t.td('text', alt))
      // a figure from Weland's screens is a plain number; one from this workbook is a live reference
      const formula = (mk: Mark) => (/^-?\d+(\.\d+)?$/.test(mk.ref) ? undefined : mk.ref)
      sh.set(r, 2, ch.a.v, t.td(kind, alt, { v: ch.a.v }), formula(ch.a))
      sh.set(r, 3, ch.b.v, t.td(kind, alt, { v: ch.b.v }), formula(ch.b))
      sh.set(r, 4, diff, t.td(kind, alt, { v: diff }), `${ref(2, r)}-${ref(3, r)}`)
      sh.set(r, 5, status, wb.style({ ...grid, fill: alt ? C.cream : undefined, bold: true, size: 10, h: 'center', color: ok ? C.green : C.red }),
        `IF(ABS(${ref(4, r)}-(${expected}))<0.5,"${expected ? '✓ Explained' : '✓ Balanced'}","✗ Check")`)
      sh.set(r, 6, ch.where, t.td('text', alt, { muted: true }))
      r += 1
    })
    return r
  }
  let r = head(9, 'WITHIN THIS WORKBOOK · the same figure on two sheets', ['Check', 'This figure', 'Compared with', 'Difference', 'Status', 'Where'])
  const first = r
  r = rowsOut(r, workbook)
  r = head(r + 1, 'AGAINST THE WELAND APP · same dates and room', ['Check', 'This workbook', 'Weland shows', 'Difference', 'Status', 'Where to see it'])
  r = rowsOut(r, toApp)
  const last = r - 1
  if (m.villa !== ALL_ROOMS) {
    sh.set(r + 1, 1, 'The Accounting page is left out here: it counts a booking of several rooms under its first room only, so its figures for one room differ by design.', t.desc)
    sh.merge(r + 1, 1, r + 1, 6)
  }

  // overall status on top
  const banner = failures === 0 ? '✓ All figures balance' : `✗ ${failures} figure${failures === 1 ? '' : 's'} to check`
  sh.height(7, 30)
  sh.set(7, 1, banner, wb.style({ bold: true, size: 13, color: failures ? C.red : C.green, fill: failures ? 'FDECEC' : 'E7F6EE', h: 'left', indent: 1 }),
    `IF(COUNTIF(${colName(5)}${first}:${colName(5)}${last},"✗*")=0,"✓ All figures balance","✗ "&COUNTIF(${colName(5)}${first}:${colName(5)}${last},"✗*")&" figure(s) to check")`)
  for (let c = 2; c <= 6; c++) sh.set(7, c, null, wb.style({ fill: failures ? 'FDECEC' : 'E7F6EE' }))
  sh.merge(7, 1, 7, 6)
  sh.freeze = { rows: 0, cols: 0 }
}

function setupSheet(ctx: Ctx, o: { generatedAt: Date; generatedBy?: string }, data: AppData) {
  const { wb, t, m } = ctx
  const sh = wb.sheet('Setup & Notes')
  sh.tabColor = '64748B'
  sh.landscape = false
  sh.fitPage = true
  sh.widths = [10, 28, 16, 16, 16, 40]
  frame(sh, ctx, 5, 'Setup & Notes', 'What this workbook covers, the property set-up behind it, and how each figure is worked out.')
  const head = (r: number, text: string) => {
    sh.set(r, 1, text, t.section)
    for (let c = 2; c <= 5; c++) sh.set(r, c, null, t.section)
    sh.height(r, 20)
  }
  const kv = (r: number, k: string, v: string) => {
    sh.set(r, 1, k, t.key)
    sh.set(r, 2, v, t.value)
    for (let c = 3; c <= 5; c++) sh.set(r, c, null, t.value)
    sh.merge(r, 2, r, 5)
  }
  let r = 7
  head(r++, 'REPORT')
  const time = o.generatedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  for (const [k, v] of [
    ['Report', 'Management Report'],
    ['Period', `${fmtDate(m.from)} – ${fmtDate(m.to)}`],
    ['Rooms', m.villa],
    ['Period basis', m.basis === 'stay' ? 'Stay month: bookings checking in during the period, with all their payments' : 'Cash date: money by the date it was paid (cash basis)'],
    ['Balances as of', fmtDate(m.today)],
    ['Generated', `${fmtDate(toISO(o.generatedAt))}, ${time}${o.generatedBy ? ` by ${o.generatedBy}` : ''}`],
    ['Currency', 'Indian Rupee (₹)'],
  ]) kv(r++, k, v)
  r += 1
  head(r++, 'PROPERTY')
  for (const [k, v] of [
    ['Name', RESORT.name],
    ['Address', RESORT.address.join(', ')],
    ['Phone / WhatsApp', RESORT.phone],
    ['Email', RESORT.email],
    ['Website', RESORT.website],
    ['Instagram', RESORT.instagram],
  ]) kv(r++, k, v)
  r += 1
  head(r++, 'ROOMS')
  const roomCols: Col[] = [
    { title: 'Room', width: 0, kind: 'text' },
    { title: 'Code', width: 0, kind: 'center' },
    { title: 'Capacity', width: 0, kind: 'center' },
    { title: 'Base Rate / Night', width: 0, kind: 'money', total: 'none' },
    { title: 'Status', width: 0, kind: 'text' },
  ]
  const roomRows: RowValue[][] = ROOMS.map((rm) => [rm.name, rm.code, `${ctx.capacity[rm.name]} guests`, ctx.rates[rm.name], rm.status])
  const rt = table(sh, ctx, r, roomCols, roomRows, { filter: false, totalLabel: `${ROOMS.length} units` })
  r = rt.totalRow + 2

  head(r++, 'LISTS')
  const sources = [...new Set(['Direct', 'B2B', 'OTA', 'Walk-in', ...data.bookings.map((b) => b.source).filter(Boolean)])]
  kv(r++, 'Booking sources', sources.join(' · '))
  kv(r++, 'Expense categories', [...new Set([...EXPENSE_CATEGORIES, ...data.expenses.map((e) => e.category)])].join(' · '))
  kv(r++, 'Payment methods', `${PAYMENT_METHODS.join(' · ')}  (Cash = at the resort; the others = bank & digital)`)
  kv(r++, 'Booking statuses', 'Enquiry · Hold · Confirmed · Checked in · Completed · Cancelled')
  r += 1

  head(r++, 'HOW TO READ THIS WORKBOOK')
  const notes = [
    'Period basis follows the Reports page. Stay month: the bookings checking in during the period, with all their payments whatever their date (Dashboard, P&L, Cash Flow, Payments). Cash date: money by the date it was paid, and a cash-basis P&L. Monthly, Room Summary, Bookings and Receivables always list the bookings checking in during the period; expenses always follow their own date.',
    'Billed = the total of bookings that are not cancelled (enquiry and hold included, as in the app). A cancelled booking counts only what was kept after refunds (“retained”).',
    'B2B commission follows its booking’s check-in on Stay month and its entry date on Cash date. “Paid out” = the resort pays the partner (an expense). “Kept by partner” = collected externally: the partner kept it from the guest’s payment, so the resort received the total less commission and does not pay it again.',
    'Net revenue, Stay month: billed + retained − all B2B commission. Cash date: money received after refunds − B2B commission paid out (commission a partner kept never reached the resort). Net profit = net revenue − operating expenses; net margin = net profit ÷ income.',
    'Balance due = total − payments received (less refunds) − commission kept by the partner, as of the “balances as of” date. Days overdue count from check-out.',
    'Room-nights = nights × rooms in a booking (Full Property = every unit). Nights booked by unit (Room Summary) counts the nights each unit is booked within the period; overlapping bookings count once.',
    'Room Summary counts a booking of several rooms under its first room, and a whole-property booking under Full Property, as on the Accounting page.',
    'Bank & digital = UPI, card and bank transfer. A payment with no method counts as cash, as in the app. Use “Net bank & digital credits” (Cash Flow) or the Payments summary to tick off the bank statement.',
    'Total credited = payments received before refunds, the same figure as Reports → Payments & Refunds (Cash date); refunds are shown on their own line, and “net” figures are after refunds.',
    'The Balance Check sheet works out each key figure two ways (across these sheets, and with the rules of Weland’s own screens) and shows the difference; ✓ means it balances.',
    'Totals, net lines and percentages are live Excel formulas: change a figure and they update.',
  ]
  notes.forEach((text, i) => {
    sh.set(r, 1, `${i + 1}.`, t.noteNum)
    sh.set(r, 2, text, t.note)
    for (let c = 3; c <= 5; c++) sh.set(r, c, null, t.note)
    sh.merge(r, 2, r, 5)
    sh.height(r, Math.max(1, Math.ceil(text.length / 95)) * 14 + 6)
    r += 1
  })
}

// ---------------------------------------------------------------- build

/** The finished Management Report (.xlsx bytes). */
export function buildManagementReport(data: AppData, o: ManagementOptions & { generatedAt: Date; generatedBy?: string; logo?: Uint8Array }): Uint8Array {
  const m = managementModel(data, o)
  const wb = new Workbook({ title: `Management Report · ${m.periodLabel}`, author: `${RESORT.name} · Weland Admin`, created: o.generatedAt, logo: o.logo })
  const ctx: Ctx = {
    wb, t: themeOf(wb), m, logo: !!o.logo,
    rates: Object.fromEntries(ROOMS.map((r) => [r.name, effectiveRate(r.name, data)])),
    capacity: Object.fromEntries(ROOMS.map((r) => [r.name, capacityOf(r.name, data)])),
    marks: {},
    subtitle: `Management Report  ·  ${m.periodLabel}  ·  ${m.villa}  ·  ${m.basis === 'stay' ? 'Stay month' : 'Cash date'}  ·  Generated ${fmtDate(toISO(o.generatedAt))}`,
    footer: `&L&8${RESORT.name} · Management Report · ${m.periodLabel}&R&8Page &P of &N`,
  }
  dashboard(ctx)
  pnl(ctx)
  monthly(ctx)
  cashFlow(ctx)
  roomSummary(ctx)
  receivables(ctx)
  b2bSheet(ctx)
  bookingsSheet(ctx)
  paymentsSheet(ctx)
  expensesSheet(ctx)
  balanceCheck(ctx, data)
  setupSheet(ctx, o, data)
  return wb.build()
}
