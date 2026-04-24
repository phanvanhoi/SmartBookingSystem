import { Outlet } from 'react-router-dom'
import Sidebar, { BottomNav } from './Sidebar'
import Header from './Header'
import StatusBar from './StatusBar'
import GlobalFetchIndicator from '../GlobalFetchIndicator'

export default function MainLayout() {
  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground">
      <GlobalFetchIndicator />

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>

        <StatusBar />
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  )
}
