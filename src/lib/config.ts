// ------------------------------------------------------------------
//  CONFIGURE THIS (per property)
// ------------------------------------------------------------------
export const PROPERTY_NAME = 'Weland'
export const PROPERTY_TAGLINE = 'Rooms Admin'

export const CURRENCY = { symbol: '₹', locale: 'en-IN', code: 'INR' as const }

export const INVOICE_PREFIX_DEFAULT = 'KV-'

/** Sentinel used by every "All rooms" filter. */
export const ALL_ROOMS = 'All rooms'

export interface RoomConfig {
  id: string
  name: string
  slug: string
  code: string
  color: string
  minGuests: number
  maxGuests: number
  baseRate: number
  status: 'Active' | 'Inactive'
}

export const ROOMS: RoomConfig[] = [
  { id: 'r1', name: 'A1', slug: 'a1', code: 'A1', color: '#1e5b3a', minGuests: 2, maxGuests: 6, baseRate: 0, status: 'Active' },
  { id: 'r2', name: 'A2', slug: 'a2', code: 'A2', color: '#2f855a', minGuests: 2, maxGuests: 4, baseRate: 0, status: 'Active' },
  { id: 'r3', name: 'A3', slug: 'a3', code: 'A3', color: '#40916c', minGuests: 2, maxGuests: 4, baseRate: 0, status: 'Active' },
  { id: 'r4', name: 'A4', slug: 'a4', code: 'A4', color: '#1b4332', minGuests: 2, maxGuests: 3, baseRate: 0, status: 'Active' },
  { id: 'r5', name: 'B1', slug: 'b1', code: 'B1', color: '#b45309', minGuests: 2, maxGuests: 4, baseRate: 0, status: 'Active' },
  { id: 'r6', name: 'B2', slug: 'b2', code: 'B2', color: '#92400e', minGuests: 2, maxGuests: 5, baseRate: 0, status: 'Active' },
  { id: 'r7', name: 'Dormitory', slug: 'dormitory', code: 'DORM', color: '#475569', minGuests: 10, maxGuests: 16, baseRate: 0, status: 'Active' },
]

export const ROOM_NAMES: string[] = ROOMS.map((r) => r.name)

const BY_NAME = new Map(ROOMS.map((r) => [r.name, r]))
export function roomColor(name: string): string {
  return BY_NAME.get(name)?.color ?? '#64748b'
}
export function roomCapacity(name: string): { min: number; max: number } {
  const r = BY_NAME.get(name)
  return { min: r?.minGuests ?? 1, max: r?.maxGuests ?? 20 }
}
