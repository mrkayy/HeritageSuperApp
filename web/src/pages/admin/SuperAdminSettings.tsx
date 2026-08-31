import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlag } from '@/contexts/FeatureFlagContext';
import { FeatureFlag } from '@/services/featureFlagService';
import { 
  SystemSettings, 
  SystemSettingsService, 
  RolePermissionsMatrix, 
  SystemDiagnostics,
  BranchSetting 
} from '@/services/systemSettingsService';
import { SuperAdminService, LocalChurchBranch } from '@/services/superAdminService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sliders,
  Activity,
  Lock,
  Building2,
  Mail,
  Smartphone,
  Globe,
  Clock,
  Save,
  RotateCcw,
  Server,
  AlertTriangle,
  Radio
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
  { key: 'super_admin', name: 'Super Admin', color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30' },
  { key: 'general_overseer', name: 'General Overseer', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  { key: 'resident_pastor', name: 'Resident Pastor', color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30' },
  { key: 'church_admin', name: 'Church Admin', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30' },
  { key: 'team_lead', name: 'Team Lead', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  { key: 'steward', name: 'Steward', color: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30' },
  { key: 'member', name: 'Member', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  { key: 'guest', name: 'Guest', color: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30' }
];

const SuperAdminSettings = () => {
  const { user } = useAuth();
  const { flagList, toggleFlag, refreshFlags, loading: flagsLoading } = useFeatureFlag() as {
    flagList: FeatureFlag[];
    toggleFlag: (key: string, enabled: boolean) => Promise<void>;
    refreshFlags: () => Promise<void>;
    loading: boolean;
  };

  // State: System Settings
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // State: Feature Flags Search
  const [flagFilter, setFlagFilter] = useState('');
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // State: Role Permissions Matrix
  const [permissions, setPermissions] = useState<Record<string, Record<string, Record<string, boolean>>>>({});
  const [activeRoleKey, setActiveRoleKey] = useState<string>('super_admin');
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  // State: Branch Overrides
  const [branches, setBranches] = useState<LocalChurchBranch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [branchSetting, setBranchSetting] = useState<BranchSetting | null>(null);
  const [loadingBranchSetting, setLoadingBranchSetting] = useState(false);
  const [savingBranchSetting, setSavingBranchSetting] = useState(false);

  // State: Diagnostics
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  // Initial Data Fetch
  const loadSystemSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const data = await SystemSettingsService.getSettings();
      setSettings(data);
    } catch (err: any) {
      toast({
        title: "Failed to load system settings",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadPermissions = useCallback(async () => {
    try {
      setLoadingPerms(true);
      const data = await SystemSettingsService.getRolePermissions();
      setPermissions(data.permissions || {});
    } catch (err: any) {
      toast({
        title: "Failed to load role permissions",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingPerms(false);
    }
  }, []);

  const loadDiagnostics = useCallback(async () => {
    try {
      setDiagnosticsLoading(true);
      const data = await SystemSettingsService.getDiagnostics();
      setDiagnostics(data);
    } catch (err: any) {
      toast({
        title: "Failed to load system diagnostics",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setDiagnosticsLoading(false);
    }
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      const data = await SuperAdminService.listBranches();
      setBranches(data);
      if (data.length > 0 && !selectedBranchId) {
        setSelectedBranchId(data[0]!.id);
      }
    } catch (err: any) {
      console.error("Failed to load branches", err);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadSystemSettings();
      loadPermissions();
      loadDiagnostics();
      loadBranches();
    }
  }, [user, loadSystemSettings, loadPermissions, loadDiagnostics, loadBranches]);

  useEffect(() => {
    if (selectedBranchId) {
      const fetchBranchSetting = async () => {
        try {
          setLoadingBranchSetting(true);
          const data = await SystemSettingsService.getChurchSettings(selectedBranchId);
          setBranchSetting(data);
        } catch (err: any) {
          console.error("Failed to load branch settings", err);
        } finally {
          setLoadingBranchSetting(false);
        }
      };
      fetchBranchSetting();
    }
  }, [selectedBranchId]);

  // Handlers: Feature Flags
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

  // Handlers: System Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSavingSettings(true);
      const updated = await SystemSettingsService.updateSettings({
        ministry_name: settings.ministry_name,
        support_email: settings.support_email,
        support_phone: settings.support_phone,
        website_url: settings.website_url,
        timezone: settings.timezone,
        date_format: settings.date_format,
        default_language: settings.default_language,
        session_timeout_minutes: Number(settings.session_timeout_minutes),
        max_pin_attempts: Number(settings.max_pin_attempts),
        pin_lockout_minutes: Number(settings.pin_lockout_minutes),
        magic_link_expiry_hours: Number(settings.magic_link_expiry_hours),
        enforce_pin_login: settings.enforce_pin_login,
        maintenance_mode: settings.maintenance_mode,
        maintenance_message: settings.maintenance_message,
        foundation_class_min_attendance: Number(settings.foundation_class_min_attendance),
        followup_sla_days: Number(settings.followup_sla_days),
        auto_archive_inactive_months: Number(settings.auto_archive_inactive_months),
        email_sender_name: settings.email_sender_name,
        email_sender_address: settings.email_sender_address,
        sms_enabled: settings.sms_enabled,
        sms_sender_id: settings.sms_sender_id,
      });
      setSettings(updated);
      toast({
        title: "Configuration Saved",
        description: "General system settings have been updated and logged to audit trail.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to save settings",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // Handlers: Permissions Matrix
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

  const handleSavePermissions = async () => {
    try {
      setSavingPerms(true);
      const res = await SystemSettingsService.updateRolePermissions(permissions);
      setPermissions(res.permissions);
      toast({
        title: "Role Matrix Updated",
        description: "Dynamic role permissions matrix saved successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to save permissions",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSavingPerms(false);
    }
  };

  // Handlers: Branch Settings
  const handleSaveBranchSetting = async () => {
    if (!selectedBranchId || !branchSetting) return;
    try {
      setSavingBranchSetting(true);
      const updated = await SystemSettingsService.updateChurchSettings(
        selectedBranchId, 
        branchSetting.foundation_class_min_attendance
      );
      setBranchSetting(updated);
      toast({
        title: "Branch Settings Saved",
        description: `Custom rules applied for selected church branch.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to update branch settings",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSavingBranchSetting(false);
    }
  };

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, string> = {
      can_create: 'Create Records',
      can_update: 'Update / Edit',
      can_view: 'View / Read Access',
      can_delete: 'Delete Records',
      can_view_only_self: 'View Only Self-Created',
      can_view_only_assigned: 'View Only Assigned',
      can_view_only_team: 'View Only Team Scope',
      can_export: 'Export Data (CSV / PDF)',
      can_assign: 'Assign Records / Tasks',
      can_approve: 'Approve Requests',
      can_invite_users: 'Invite Leaders / Members',
      can_manage_roles: 'Manage User Roles',
      can_view_church_stats: 'View Branch Analytics',
      can_view_global_stats: 'View Global Analytics',
      can_publish: 'Publish Events / Announcements',
      can_backup: 'Initiate Database Backup',
      can_restore: 'Restore Data Backups',
      can_bulk_import: 'Bulk Import Records',
      can_bulk_export: 'Bulk Export Operations'
    };
    return labels[permission] || permission.replace(/_/g, ' ');
  };

  // Restrict access strictly to super_admin
  if (user?.role !== 'super_admin') {
    return (
      <div className="p-6 page-background flex items-center justify-center min-h-[70vh]">
        <Card className="glass-card max-w-md w-full text-center p-8 space-y-4 border-destructive/30">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl font-bold">Access Restricted</CardTitle>
          <CardDescription>
            Super Administrator privileges are required to access platform governance, global configuration, and security parameters.
          </CardDescription>
        </Card>
      </div>
    );
  }

  // Filtered flag list
  const filteredFlags = flagList.filter(f => 
    f.name.toLowerCase().includes(flagFilter.toLowerCase()) || 
    f.key.toLowerCase().includes(flagFilter.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(flagFilter.toLowerCase()))
  );
  const categories = Array.from(new Set(filteredFlags.map(f => f.category || 'global')));

  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/40 bg-primary/5 px-2.5 py-0.5">
              <Shield className="w-3.5 h-3.5 mr-1" /> Super Admin Governance
            </Badge>
            <span className="text-xs text-muted-foreground">• Platform V2.4</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Platform Settings & System Governance
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Manage global platform configurations, dynamic feature flags, role permission matrices, and branch settings overrides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              refreshFlags();
              loadSystemSettings();
              loadPermissions();
              loadDiagnostics();
            }} 
            disabled={flagsLoading || settingsLoading || loadingPerms}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(flagsLoading || settingsLoading || loadingPerms) ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="system_config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/60 border border-border/40 rounded-xl gap-1">
          <TabsTrigger value="system_config" className="flex items-center gap-2 py-2.5 text-xs font-medium">
            <Settings className="w-4 h-4 text-primary" /> General Config
          </TabsTrigger>
          <TabsTrigger value="feature_flags" className="flex items-center gap-2 py-2.5 text-xs font-medium">
            <Flag className="w-4 h-4 text-primary" /> Feature Flags
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2 py-2.5 text-xs font-medium">
            <Sliders className="w-4 h-4 text-primary" /> Role Permissions
          </TabsTrigger>
          <TabsTrigger value="branch_overrides" className="flex items-center gap-2 py-2.5 text-xs font-medium">
            <Building2 className="w-4 h-4 text-primary" /> Branch Settings
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-2 py-2.5 text-xs font-medium">
            <Activity className="w-4 h-4 text-primary" /> System Health
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: General System Configuration */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="system_config" className="space-y-6">
          {settingsLoading && !settings ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" /> Loading platform configuration...
            </div>
          ) : settings ? (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Organization Profile Card */}
              <Card className="glass-card border border-border/50 shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base font-semibold">Organization & Ministry Profile</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Universal organization details used in emails, system headers, and platform footers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ministry_name" className="text-xs font-medium">Ministry / Organization Name</Label>
                    <Input 
                      id="ministry_name" 
                      value={settings.ministry_name} 
                      onChange={e => setSettings({ ...settings, ministry_name: e.target.value })}
                      placeholder="e.g. Heritage of Faith International Church"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="website_url" className="text-xs font-medium">Official Website URL</Label>
                    <Input 
                      id="website_url" 
                      value={settings.website_url} 
                      onChange={e => setSettings({ ...settings, website_url: e.target.value })}
                      placeholder="https://hofchurchng.org"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="support_email" className="text-xs font-medium">Platform Support Email</Label>
                    <Input 
                      id="support_email" 
                      type="email"
                      value={settings.support_email} 
                      onChange={e => setSettings({ ...settings, support_email: e.target.value })}
                      placeholder="support@hofchurchng.org"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="support_phone" className="text-xs font-medium">Support Hotline Phone</Label>
                    <Input 
                      id="support_phone" 
                      value={settings.support_phone} 
                      onChange={e => setSettings({ ...settings, support_phone: e.target.value })}
                      placeholder="+234 800 463 2487"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Localization & Region */}
              <Card className="glass-card border border-border/50 shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base font-semibold">Localization & Time</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Standard datetime formats, timezones, and system languages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="timezone" className="text-xs font-medium">Default Timezone</Label>
                    <Select 
                      value={settings.timezone} 
                      onValueChange={val => setSettings({ ...settings, timezone: val })}
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Select Timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Lagos">Africa/Lagos (GMT+1)</SelectItem>
                        <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT+0/+1)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="date_format" className="text-xs font-medium">Date Display Format</Label>
                    <Select 
                      value={settings.date_format} 
                      onValueChange={val => setSettings({ ...settings, date_format: val })}
                    >
                      <SelectTrigger id="date_format">
                        <SelectValue placeholder="Select Date Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (e.g. 31/08/2026)</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (e.g. 08/31/2026)</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="default_language" className="text-xs font-medium">Default Language</Label>
                    <Select 
                      value={settings.default_language} 
                      onValueChange={val => setSettings({ ...settings, default_language: val })}
                    >
                      <SelectTrigger id="default_language">
                        <SelectValue placeholder="Select Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English (Default)</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="yo">Yoruba</SelectItem>
                        <SelectItem value="ha">Hausa</SelectItem>
                        <SelectItem value="ig">Igbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Security & Authentication Policies */}
              <Card className="glass-card border border-border/50 shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base font-semibold">Security Policies & Quick-Login Safeguards</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Authentication rules, session expirations, Security PIN lockouts, and emergency maintenance controls.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="session_timeout" className="text-xs font-medium">Session Inactivity Timeout (Min)</Label>
                      <Input 
                        id="session_timeout" 
                        type="number"
                        min={15}
                        max={1440}
                        value={settings.session_timeout_minutes} 
                        onChange={e => setSettings({ ...settings, session_timeout_minutes: Number(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="max_pin_attempts" className="text-xs font-medium">Max Failed PIN Attempts</Label>
                      <Input 
                        id="max_pin_attempts" 
                        type="number"
                        min={3}
                        max={10}
                        value={settings.max_pin_attempts} 
                        onChange={e => setSettings({ ...settings, max_pin_attempts: Number(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pin_lockout" className="text-xs font-medium">PIN Lockout Duration (Min)</Label>
                      <Input 
                        id="pin_lockout" 
                        type="number"
                        min={5}
                        max={120}
                        value={settings.pin_lockout_minutes} 
                        onChange={e => setSettings({ ...settings, pin_lockout_minutes: Number(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="magic_link_expiry" className="text-xs font-medium">Magic Link Expiry (Hours)</Label>
                      <Input 
                        id="magic_link_expiry" 
                        type="number"
                        min={1}
                        max={168}
                        value={settings.magic_link_expiry_hours} 
                        onChange={e => setSettings({ ...settings, magic_link_expiry_hours: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/40 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/40">
                      <div className="space-y-0.5">
                        <Label htmlFor="enforce_pin" className="text-xs font-semibold">Enforce Security PIN Setup</Label>
                        <p className="text-[11px] text-muted-foreground">Force new users and profiled members to create a 4-6 digit PIN upon first login.</p>
                      </div>
                      <Switch 
                        id="enforce_pin" 
                        checked={settings.enforce_pin_login}
                        onCheckedChange={checked => setSettings({ ...settings, enforce_pin_login: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <Label htmlFor="maintenance_mode" className="text-xs font-semibold text-amber-900 dark:text-amber-300">System Maintenance Mode</Label>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Locks non-admin users and displays a maintenance banner across the app.</p>
                      </div>
                      <Switch 
                        id="maintenance_mode" 
                        checked={settings.maintenance_mode}
                        onCheckedChange={checked => setSettings({ ...settings, maintenance_mode: checked })}
                      />
                    </div>
                  </div>

                  {settings.maintenance_mode && (
                    <div className="space-y-1.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <Label htmlFor="maintenance_msg" className="text-xs font-medium text-amber-900 dark:text-amber-300">
                        Maintenance Alert Banner Message
                      </Label>
                      <Textarea 
                        id="maintenance_msg"
                        rows={2}
                        value={settings.maintenance_message}
                        onChange={e => setSettings({ ...settings, maintenance_message: e.target.value })}
                        placeholder="System undergoing scheduled maintenance..."
                        className="text-xs"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Membership & Discipleship Defaults */}
              <Card className="glass-card border border-border/50 shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base font-semibold">Membership & Discipleship Defaults</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Baseline thresholds for first-timers, foundation class qualifications, and follow-up SLAs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="foundation_min_att" className="text-xs font-medium">
                      Foundation Class Min Attendance
                    </Label>
                    <Input 
                      id="foundation_min_att" 
                      type="number"
                      min={1}
                      max={10}
                      value={settings.foundation_class_min_attendance}
                      onChange={e => setSettings({ ...settings, foundation_class_min_attendance: Number(e.target.value) })}
                    />
                    <p className="text-[10px] text-muted-foreground">Required service attendances before moving to Foundation Class.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="followup_sla" className="text-xs font-medium">
                      First-Timer Follow-up SLA (Days)
                    </Label>
                    <Input 
                      id="followup_sla" 
                      type="number"
                      min={1}
                      max={14}
                      value={settings.followup_sla_days}
                      onChange={e => setSettings({ ...settings, followup_sla_days: Number(e.target.value) })}
                    />
                    <p className="text-[10px] text-muted-foreground">Maximum days allowed to initiate first contact with visitors.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="auto_archive_months" className="text-xs font-medium">
                      Inactive Member Archive (Months)
                    </Label>
                    <Input 
                      id="auto_archive_months" 
                      type="number"
                      min={1}
                      max={36}
                      value={settings.auto_archive_inactive_months}
                      onChange={e => setSettings({ ...settings, auto_archive_inactive_months: Number(e.target.value) })}
                    />
                    <p className="text-[10px] text-muted-foreground">Mark member profile dormant if no attendance recorded.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Notification & Communication Channels */}
              <Card className="glass-card border border-border/50 shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base font-semibold">Notification & Dispatch Channels</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Sender identification and transport gateways for emails and SMS alerts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email_sender_name" className="text-xs font-medium">Email Sender Display Name</Label>
                    <Input 
                      id="email_sender_name" 
                      value={settings.email_sender_name} 
                      onChange={e => setSettings({ ...settings, email_sender_name: e.target.value })}
                      placeholder="HOF Church Admin"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email_sender_address" className="text-xs font-medium">Email Sender Address</Label>
                    <Input 
                      id="email_sender_address" 
                      type="email"
                      value={settings.email_sender_address} 
                      onChange={e => setSettings({ ...settings, email_sender_address: e.target.value })}
                      placeholder="no-reply@hofchurchng.org"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/40">
                    <div className="space-y-0.5">
                      <Label htmlFor="sms_toggle" className="text-xs font-semibold">Enable SMS Gateway</Label>
                      <p className="text-[11px] text-muted-foreground">Permit instant SMS dispatches for follow-ups and birthday greetings.</p>
                    </div>
                    <Switch 
                      id="sms_toggle" 
                      checked={settings.sms_enabled}
                      onCheckedChange={checked => setSettings({ ...settings, sms_enabled: checked })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sms_sender_id" className="text-xs font-medium">SMS Alphanumeric Sender ID</Label>
                    <Input 
                      id="sms_sender_id" 
                      maxLength={11}
                      value={settings.sms_sender_id} 
                      onChange={e => setSettings({ ...settings, sms_sender_id: e.target.value })}
                      placeholder="HOFCHURCH"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Bottom Sticky Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  Last saved: {settings.updated_at ? new Date(settings.updated_at).toLocaleString() : 'Never'}
                </span>
                <Button type="submit" disabled={savingSettings} className="gap-2">
                  <Save className="w-4 h-4" />
                  {savingSettings ? "Saving Configuration..." : "Save System Configuration"}
                </Button>
              </div>
            </form>
          ) : null}
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: Feature Flags & Modules */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="feature_flags" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Input 
                placeholder="Search feature flags by name or key..."
                value={flagFilter}
                onChange={e => setFlagFilter(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Total Flags: {flagList.length}</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Active: {flagList.filter(f => f.isEnabled).length}
              </span>
            </div>
          </div>

          {categories.length === 0 ? (
            <Card className="glass-card p-8 text-center text-muted-foreground text-sm">
              No feature flags found matching "{flagFilter}".
            </Card>
          ) : (
            categories.map((cat) => {
              const catFlags = filteredFlags.filter(f => (f.category || 'global') === cat);
              const categoryTitle = cat === 'main_menu' ? 'Main Navigation Features' :
                                    cat === 'teams' ? 'Ministry & Department Modules' :
                                    cat === 'admin' ? 'Administration & Security' : 'Global Platform Features';

              return (
                <div key={cat} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                                <CardTitle className="text-sm font-semibold text-foreground">
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
                              <code className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60">
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
                                  <span>Roles: {flag.allowedRoles.join(', ')}</span>
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
            })
          )}
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: Role & Permission Matrix */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="permissions" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 glass-card rounded-xl border border-border/40">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Dynamic Role Permission Matrix</h3>
              <p className="text-xs text-muted-foreground">
                Fine-tune capability toggles per role across each core application module.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm" 
                onClick={loadPermissions}
                disabled={loadingPerms}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
              <Button 
                onClick={handleSavePermissions} 
                disabled={savingPerms} 
                size="sm"
                className="gap-1.5 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {savingPerms ? "Saving..." : "Save Role Matrix"}
              </Button>
            </div>
          </div>

          {/* Role Selector Pills */}
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <button
                key={role.key}
                type="button"
                onClick={() => setActiveRoleKey(role.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 flex items-center gap-1.5 ${
                  activeRoleKey === role.key 
                    ? `${role.color} ring-2 ring-primary/40 shadow-xs` 
                    : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/80'
                }`}
              >
                <Shield className="w-3 h-3" />
                {role.name}
              </button>
            ))}
          </div>

          {/* Module Grid for Active Role */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(MODULES).map(([moduleKey, module]) => {
              const ModuleIcon = module.icon;
              return (
                <Card key={moduleKey} className="glass-card border border-border/50">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <ModuleIcon className="h-4 w-4 text-primary" />
                      {module.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {moduleKey}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2.5">
                      {module.permissions.map((permission) => {
                        const isChecked = permissions[activeRoleKey]?.[moduleKey]?.[permission] || false;
                        const isSuperAdmin = activeRoleKey === 'super_admin';
                        return (
                          <div 
                            key={permission} 
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                          >
                            <Label 
                              htmlFor={`${activeRoleKey}-${moduleKey}-${permission}`} 
                              className="text-xs font-medium cursor-pointer"
                            >
                              {getPermissionLabel(permission)}
                            </Label>
                            <Switch
                              id={`${activeRoleKey}-${moduleKey}-${permission}`}
                              checked={isChecked}
                              disabled={isSuperAdmin}
                              onCheckedChange={(checked) => updatePermission(activeRoleKey, moduleKey, permission, checked)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: Branch Settings Overrides */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="branch_overrides" className="space-y-6">
          <Card className="glass-card border border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Local Church Branch Specific Settings
              </CardTitle>
              <CardDescription className="text-xs">
                Override platform-wide discipleship requirements and configuration per local church branch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="branch_picker" className="text-xs font-medium">Select Local Church Branch</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger id="branch_picker" className="max-w-md">
                    <SelectValue placeholder="Choose a branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} ({branch.city || 'HQ'}, {branch.state || 'Lagos'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBranch && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Resident Pastor:</span>
                    <p className="font-semibold">{selectedBranch.resident_pastor_name || 'Unassigned'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Church Admin:</span>
                    <p className="font-semibold">{selectedBranch.church_admin_name || 'Unassigned'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={selectedBranch.is_active ? 'default' : 'secondary'} className="ml-2 text-[10px]">
                      {selectedBranch.is_active ? 'Active' : 'Archived'}
                    </Badge>
                  </div>
                </div>
              )}

              {loadingBranchSetting ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" /> Loading branch configurations...
                </div>
              ) : branchSetting ? (
                <div className="space-y-4 pt-2 border-t border-border/40">
                  <div className="max-w-md space-y-1.5">
                    <Label htmlFor="branch_fc_att" className="text-xs font-medium">
                      Foundation Class Min Attendance for {selectedBranch?.name || 'this branch'}
                    </Label>
                    <Input 
                      id="branch_fc_att"
                      type="number"
                      min={1}
                      max={10}
                      value={branchSetting.foundation_class_min_attendance}
                      onChange={e => setBranchSetting({
                        ...branchSetting,
                        foundation_class_min_attendance: Number(e.target.value)
                      })}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Visitors in this local church must attend at least this many times to appear in the profiling queue.
                    </p>
                  </div>

                  <Button 
                    onClick={handleSaveBranchSetting} 
                    disabled={savingBranchSetting} 
                    size="sm"
                    className="gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingBranchSetting ? "Saving..." : "Save Branch Override"}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: System Health & Diagnostics */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="diagnostics" className="space-y-6">
          {diagnosticsLoading && !diagnostics ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" /> Querying system health & telemetry...
            </div>
          ) : diagnostics ? (
            <div className="space-y-6">
              {/* Primary Health Pulse Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="glass-card border border-emerald-500/20 bg-emerald-500/5">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Platform Status
                    </CardDescription>
                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                      <Radio className="w-4 h-4 animate-pulse text-emerald-600" />
                      {diagnostics.status.toUpperCase()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-[11px] text-muted-foreground">
                    Version: {diagnostics.version} ({diagnostics.environment})
                  </CardContent>
                </Card>

                <Card className="glass-card border border-primary/20">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium">PostgreSQL Database</CardDescription>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary" />
                      {diagnostics.database_status === 'connected' ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Connected</span>
                      ) : (
                        <span className="text-amber-500">Degraded</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-[11px] text-muted-foreground">
                    All tables & ORM hooks active
                  </CardContent>
                </Card>

                <Card className="glass-card border border-border/50">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium">Server Uptime</CardDescription>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      {Math.floor(diagnostics.uptime_seconds / 3600)}h {Math.floor((diagnostics.uptime_seconds % 3600) / 60)}m
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-[11px] text-muted-foreground">
                    Server Time: {new Date(diagnostics.server_time).toLocaleTimeString()}
                  </CardContent>
                </Card>

                <Card className="glass-card border border-border/50">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium">Active Feature Flags</CardDescription>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Flag className="w-4 h-4 text-amber-500" />
                      {diagnostics.active_feature_flags} Enabled
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-[11px] text-muted-foreground">
                    Cached in memory & DB
                  </CardContent>
                </Card>
              </div>

              {/* Entity Inventory Overview */}
              <Card className="glass-card border border-border/50">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Server className="w-5 h-5 text-primary" />
                    Database Entity Metrics
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live record counts across core tenant schemas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                    <span className="text-xs text-muted-foreground">Total Local Churches</span>
                    <p className="text-2xl font-bold text-foreground">{diagnostics.total_churches}</p>
                    <span className="text-[10px] text-muted-foreground">Active branches in multi-tenant registry</span>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                    <span className="text-xs text-muted-foreground">Total Platform Users</span>
                    <p className="text-2xl font-bold text-foreground">{diagnostics.total_users}</p>
                    <span className="text-[10px] text-muted-foreground">Admins, Pastors, Leads, and Workers</span>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                    <span className="text-xs text-muted-foreground">Total Profiled Members</span>
                    <p className="text-2xl font-bold text-foreground">{diagnostics.total_members}</p>
                    <span className="text-[10px] text-muted-foreground">Indexed in universal membership CRM</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminSettings;