import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Bell, ChevronDown } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'
import { getInitials } from '../../utils/helpers.js'
import { getRoleBadgeStyle, getRoleLabel } from '../../utils/roleUtils.js'
import { useState, useRef, useEffect } from 'react'
import { ROUTES } from '../../utils/constants.js'

export default function Navbar({ onMenuToggle, showMenu }) {
  const { user, signOut } = useAuth()
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    const close = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-30">
      {/* Mobile menu btn */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect y="2"  width="18" height="2" rx="1" fill="currentColor"/>
            <rect y="8"  width="12" height="2" rx="1" fill="currentColor"/>
            <rect y="14" width="18" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
      )}

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mr-auto lg:mr-0">
        <div className="w-7 h-7 bg-crimson-700 rounded-lg flex items-center justify-center">
          <span className="font-display font-bold text-white text-sm">S</span>
        </div>
        <span className="font-display font-semibold text-gray-900 text-lg hidden sm:block">
          Syllabex
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications placeholder */}
        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors relative">
          <Bell size={17} />
        </button>

        {/* User menu */}
        <div ref={dropRef} className="relative">
          <button
            onClick={() => setDropOpen(p => !p)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-crimson-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {getInitials(user?.name || user?.email)}
            </div>
            <div className="hidden md:flex flex-col items-start leading-none">
              <span className="text-sm font-medium text-gray-800 font-sans truncate max-w-[120px]">
                {user?.name || user?.email?.split('@')[0]}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 ${getRoleBadgeStyle(user?.role)}`}>
                {getRoleLabel(user?.role)}
              </span>
            </div>
            <ChevronDown size={14} className="text-gray-400 hidden md:block" />
          </button>

          {dropOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-modal py-1.5 animate-fade-up z-50">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-sm font-semibold text-gray-900 truncate font-sans">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5 font-sans">{user?.email}</p>
              </div>
              <button
                onClick={() => { setDropOpen(false); signOut() }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-sans"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
