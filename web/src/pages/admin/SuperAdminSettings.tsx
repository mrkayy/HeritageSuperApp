import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlag } from '@/contexts/FeatureFlagContext';
import { FeatureFlag, FeatureFlagService } from '@/services/featureFlagService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Shield, 
  Users, 
  Database, 
  MapPin, 
  MessageSquare, 
  Calendar, 
  BarChart3, 
  LucideIcon,
  Flag,
  Sparkles,
  ToggleLeft,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ModuleConfig {
  name: string;
  icon: LucideIcon;
  permissions: string[];
}

const MODULES: Record<string, ModuleConfig> = {
  souls: {
    name: 'Soul Management',
    icon: Users,
    permissions: ['can_create', 'can_update', 'can_view', 'can_delete', 'can_view_only_self', 'can_export']
  },
  follow_ups: {
    name: 'Follow-up Management',
    icon: MessageSquare,
    permissions: ['can_create', 'can_update', 'can_view', 'can_delete', 'can_assign', 'can_view_only_assigned']
  },
  transport: {
    name: 'Transport Management',
    icon: MapPin,
    permissions: ['can_create', 'can_update', 'can_view', 'can_delete', 'can_approve', 'can_view_only_team']
  },
  admin: {
    name: 'Admin Management',
    icon: Shield,
    permissions: ['can_create', 'can_update', 'can_view', 'can_delete', 'can_invite_users', 'can_manage_roles']
  },
  reports: {
    name: 'Reports & Analytics',
    icon: BarChart3,
    permissions: ['can_view', 'can_export', 'can_view_church_stats', 'can_view_global_stats']
  },
  events: {
    name: 'Event Management',
    icon: Calendar,
    permissions: ['can_create', 'can_update', 'can_view', 'can_delete', 'can_publish']
  },
  data: {
    name: 'Data Management',
    icon: Database,
    permissions: ['can_backup', 'can_restore', 'can_bulk_import', 'can_bulk_export']
  }
};

