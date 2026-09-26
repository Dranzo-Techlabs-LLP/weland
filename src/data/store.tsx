import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ROOMS } from '../lib/config'
import { api, ApiError, setToken, type BookingWrite, type UserWrite } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import type { AppData, Booking, BookingStatus, Expense, InvoiceSettings, Payment } from '../types'

export function paidOf(b: Booking): number {
  return b.payments.reduce((s, p) => s + (p.kind === 'refund' ? -p.amount : p.amount), 0)
}
export function balanceOf(b: Booking): number {
  return b.total - paidOf(b)
}
/** Category that represents B2B partner commission (excluded from "operating" expenses). */
export const B2B_CATEGORY = 'B2B Commission'

/** Empty dataset used before bootstrap resolves / after logout. */
function emptyData(): AppData {
  return {
    bookings: [],
    expenses: [],
    users: [],
    roles: [],
    invoice: { prefix: 'KV-', next: 1, padding: 5, terms: '' },
    villaOverrides: {},
  }
}

interface StoreValue {
  data: AppData
  loading: boolean
  error: string | null
  clearError: () => void
  reload: () => void
  addExpense: (e: Omit<Expense, 'id'>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  addUser: (u: UserWrite) => Promise<void>
  updateUser: (id: string, u: UserWrite) => Promise<void>
  setUserActive: (id: string, active: boolean) => Promise<void>
  saveRoleRights: (roleId: string, rights: string[]) => Promise<void>
  addRole: (name: string) => Promise<void>
  saveInvoice: (s: Partial<InvoiceSettings>) => Promise<void>
  createBooking: (input: BookingWrite) => Promise<string>
  updateBooking: (ref: string, fields: BookingWrite) => Promise<void>
  deleteBooking: (ref: string) => Promise<void>
  addPayment: (ref: string, p: Omit<Payment, 'id'>) => Promise<void>
  updatePayment: (id: string, p: Omit<Payment, 'id'>) => Promise<void>
  deletePayment: (id: string) => Promise<void>
  setBookingStatus: (ref: string, status: BookingStatus) => Promise<void>
  saveVillaOverride: (name: string, data: { baseRate?: number; notes?: string }) => Promise<void>
}

const StoreContext = createContext<StoreValue | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const [data, setData] = useState<AppData>(emptyData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    api.bootstrap()
      .then((d) => setData({ ...emptyData(), ...d }))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          setToken(null)
          logout()
        } else {
          setError(e instanceof Error ? e.message : 'Failed to load data.')
        }
      })
      .finally(() => setLoading(false))
  }, [logout])

  // Load everything once the user is authenticated; clear on logout.
  useEffect(() => {
    if (!user) {
      setData(emptyData())
      setError(null)
      setLoading(false)
      return
    }
    load()
  }, [user, load])

  // Wrap a mutation so a failure surfaces in the error banner instead of
  // bubbling up as an unhandled promise rejection (callers don't await).
  const guard = useCallback(async (fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }, [])

  const addExpense = useCallback((e: Omit<Expense, 'id'>) => guard(async () => {
    const { expense } = await api.addExpense(e)
    setData((d) => ({ ...d, expenses: [expense, ...d.expenses] }))
  }), [guard])

  const deleteExpense = useCallback((id: string) => guard(async () => {
    await api.deleteExpense(id)
    setData((d) => ({ ...d, expenses: d.expenses.filter((x) => x.id !== id) }))
  }), [guard])

  // Users: failures are thrown, not bannered, so the form can show them.
  const addUser = useCallback(async (u: UserWrite) => {
    const { user: created } = await api.addUser(u)
    setData((d) => ({ ...d, users: [...d.users, created] }))
  }, [])

  const updateUser = useCallback(async (id: string, u: UserWrite) => {
    const { user: updated } = await api.updateUser(id, u)
    setData((d) => ({ ...d, users: d.users.map((x) => (x.id === id ? updated : x)) }))
  }, [])

  const setUserActive = useCallback((id: string, active: boolean) => guard(async () => {
    const { user: updated } = await api.setUserActive(id, active)
    setData((d) => ({ ...d, users: d.users.map((x) => (x.id === id ? updated : x)) }))
  }), [guard])

  const saveRoleRights = useCallback((roleId: string, rights: string[]) => guard(async () => {
    await api.saveRoleRights(roleId, rights)
    setData((d) => ({ ...d, roles: d.roles.map((r) => (r.id === roleId ? { ...r, rights } : r)) }))
  }), [guard])

  const addRole = useCallback((name: string) => guard(async () => {
    const { role } = await api.addRole(name)
    setData((d) => ({ ...d, roles: [...d.roles, role] }))
  }), [guard])

  const saveInvoice = useCallback((s: Partial<InvoiceSettings>) => guard(async () => {
    const { invoice } = await api.saveInvoice(s)
    setData((d) => ({ ...d, invoice }))
  }), [guard])

  const replaceBooking = (booking: Booking) =>
    setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.ref === booking.ref ? booking : b)) }))

  const addPayment = useCallback((ref: string, p: Omit<Payment, 'id'>) => guard(async () => {
    const { booking } = await api.addPayment(ref, p)
    replaceBooking(booking)
  }), [guard])

  const updatePayment = useCallback((id: string, p: Omit<Payment, 'id'>) => guard(async () => {
    const { booking } = await api.updatePayment(id, p)
    replaceBooking(booking)
  }), [guard])

  const deletePayment = useCallback((id: string) => guard(async () => {
    const { booking } = await api.deletePayment(id)
    replaceBooking(booking)
  }), [guard])

  const setBookingStatus = useCallback((ref: string, status: BookingStatus) => guard(async () => {
    const { booking } = await api.setBookingStatus(ref, status)
    setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.ref === ref ? booking : b)) }))
  }), [guard])

  const saveVillaOverride = useCallback((name: string, patch: { baseRate?: number; notes?: string }) => guard(async () => {
    await api.saveVillaOverride(name, patch)
    setData((d) => ({ ...d, villaOverrides: { ...d.villaOverrides, [name]: { ...d.villaOverrides[name], ...patch } } }))
  }), [guard])

  const createBooking = useCallback(async (input: BookingWrite) => {
    try {
      const { ref, booking } = await api.createBooking(input)
      setData((d) => ({ ...d, bookings: [booking, ...d.bookings], invoice: { ...d.invoice, next: d.invoice.next + 1 } }))
      load() // pull in the linked B2B expense, if any
      return ref
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the booking.')
      return ''
    }
  }, [load])

  const updateBooking = useCallback((ref: string, fields: BookingWrite) => guard(async () => {
    const { booking } = await api.updateBooking(ref, fields)
    setData((d) => ({ ...d, bookings: d.bookings.map((b) => (b.ref === ref ? booking : b)) }))
    load() // refresh payments/expenses (B2B commission) touched by the edit
  }), [guard, load])

  const deleteBooking = useCallback((ref: string) => guard(async () => {
    await api.deleteBooking(ref)
    setData((d) => ({ ...d, bookings: d.bookings.filter((b) => b.ref !== ref) }))
  }), [guard])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<StoreValue>(() => ({
    data, loading, error, clearError, reload: load,
    addExpense, deleteExpense, addUser, updateUser, setUserActive, saveRoleRights, addRole,
    saveInvoice, createBooking, updateBooking, deleteBooking, addPayment, updatePayment, deletePayment, setBookingStatus, saveVillaOverride,
  }), [data, loading, error, clearError, load, addExpense, deleteExpense, addUser, updateUser, setUserActive, saveRoleRights, addRole, saveInvoice, createBooking, updateBooking, deleteBooking, addPayment, updatePayment, deletePayment, setBookingStatus, saveVillaOverride])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}

export function effectiveRate(villaName: string, data: AppData): number {
  const base = ROOMS.find((v) => v.name === villaName)?.baseRate ?? 0
  return data.villaOverrides[villaName]?.baseRate ?? base
}
export function roleMemberCount(data: AppData, roleName: string): number {
  return data.users.filter((u) => u.role === roleName).length
}
