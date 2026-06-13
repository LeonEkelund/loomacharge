import { Outlet } from 'react-router'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'

export function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
