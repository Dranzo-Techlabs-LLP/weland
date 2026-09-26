// ------------------------------------------------------------------
//  Weland API client
//  Talks to the PHP backend under /api (same origin in production).
//  For local `npm run dev` against the live server, set
//  VITE_API_BASE=https://welandresort.com/api in a .env.development.local file.
// ------------------------------------------------------------------
import type { AppData, Booking, BookingStatus, Expense, InvoiceSettings, Payment, Role, User } from '../types'

const ENV = (import.meta as unknown as { env?: Record<string, string> }).env ?? {}
const API_BASE = (ENV.VITE_API_BASE || '/api').replace(/\/$/, '')
const TOKEN_KEY = 'weland.token'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  villa?: string
  rights: string[]
}

/** Fields the New/Edit booking forms send. */
export type BookingWrite = Omit<Booking, 'id' | 'ref' | 'payments' | 'createdAt'> & {
  advance?: number
  advanceMethod?: string
  b2bCommission?: number
}

/** Fields the Add/Edit user forms send. Password: required to add, optional to edit. */
export type UserWrite = Pick<User, 'name' | 'email' | 'role' | 'active'> & {
  villa: string // room(s) the user looks after, "" = not assigned
  password?: string
}

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function setToken(t: string | null): void {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* ignore */ }
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function req<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0)
  }

  const text = await res.text()
  let data: unknown = {}
  try { data = text ? JSON.parse(text) : {} } catch { /* non-JSON */ }

  if (!res.ok) {
    // A dead/expired session should drop the token so the app returns to login.
    if (res.status === 401) setToken(null)
    const msg = (data as { error?: string })?.error || `Request failed (${res.status})`
    throw new ApiError(msg, res.status)
  }
  return data as T
}

export const api = {
  login: (email: string, password: string) =>
    req<{ token: string; user: SessionUser }>('/login', { method: 'POST', body: { email, password } }),
  me: () => req<{ user: SessionUser }>('/me'),
  logout: () => req<{ ok: boolean }>('/logout', { method: 'POST' }),
  bootstrap: () => req<AppData>('/bootstrap'),

  createBooking: (input: BookingWrite) =>
    req<{ ref: string; booking: Booking }>('/bookings', { method: 'POST', body: input }),
  updateBooking: (ref: string, fields: BookingWrite) =>
    req<{ booking: Booking }>(`/bookings/${encodeURIComponent(ref)}`, { method: 'PUT', body: fields }),
  deleteBooking: (ref: string) =>
    req<{ ok: boolean }>(`/bookings/${encodeURIComponent(ref)}`, { method: 'DELETE' }),
  setBookingStatus: (ref: string, status: BookingStatus) =>
    req<{ booking: Booking }>(`/bookings/${encodeURIComponent(ref)}`, { method: 'PATCH', body: { status } }),
  addPayment: (ref: string, p: Omit<Payment, 'id'>) =>
    req<{ booking: Booking }>(`/bookings/${encodeURIComponent(ref)}/payments`, { method: 'POST', body: p }),
  updatePayment: (id: string, p: Omit<Payment, 'id'>) =>
    req<{ booking: Booking }>(`/payments/${encodeURIComponent(id)}`, { method: 'PUT', body: p }),
  deletePayment: (id: string) =>
    req<{ booking: Booking }>(`/payments/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  addExpense: (e: Omit<Expense, 'id'>) =>
    req<{ expense: Expense }>('/expenses', { method: 'POST', body: e }),
  deleteExpense: (id: string) =>
    req<{ ok: boolean }>(`/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  addUser: (u: UserWrite) =>
    req<{ user: User }>('/users', { method: 'POST', body: u }),
  updateUser: (id: string, u: UserWrite) =>
    req<{ user: User }>(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: u }),
  setUserActive: (id: string, active: boolean) =>
    req<{ user: User }>(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: { active } }),

  addRole: (name: string) =>
    req<{ role: Role }>('/roles', { method: 'POST', body: { name } }),
  saveRoleRights: (roleId: string, rights: string[]) =>
    req<{ ok: boolean }>(`/roles/${encodeURIComponent(roleId)}`, { method: 'PATCH', body: { rights } }),

  saveInvoice: (s: Partial<InvoiceSettings>) =>
    req<{ invoice: InvoiceSettings }>('/invoice', { method: 'PUT', body: s }),
  saveVillaOverride: (name: string, data: { baseRate?: number; notes?: string }) =>
    req<{ ok: boolean }>(`/rooms/${encodeURIComponent(name)}/override`, { method: 'PUT', body: data }),
}
