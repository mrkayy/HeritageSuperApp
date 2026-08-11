
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  User,
  Heart,
  MessageSquare,
  MapPin,
  Calendar,
  Trophy,
  Settings,
  LogOut,
  Shield,
  Building,
  Users2,
  LucidePhoneCall,
  FolderEdit,
  LucideSettings
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Soul",
    url: "/souls/register",
    icon: Heart,
  },
  {
    title: "Soul Journal",
    url: "/souls/journal",
    icon: User,
  },
  {
    title: "Follow-Up",
    url: "/follow-up",
    icon: MessageSquare,
  },
  /* 
  // Commented out: No dedicated backend endpoint currently supporting Map View
  {
    title: "Map View",
    url: "/map",
    icon: MapPin,
  },
  */
  {
    title: "Transport",
    url: "/transport",
    icon: Calendar,
  },
  /*
  // Commented out: No backend endpoint currently supporting Leaderboard stats
  {
    title: "Leaderboard",
    url: "/leaderboard",
    icon: Trophy,
  }
  */
];

const adminItems = [
  {
    title: "Admin Panel",
    url: "/admin",
    icon: Settings,
  },
  /*
  // Commented out: No backend endpoints currently for Management, Follow-up Management, Member Management
  {
    title: "Management",
    url: "/admin/management",
    icon: Building,
  },
  */
  {
    title: "Member Invites",
    url: "/admin/member-invites",
    icon: Users2,
  },
  /*
  {
    title: "Follow-up Management",
    url: "/admin/follow-up-management",
    icon: LucidePhoneCall,
  },
  {
    title: "Member Management",
    url: "/admin/member-assignment",
    icon: FolderEdit,
  }
  */
];

const superAdminItems = [
  /*
  // Commented out: Super Admin endpoints (denominations, invites, settings) not currently implemented in backend
  {
    title: "Super Admin",
    url: "/super-admin",
    icon: Shield,
  },
  {
    title: "Denominations",
    url: "/super-admin/denominations",
    icon: Building,
  },
  {
    title: "Admin Invites",
    url: "/super-admin/invites",
    icon: Users2,
  },
  {
    title: "App Settings",
    url: "/super-admin/settings",
    icon: LucideSettings,
  }
  */
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className="border-r glass-card">
      <SidebarHeader className={`p-2 md:p-4 ${isCollapsed ? 'px-2' : 'px-4 md:px-6'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 md:gap-3'}`}>
          <div className="w-6 h-6 md:w-8 md:h-8 lg:w-12 lg:h-12 flex items-center justify-center">
            <img 
              src="/lovable-uploads/e1aa47db-ce0d-41de-acc4-3fd9d77b6b39.png" 
              alt="Soul Bank Logo" 
              className="w-6 h-6 md:w-8 md:h-8 lg:w-12 lg:h-12 object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="hidden sm:block">
              <h2 className="font-bold text-sm md:text-base lg:text-lg text-primary">Soul Bank</h2>
              <p className="text-xs md:text-sm text-muted-foreground">Navigator</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1 md:px-2 lg:px-4">
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url} className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                      <item.icon className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                      {!isCollapsed && <span className="text-xs md:text-sm lg:text-base">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(user?.role === 'church_admin' || user?.role === 'super_admin') && (
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url} className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                        <item.icon className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                        {!isCollapsed && <span className="text-xs md:text-sm lg:text-base">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {user?.role === 'super_admin' && superAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>Super Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url} className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                        <item.icon className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                        {!isCollapsed && <span className="text-xs md:text-sm lg:text-base">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className={`p-1 md:p-2 lg:p-4 ${isCollapsed ? 'px-1' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center mb-2' : 'gap-2 md:gap-3 mb-3 md:mb-4'}`}>
          <Avatar className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 flex-shrink-0">
            <AvatarImage src="" />
            <AvatarFallback className="text-xs">{user?.firstName?.charAt(0)}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
        </div>
        <Button 
          variant="ghost" 
          onClick={logout} 
          className={`w-full justify-start text-xs md:text-sm ${isCollapsed ? 'px-1' : ''}`}
          size={isCollapsed ? "sm" : "default"}
        >
          <LogOut className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
          {!isCollapsed && <span className="ml-1 md:ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
