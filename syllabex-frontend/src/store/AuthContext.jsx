import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { TOKEN_KEY, USER_KEY } from '../config/config.js'
import { authService } from '../services/authService.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  })
  const [token,   setToken]   = useState(() => localStorage.getItem(TOKEN_KEY) || null)
  const [loading, setLoading] = useState(true)

  // Verify token on mount
  useEffect(() => {
    if (token) {
      authService.getProfile()
        .then(res => { setUser(res.data); localStorage.setItem(USER_KEY, JSON.stringify(res.data)) })
        .catch(() => { clearAuth() })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])  // eslint-disable-line

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  const login = useCallback(async (email, password) => {
    const res = await authService.login(email, password)
    const { token: t, user: u } = res.data
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setToken(t)
    setUser(u)
    return u
  }, [])

  const loginGoogle = useCallback(async (googleToken) => {
  const res = await authService.loginWithGoogle(googleToken)

  const { token, temporaryToken, user, requiresPasswordSetup } = res.data

  console.log("🔥 BACKEND RESPONSE:", res.data)

  // ✅ FIRST TIME LOGIN → use temporaryToken
  if (requiresPasswordSetup) {
    return {
      requiresPasswordSetup: true,
      temporaryToken: temporaryToken,   // ✅ FIXED
      user: user
    }
  }

  // ✅ NORMAL LOGIN
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  setToken(token)
  setUser(user)

  return user
}, [])

  const logout = useCallback(async () => {
    try { await authService.logout() } catch {}
    clearAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginGoogle, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
