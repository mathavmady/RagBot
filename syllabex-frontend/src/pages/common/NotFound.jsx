import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'
import { getHomeRoute } from '../../utils/roleUtils.js'
import { ROUTES } from '../../utils/constants.js'

export default function NotFound() {
  const { user } = useAuth()
  const home = user ? getHomeRoute(user.role) : ROUTES.LOGIN

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="text-center max-w-sm animate-fade-up">
        {/* Big 404 */}
        <div className="relative inline-block mb-8">
          <p className="font-display text-[9rem] font-bold text-gray-100 leading-none select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-crimson-700 rounded-2xl flex items-center justify-center shadow-red">
              <BookOpen size={28} className="text-white"/>
            </div>
          </div>
        </div>

        <h1 className="font-display text-2xl font-semibold text-gray-900 mb-2">
          Page not found
        </h1>
        <p className="text-sm text-gray-500 font-sans mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Link
          to={home}
          className="inline-flex items-center gap-2 bg-crimson-700 text-white text-sm font-sans font-medium px-5 py-2.5 rounded-xl hover:bg-crimson-800 transition-colors shadow-red"
        >
          <ArrowLeft size={15}/> Back to home
        </Link>
      </div>
    </div>
  )
}
