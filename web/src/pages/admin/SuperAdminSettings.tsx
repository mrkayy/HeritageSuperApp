
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Shield, Users, Database, MapPin, MessageSquare, Calendar, BarChart3, LucideIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ModuleConfig {
  name: string;
  icon: LucideIcon;
  permissions: string[];
}

// Define modules and their permissions
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
  { key: 'super_admin', name: 'Super Admin', color: 'bg-red-100 text-red-800' },
  { key: 'church_admin', name: 'Church Admin', color: 'bg-purple-100 text-purple-800' },
  { key: 'team_lead', name: 'Team Lead', color: 'bg-blue-100 text-blue-800' },
  { key: 'member', name: 'Member', color: 'bg-green-100 text-green-800' },
  { key: 'guest', name: 'Guest', color: 'bg-gray-100 text-gray-800' }
];

const SuperAdminSettings = () => {
  const { user } = useAuthStore();
  const [permissions, setPermissions] = useState<Record<string, Record<string, Record<string, boolean>>>>({});
  const [loading, setLoading] = useState(false);

  const loadPermissions = useCallback(() => {
    // Mock data - in real app this would come from a permissions table
    const mockPermissions: Record<string, Record<string, Record<string, boolean>>> = {};

    ROLES.forEach(role => {
      const rolePermissions: Record<string, Record<string, boolean>> = {};
      Object.entries(MODULES).forEach(([moduleKey, module]) => {
        const modulePermissions: Record<string, boolean> = {};
        module.permissions.forEach(permission => {
          // Set default permissions based on role
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
  }, []); // MODULES and ROLES are stable constants outside the component

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadPermissions();
    }
  }, [user, loadPermissions]);

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
    setLoading(true);
    try {
      // Mock save - in real app this would save to database
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  // Redirect non-super-admin users
  if (user?.role !== 'super_admin') {
    return (
      <div className="p-6 page-background">
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have Super Admin permissions to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 page-background space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Role Permissions Settings
          </h1>
          <p className="text-muted-foreground">Configure what each role can do in the application</p>
        </div>

        <Button onClick={savePermissions} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue={ROLES[0]!.key} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          {ROLES.map((role) => (
            <TabsTrigger key={role.key} value={role.key} className="flex items-center gap-2">
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
                      <CardTitle className="flex items-center gap-2">
                        <ModuleIcon className="h-5 w-5" />
                        {module.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {module.permissions.map((permission) => (
                          <div key={permission} className="flex items-center justify-between">
                            <Label htmlFor={`${role.key}-${moduleKey}-${permission}`} className="text-sm font-medium">
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
    </div>
  );
};

export default SuperAdminSettings;