import { Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AIAssistantPanel from '../ai-assistant/AIAssistantPanel'

export default function DashboardLayout() {
  const { sidebarCollapsed, aiAssistantOpen } = useSelector(s => s.ui)

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--color-background)' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--color-background)' }}>
          <Outlet />
        </main>
      </div>

      {/* Global AI Assistant panel (slide-in, not a route) */}
      {aiAssistantOpen && <AIAssistantPanel />}
    </div>
  )
}
