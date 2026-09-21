import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError, getToken, setToken, type SessionUser } from '../lib/api'

export type CurrentUser = SessionUser

interface AuthValue {
  user: CurrentUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  // If a token is present we must verify it before deciding to show the app or login.
  const [loading, setLoading] = useState<boolean>(() => !!getToken())

  useEffect(() => {
    let alive = true
    if (!getToken()) {
      setLoading(false)
      return
    }
    api.me()
      .then((r) => { if (alive) setUser(r.user) })
      .catch(() => { if (alive) { setToken(null); setUser(null) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.login(email, password)
      setToken(res.token)
      setUser(res.user)
      return { ok: true }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Sign in failed. Check your connection.'
      return { ok: false, error: msg }
    }
  }, [])

  const logout = useCallback(() => {
    api.logout().catch(() => { /* best effort */ })
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

// eslint-disable-next-line react-refresh/only-export-components
export function can(user: CurrentUser | null, right: string): boolean {
  return !!user && user.rights.includes(right)
}
