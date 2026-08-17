import { useState } from 'react'
import Navbar from './Navbar.jsx'
import Sidebar from './Sidebar.jsx'

export default function AppLayout({ children, hideSidebar = false }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA]">
      {!hideSidebar && (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar onMenuToggle={!hideSidebar ? () => setSidebarOpen(p => !p) : undefined} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
