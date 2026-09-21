const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})
const inrCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** ₹2,94,820 — Indian digit grouping */
export function formatINR(n: number): string {
  return inr.format(n)
}
export function formatINRCompact(n: number): string {
  return inrCompact.format(n)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const parseISODate = parseISO

/** 12 Sep 2026 */
export function fmtDate(iso: string): string {
  const d = parseISO(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
export const formatDate = fmtDate

/** 12 Sep */
export function fmtDateShort(iso: string): string {
  const d = parseISO(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS_FULL[month]} ${year}`
}

export function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** The app's "today" — matches the seed-data window. */
export const TODAY = new Date(2026, 8, 17) // 2026-09-17
export const TODAY_ISO = toISO(TODAY)

/** 17 Sep 2026 */
export function fmtDateLong(iso: string): string {
  return fmtDate(iso)
}
