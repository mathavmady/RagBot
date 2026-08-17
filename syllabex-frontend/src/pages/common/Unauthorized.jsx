import { Link } from 'react-router-dom'
import { ShieldOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'
import { getHomeRoute } from '../../utils/roleUtils.js'
import { ROUTES } from '../../utils/constants.js'

export default function Unauthorized() {
  const { user, signOut } = useAuth()
  const home = user ? getHomeRoute(user.role) : ROUTES.LOGIN

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="text-center max-w-sm animate-fade-up">
        <div className="relative inline-block mb-8">
          <p className="font-display text-[9rem] font-bold text-gray-100 leading-none select-none">403</p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-crimson-700 rounded-2xl flex items-center justify-center shadow-red">
              <ShieldOff size={28} className="text-white"/>
            </div>
          </div>
        </div>
        <h1 className="font-display text-2xl font-semibold text-gray-900 mb-2">Access denied</h1>
        <p className="text-sm text-gray-500 font-sans mb-8 leading-relaxed">
          You don't have permission to view this page. Please contact your administrator if you think this is a mistake.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to={home} className="inline-flex items-center gap-2 bg-crimson-700 text-white text-sm font-sans font-medium px-5 py-2.5 rounded-xl hover:bg-crimson-800 transition-colors shadow-red">
            <ArrowLeft size={15}/> Go back
          </Link>
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-crimson-700 font-sans transition-colors px-3 py-2.5">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
