import { Navigate, Outlet } from 'react-router-dom'
import { useAuthContext } from '../store/AuthContext.jsx'
import { ROUTES } from '../utils/constants.js'

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-crimson-200 border-t-crimson-700 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-sans tracking-wide">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user)                           return <Navigate to={ROUTES.LOGIN}        replace />
  if (!allowedRoles.includes(user.role)) return <Navigate to={ROUTES.UNAUTHORIZED} replace />

  return <Outlet />
}
