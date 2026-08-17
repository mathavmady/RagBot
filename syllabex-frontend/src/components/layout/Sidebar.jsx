import { NavLink, useLocation } from 'react-router-dom'
import { classNames } from '../../utils/helpers.js'
import { useAuth } from '../../hooks/useAuth.js'
import { ROLES, ROUTES } from '../../utils/constants.js'
import {
  MessageSquare, LayoutDashboard, Upload,
  Users, FileText, BookOpen, X
} from 'lucide-react'

const navMap = {
  [ROLES.STUDENT]: [
    { to: ROUTES.CHAT, icon: <MessageSquare size={17}/>, label: 'Ask Syllabex' },
  ],
  [ROLES.FACULTY]: [
    { to: ROUTES.FACULTY_DASH, icon: <LayoutDashboard size={17}/>, label: 'Dashboard' },
    { to: ROUTES.UPLOAD,       icon: <Upload size={17}/>,           label: 'Upload Materials' },
    { to: ROUTES.CHAT,         icon: <MessageSquare size={17}/>,    label: 'Ask Syllabex' },
  ],
  [ROLES.ADMIN]: [
    { to: ROUTES.ADMIN_DASH,      icon: <LayoutDashboard size={17}/>, label: 'Dashboard' },
    { to: ROUTES.MANAGE_FACULTY,  icon: <Users size={17}/>,           label: 'Manage Faculty' },
    { to: ROUTES.MANAGE_DOCS,     icon: <FileText size={17}/>,        label: 'Documents' },
    { to: ROUTES.CHAT,            icon: <MessageSquare size={17}/>,   label: 'Ask Syllabex' },
  ],
}

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth()
  const nav = navMap[user?.role] || []

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={classNames(
        'fixed lg:static inset-y-0 left-0 z-40 w-60 bg-white border-r border-gray-100',
        'flex flex-col transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Header */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-crimson-700 rounded-lg flex items-center justify-center">
              <BookOpen size={14} className="text-white" />
            </div>
            <span className="font-display font-semibold text-gray-900">Syllabex</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {nav.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => onClose?.()}
              className={({ isActive }) => classNames(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans font-medium transition-all duration-150',
                isActive
                  ? 'bg-crimson-50 text-crimson-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-crimson-700' : 'text-gray-400'}>{icon}</span>
                  {label}
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-crimson-600" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom brand mark */}
        <div className="px-5 py-4 border-t border-gray-50">
          <p className="text-[10px] uppercase tracking-widest text-gray-300 font-sans font-semibold">
            Powered by RAG + Groq
          </p>
        </div>
      </aside>
    </>
  )
}
