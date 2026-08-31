
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlag } from '@/contexts/FeatureFlagContext';
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
  Building2,
  Users2,
  Cake,
  UserPlus,
  LucidePhoneCall,
  FolderEdit,
  LucideSettings,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  UserCheck,
  KeyRound,
  ShieldAlert,
  Sparkles,
  BarChart3,
  BookOpen
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MenuItemConfig {
  title: string;
  url: string;
  icon: any;
  flagKey?: string;
}

const menuItems: MenuItemConfig[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Soul",
    url: "/souls/register",
    icon: Heart,
    flagKey: "feature_souls",
  },
  {
    title: "Soul Journal",
    url: "/souls/journal",
    icon: User,
    flagKey: "feature_soul_journal",
  },
  {
    title: "Follow-Up",
    url: "/follow-up",
    icon: MessageSquare,
    flagKey: "feature_followup",
  },
  {
    title: "Transport",
    url: "/transport",
    icon: Calendar,
    flagKey: "feature_transport",
  },
];

const adminItems = [
  {
    title: "Admin Panel",
    url: "/admin",
    icon: Settings,
  },
  {
    title: "Member Invites",
    url: "/admin/member-invites",
    icon: Users2,
  },
];

const superAdminItems = [
  {
    title: "Platform Guide",
    url: "/super-admin/guide",
    icon: BookOpen,
  },
  {
    title: "Local Churches",
    url: "/super-admin/churches",
    icon: Building2,
  },
  {
    title: "Leadership Invites",
    url: "/super-admin/leadership-invites",
    icon: KeyRound,
  },
  {
    title: "Feature Flags & Matrix",
    url: "/super-admin/settings",
    icon: LucideSettings,
  },
  {
    title: "Security Audit Logs",
    url: "/super-admin/audit-logs",
    icon: ShieldAlert,
  },
];

