import { NavLink } from 'react-router'
import { FiGrid, FiBriefcase, FiMapPin, FiUsers, FiBarChart2, FiFileText, FiLogOut } from 'react-icons/fi'
import { horizontalBlack } from '@loomacharge/brand'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

const items = [
  { title: 'Dashboard', url: '/', icon: FiGrid },
  { title: 'Organizations', url: '/organizations', icon: FiBriefcase },
  { title: 'Sites', url: '/sites', icon: FiMapPin },
  { title: 'Users', url: '/users', icon: FiUsers },
  { title: 'Statistics', url: '/statistics', icon: FiBarChart2 },
  { title: 'Logs', url: '/logs', icon: FiFileText },
]

export function AppSidebar() {
  const { session } = useAuth()

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <img src={horizontalBlack} alt="Looma" className="h-7" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <p className="truncate text-xs text-muted-foreground">{session?.user.email}</p>
        <SidebarMenuButton onClick={() => supabase.auth.signOut()}>
          <FiLogOut />
          <span>Sign out</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  )
}