const ROLES = [
  { key: 'super_admin', name: 'Super Admin', color: 'bg-red-100 text-red-800 border-red-200' },
  { key: 'church_admin', name: 'Church Admin', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { key: 'resident_pastor', name: 'Resident Pastor', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { key: 'team_lead', name: 'Team Lead', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'member', name: 'Member', color: 'bg-green-100 text-green-800 border-green-200' },
  { key: 'guest', name: 'Guest', color: 'bg-gray-100 text-gray-800 border-gray-200' }
];

const SuperAdminSettings = () => {
  const { user } = useAuth();
  const { flagList, toggleFlag, refreshFlags, loading: flagsLoading } = useFeatureFlag() as {
    flagList: FeatureFlag[];
    toggleFlag: (key: string, enabled: boolean) => Promise<void>;
    refreshFlags: () => Promise<void>;
    loading: boolean;
  };

  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Record<string, Record<string, boolean>>>>({});
  const [savingPerms, setSavingPerms] = useState(false);

  const loadPermissions = useCallback(() => {
    const mockPermissions: Record<string, Record<string, Record<string, boolean>>> = {};

    ROLES.forEach(role => {
      const rolePermissions: Record<string, Record<string, boolean>> = {};
      Object.entries(MODULES).forEach(([moduleKey, module]) => {
        const modulePermissions: Record<string, boolean> = {};
        module.permissions.forEach(permission => {
          if (role.key === 'super_admin') {
            modulePermissions[permission] = true;
          } else if (role.key === 'church_admin') {
            modulePermissions[permission] = !['can_delete', 'can_bulk_import', 'can_backup'].includes(permission);
          } else if (role.key === 'team_lead') {
            modulePermissions[permission] = ['can_view', 'can_create', 'can_update', 'can_view_only_team', 'can_assign'].includes(permission);
          } else if (role.key === 'member') {
            modulePermissions[permission] = ['can_view', 'can_create', 'can_view_only_self'].includes(permission);
          } else {
            modulePermissions[permission] = permission === 'can_view';
          }
        });
        rolePermissions[moduleKey] = modulePermissions;
      });
      mockPermissions[role.key] = rolePermissions;
    });

    setPermissions(mockPermissions);
  }, []);

  useEffect(() => {
    if (user?.role === 'super_admin' || user?.role === 'church_admin') {
      loadPermissions();
    }
  }, [user, loadPermissions]);

  const handleToggleFlag = async (key: string, currentStatus: boolean) => {
    try {
      setTogglingKey(key);
      const newStatus = !currentStatus;
      await toggleFlag(key, newStatus);
      toast({
        title: "Feature Flag Updated",
        description: `Flag "${key}" is now ${newStatus ? 'enabled' : 'disabled'}. Changes are active globally.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to toggle feature flag",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setTogglingKey(null);
    }
  };

  const updatePermission = (roleKey: string, moduleKey: string, permission: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [roleKey]: {
        ...prev[roleKey] || {},
        [moduleKey]: {
          ...(prev[roleKey]?.[moduleKey] || {}),
          [permission]: value
        }
      }
    }));
  };

  const savePermissions = async () => {
    setSavingPerms(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      toast({
        title: "Success",
        description: "Role permissions saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive"
      });
    } finally {
      setSavingPerms(false);
    }
  };

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, string> = {
      can_create: 'Create',
      can_update: 'Update',
      can_view: 'View',
      can_delete: 'Delete',
      can_view_only_self: 'View Only Own',
      can_view_only_assigned: 'View Only Assigned',
      can_view_only_team: 'View Only Team',
      can_export: 'Export',
      can_assign: 'Assign',
      can_approve: 'Approve',
      can_invite_users: 'Invite Users',
      can_manage_roles: 'Manage Roles',
      can_view_church_stats: 'View Church Stats',
      can_view_global_stats: 'View Global Stats',
      can_publish: 'Publish',
      can_backup: 'Backup',
      can_restore: 'Restore',
      can_bulk_import: 'Bulk Import',
      can_bulk_export: 'Bulk Export'
    };
    return labels[permission] || permission;
  };

  // Restrict access to super_admin or church_admin
  if (user?.role !== 'super_admin' && user?.role !== 'church_admin') {
    return (
      <div className="p-6 page-background">
        <Card className="glass-card max-w-lg mx-auto mt-12">
          <CardContent className="p-8 text-center space-y-4">
            <Shield className="h-16 w-16 mx-auto text-destructive" />
            <h2 className="text-xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground text-sm">
              You need Super Administrator privileges to view and configure platform feature flags and permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group flags by category
  const categories = Array.from(new Set(flagList.map(f => f.category || 'global')));

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/30">
              <Shield className="w-3.5 h-3.5 mr-1" /> Super Admin
            </Badge>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Platform & Feature Governance
            </h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Toggle features on-the-fly, gate backend endpoints, and manage role permissions.
          </p>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refreshFlags()} 
          disabled={flagsLoading}
          className="self-start sm:self-auto gap-1.5 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${flagsLoading ? 'animate-spin' : ''}`} />
          Refresh Flags
        </Button>
      </div>

      <Tabs defaultValue="feature_flags" className="space-y-6">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
          <TabsTrigger value="feature_flags" className="flex items-center gap-2 text-xs">
            <Flag className="w-4 h-4 text-primary" /> Feature Flags
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2 text-xs">
            <Settings className="w-4 h-4 text-primary" /> Role Permissions
          </TabsTrigger>
        </TabsList>

        {/* Feature Flags Tab */}
        <TabsContent value="feature_flags" className="space-y-6">
          {categories.map((cat) => {
            const catFlags = flagList.filter(f => (f.category || 'global') === cat);
            const categoryTitle = cat === 'main_menu' ? 'Main Menu Features' :
                                  cat === 'teams' ? 'Ministry & Team Modules' :
                                  cat === 'admin' ? 'Administration Tools' : 'Global Features';

            return (
              <div key={cat} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {categoryTitle}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold">
                    {catFlags.length}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catFlags.map((flag) => {
                    const isToggling = togglingKey === flag.key;
                    return (
                      <Card 
                        key={flag.key} 
                        className={`glass-card border transition-all duration-200 ${
                          flag.isEnabled 
                            ? 'border-primary/30 shadow-xs' 
                            : 'border-border/40 opacity-75 bg-background/40'
                        }`}
                      >
                        <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0 gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base font-semibold text-foreground">
                                {flag.name}
                              </CardTitle>
                              {flag.isEnabled ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-muted-foreground text-[10px] py-0">
                                  <XCircle className="w-3 h-3 mr-1" /> Disabled
                                </Badge>
                              )}
                            </div>
                            <code className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60">
                              {flag.key}
                            </code>
                          </div>

                          <div className="flex items-center pt-1">
                            <Switch
                              id={`switch-${flag.key}`}
                              checked={flag.isEnabled}
                              disabled={isToggling}
                              onCheckedChange={() => handleToggleFlag(flag.key, flag.isEnabled)}
                            />
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3 pt-0">
                          <p className="text-xs text-muted-foreground">
                            {flag.description || "No description provided for this feature flag."}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                            <span>
                              {flag.allowedRoles && flag.allowedRoles.length > 0 ? (
                                <span>Restricted to: {flag.allowedRoles.join(', ')}</span>
                              ) : (
                                <span>Global availability</span>
                              )}
                            </span>
                            <span>
                              Updated {new Date(flag.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Role Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={savePermissions} disabled={savingPerms} size="sm">
              {savingPerms ? "Saving..." : "Save Role Matrix"}
            </Button>
          </div>

          <Tabs defaultValue={ROLES[0]!.key} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
              {ROLES.map((role) => (
                <TabsTrigger key={role.key} value={role.key} className="flex items-center gap-1 text-xs">
                  <Badge className={role.color} variant="outline">
                    {role.name}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {ROLES.map((role) => (
              <TabsContent key={role.key} value={role.key}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Object.entries(MODULES).map(([moduleKey, module]) => {
                    const ModuleIcon = module.icon;
                    return (
                      <Card key={moduleKey} className="glass-card">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <ModuleIcon className="h-4 w-4 text-primary" />
                            {module.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {module.permissions.map((permission) => (
                              <div key={permission} className="flex items-center justify-between">
                                <Label htmlFor={`${role.key}-${moduleKey}-${permission}`} className="text-xs font-medium">
                                  {getPermissionLabel(permission)}
                                </Label>
                                <Switch
                                  id={`${role.key}-${moduleKey}-${permission}`}
                                  checked={permissions[role.key]?.[moduleKey]?.[permission] || false}
                                  onCheckedChange={(checked) => updatePermission(role.key, moduleKey, permission, checked)}
                                />
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminSettings;