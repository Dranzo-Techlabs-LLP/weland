// ------------------------------------------------------------------
//  Weland domain types (villa admin)
// ------------------------------------------------------------------

export type BookingStatus =
  | 'enquiry'
  | 'hold'
  | 'confirmed'
  | 'checked in'
  | 'completed'
  | 'cancelled'

export interface Payment {
  id: string
  date: string // ISO
  amount: number
  kind: 'payment' | 'refund'
}

export interface Booking {
  id: string
  ref: string // WL-0001
  guest: string
  phone: string
  email?: string
  villa: string // villa name
  checkIn: string // ISO date
  checkOut: string // ISO date
  guests: number
  status: BookingStatus
  total: number
  payments: Payment[]
  source: string // Direct, B2B, OTA…
  createdAt: string
}

export interface Expense {
  id: string
  date: string // ISO
  category: string
  villa: string
  bookingRef?: string
  description: string
  amount: number
}

export interface User {
  id: string
  name: string
  email: string
  password: string // demo only
  role: string
  villa?: string
  active: boolean
  lastLogin?: string
}

export interface Role {
  id: string
  name: string
  system: boolean
  rights: string[]
}

export interface InvoiceSettings {
  prefix: string
  next: number
  padding: number
  terms: string
}

/** The full client dataset. */
export interface AppData {
  bookings: Booking[]
  expenses: Expense[]
  users: User[]
  roles: Role[]
  invoice: InvoiceSettings
  villaOverrides: Record<string, { baseRate?: number; notes?: string }>
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}
