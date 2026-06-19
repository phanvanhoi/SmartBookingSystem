import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar, { BottomNav } from './Sidebar'
import Header from './Header'
import StatusBar from './StatusBar'
import GlobalFetchIndicator from '../GlobalFetchIndicator'
import MobileMenuSheet from './MobileMenuSheet'
import MoreMenuSheet from './MoreMenuSheet'
import { useSessionKeepAlive } from '@/hooks/useAuth'
import { useSocket } from '@/hooks/useSocket'

export default function MainLayout() {
  useSessionKeepAlive()
  useSocket()

  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground">
      <GlobalFetchIndicator />

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMobileMenuToggle={() => setMenuOpen(true)} />

        <main className="flex-1 overflow-auto p-4 md:p-6 pb-mobile-main md:pb-6">
          <Outlet />
        </main>

        {/* Desktop status bar */}
        <div className="hidden md:block">
          <StatusBar />
        </div>
      </div>

      {/* Mobile footer: status + bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <StatusBar compact />
        <BottomNav onMoreClick={() => setMoreOpen(true)} />
      </div>

      <MobileMenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
      <MoreMenuSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </div>
  )
}
