import { useAuthContext } from '../store/AuthContext.jsx'
import { getHomeRoute } from '../utils/roleUtils.js'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../utils/constants.js'

export function useAuth() {
  const ctx      = useAuthContext()
  const navigate = useNavigate()

  const signOut = async () => {
    await ctx.logout()
    navigate(ROUTES.LOGIN)
  }

  const redirectToHome = () => {
    if (ctx.user?.role) navigate(getHomeRoute(ctx.user.role))
  }

  return {
    ...ctx,
    signOut,
    redirectToHome,
    isAdmin:   ctx.user?.role === 'ADMIN',
    isFaculty: ctx.user?.role === 'FACULTY',
    isStudent: ctx.user?.role === 'STUDENT',
  }
}