const executiveItems = [
  {
    title: "360° Member Dossier",
    url: "/general-overseer/dossier",
    icon: Sparkles,
  },
  {
    title: "Executive Analytics",
    url: "/analytics/executive",
    icon: BarChart3,
  },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { isFeatureEnabled } = useFeatureFlag() as { isFeatureEnabled: (key?: string, def?: boolean) => boolean };

  const membershipEnabled = isFeatureEnabled("feature_membership_team", true);
  const infoCenterEnabled = isFeatureEnabled("feature_info_center", true);
  const adminPanelEnabled = isFeatureEnabled("feature_admin_panel", true);

  const visibleMenuItems = menuItems.filter(item => {
    if (!item.flagKey) return true;
    return isFeatureEnabled(item.flagKey, true);
  });

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isExecutive = ['super_admin', 'church_admin', 'resident_pastor', 'general_overseer'].some(r => userRoles.includes(r));
  const userTeamName = ((user as any)?.team_name || user?.teamName || '').toLowerCase();

  const isMembershipMember = isExecutive || 
    userTeamName.includes('membership') || 
    userRoles.includes('team_lead') || 
    userRoles.includes('steward');

  const isInfoCenterMember = isExecutive || 
    userTeamName.includes('info') || 
    userTeamName.includes('information') || 
    userRoles.includes('team_lead') || 
    userRoles.includes('steward');

  const isAdminPanelVisible = adminPanelEnabled && (isExecutive || ['super_admin', 'church_admin'].some(r => userRoles.includes(r)));

  return (
    <Sidebar className="border-r glass-card">
      <SidebarHeader className={`p-2 md:p-4 ${isCollapsed ? 'px-2' : 'px-4 md:px-6'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 md:gap-3'}`}>
          <div className="w-6 h-6 md:w-8 md:h-8 lg:w-12 lg:h-12 flex items-center justify-center">
            <img 
              src="/logo-design.png" 
              alt="Soul Bank Logo" 
              className="w-6 h-6 md:w-8 md:h-8 lg:w-12 lg:h-12 object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="hidden sm:block">
              <h2 className="font-bold text-sm md:text-base lg:text-lg text-primary">Heritage MMC</h2>
              <p className="text-xs md:text-sm text-muted-foreground">Member Management Console</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1 md:px-2 lg:px-4">
        {visibleMenuItems.length > 0 && (
          <SidebarGroup className="border-[0.75px] border-primary/30 rounded-xl p-1.5 mb-3 bg-card/30">
            <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>Main Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url} className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                        <item.icon className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                        {!isCollapsed && <span className="text-xs">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdminPanelVisible && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup className="border-[0.75px] border-primary/30 rounded-xl p-1.5 mb-3 bg-card/30">
              <SidebarGroupLabel asChild className={isCollapsed ? "sr-only" : "cursor-pointer"}>
                <CollapsibleTrigger className="flex items-center w-full">
                  <span>Administration</span>
                  <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                          <Link to={item.url} className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                            <item.icon className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                            {!isCollapsed && <span className="text-xs">{item.title}</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Membership Team Capabilities */}
        {membershipEnabled && isMembershipMember && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup className="border-[0.75px] border-primary/30 rounded-xl p-1.5 mb-3 bg-card/30">
              <SidebarGroupLabel asChild className={isCollapsed ? "sr-only" : "cursor-pointer"}>
                <CollapsibleTrigger className="flex items-center w-full">
                  <span>Membership Team</span>
                  <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/teams/membership/guide"}>
                        <Link to="/teams/membership/guide" className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                          <BookOpen className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-xs">Team Guide</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/teams/membership"}>
                        <Link to="/teams/membership" className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                          <Home className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-xs">Dashboard</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/teams/membership/members"}>
                        <Link to="/teams/membership/members" className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                          <Users2 className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-xs">Members CRM</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/teams/membership/birthdays"}>
                        <Link to="/teams/membership/birthdays" className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                          <Cake className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-xs">Birthday Tracker</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/teams/membership/anniversaries"}>
                        <Link to="/teams/membership/anniversaries" className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                          <Heart className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-xs">Anniversary Tracker</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/teams/membership/journey"}>
                        <Link to="/teams/membership/journey" className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                          <Trophy className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-xs">Member Journey</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/teams/membership/profiling-queue"}>
                        <Link to="/teams/membership/profiling-queue" className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                          <UserCheck className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-xs">Profiling Queue</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Information Center Capabilities */}
        {infoCenterEnabled && isInfoCenterMember && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup className="border-[0.75px] border-primary/30 rounded-xl p-1.5 mb-3 bg-card/30">
              <SidebarGroupLabel asChild className={isCollapsed ? "sr-only" : "cursor-pointer"}>
                <CollapsibleTrigger className="flex items-center w-full">
                  <span>Information Center</span>
                  <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/teams/info-center/guide"}>
                        <Link to="/teams/info-center/guide" className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                          <BookOpen className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-xs">Team Guide</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/teams/info-center"}>
                        <Link to="/teams/info-center" className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                          <Home className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-xs">Dashboard</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/teams/info-center/members"}>
                        <Link to="/teams/info-center/members" className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                          <Users2 className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-xs">Member Directory</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/teams/info-center/journey"}>
                        <Link to="/teams/info-center/journey" className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                          <Trophy className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-xs">Member Journey</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/teams/info-center/new-visitor"}>
                        <Link to="/teams/info-center/new-visitor" className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                          <UserPlus className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-xs">New Visitor</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/teams/info-center/attendance"}>
                        <Link to="/teams/info-center/attendance" className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                          <ClipboardList className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-xs">Attendance</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location.pathname === "/teams/info-center/foundation-class"}>
                        <Link to="/teams/info-center/foundation-class" className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                          <GraduationCap className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-xs">Foundation Class</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Universal Intelligence & Executive Analytics (GO, Super Admin, Resident Pastor, Church Admin) */}
        {['super_admin', 'general_overseer', 'resident_pastor', 'church_admin'].includes(user?.role || '') && (
          <SidebarGroup className="border-[0.75px] border-primary/30 rounded-xl p-1.5 mb-3 bg-card/30">
            <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>Executive Intelligence</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {executiveItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url} className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                        <item.icon className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0 text-amber-500" />
                        {!isCollapsed && <span className="text-xs">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Super Administration (Platform Level Multi-Branch & Governance) */}
        {user?.role === 'super_admin' && (
          <SidebarGroup className="border-[0.75px] border-primary/30 rounded-xl p-1.5 mb-3 bg-card/30">
            <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>Super Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                      <Link to={item.url} className="flex items-center gap-1 md:gap-2 lg:gap-3 px-1 md:px-2 lg:px-3 py-2">
                        <item.icon className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                        {!isCollapsed && <span className="text-xs">{item.title}</span>}
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
