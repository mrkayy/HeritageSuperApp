import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  BookOpen,
  Shield,
  Building2,
  KeyRound,
  Settings,
  ShieldAlert,
  Users,
  Flag,
  Sparkles,
  BarChart3,
  Heart,
  MessageSquare,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lightbulb,
  Lock,
  Activity,
  Eye,
  Layers,
  ChevronRight,
  Rocket,
  Target,
  Zap,
  Globe,
  UserCheck,
  Database,
  ClipboardList,
} from 'lucide-react';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  priority: 'critical' | 'important' | 'recommended';
  navigateTo?: string;
  content: React.ReactNode;
}

export default function SuperAdminGuide() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sa-guide-completed');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">This guide is only available to Super Administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      localStorage.setItem('sa-guide-completed', JSON.stringify([...next]));
      return next;
    });
  };

  const priorityConfig = {
    critical: { label: 'Do First', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
    important: { label: 'Important', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
    recommended: { label: 'Recommended', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  };

  const steps: GuideStep[] = [
    {
      id: 'system-settings',
      title: 'Configure System Settings',
      description: 'Set your organization name, security policies, and communication preferences.',
      icon: Settings,
      priority: 'critical',
      navigateTo: '/super-admin/settings',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            System Settings is your platform control center. Navigate to <strong>Feature Flags & Matrix</strong> in the sidebar, then select the <strong>General Config</strong> tab.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Globe}
              title="Organization Identity"
              items={[
                'Set your Ministry/Organization Name (appears across the platform)',
                'Add your Website URL, Support Email, and Support Phone',
                'Configure Timezone, Date Format, and Default Language',
              ]}
            />
            <StepDetail
              icon={Lock}
              title="Security Policies"
              items={[
                'Session Timeout: how long before idle users are logged out (default: 60 min)',
                'Max PIN Attempts before lockout (default: 5)',
                'PIN Lockout Duration (default: 15 min)',
                'Magic Link Expiry for leadership invites (default: 72 hours)',
                'Toggle "Enforce Security PIN Setup" for all users',
              ]}
            />
            <StepDetail
              icon={Activity}
              title="Ministry Operations"
              items={[
                'Foundation Class Min Attendance: classes required before membership (default: 2)',
                'Follow-up SLA Days: deadline for follow-up actions (default: 3 days)',
                'Auto-Archive Inactive Months: auto-archive dormant members (default: 6 months)',
              ]}
            />
            <StepDetail
              icon={MessageSquare}
              title="Communication"
              items={[
                'Email Sender Name & Address for outbound notifications',
                'SMS Gateway toggle and Sender ID configuration',
              ]}
            />
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Maintenance Mode:</strong> Toggling this on shows a banner to all users and may restrict platform access. Use only during planned maintenance windows.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'provision-branches',
      title: 'Provision Local Church Branches',
      description: 'Set up each physical church location as a branch on the platform.',
      icon: Building2,
      priority: 'critical',
      navigateTo: '/super-admin/churches',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Each church location operates as a branch with its own members, leaders, and data. Navigate to <strong>Local Churches</strong> in the sidebar.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Building2}
              title="What You Can Do"
              items={[
                'Provision New Branch: name, slug (URL identifier), address, city, state',
                'Appoint a Resident Pastor and Church Admin during creation',
                'Edit branch details (name, address, etc.) at any time',
                'Reassign Leadership: transfer Resident Pastor or Church Admin roles',
                'Archive/Restore: deactivate a branch without deleting its data',
              ]}
            />
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Tip:</strong> The platform comes pre-seeded with 7 branch locations. Review these and update them to match your actual church structure before inviting leaders.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'invite-leaders',
      title: 'Invite Leadership via Magic Links',
      description: 'Onboard Resident Pastors, Church Admins, and team leads with secure invite tokens.',
      icon: KeyRound,
      priority: 'critical',
      navigateTo: '/super-admin/leadership-invites',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Leadership invites generate a secure magic link (72-hour expiry) that the invited person uses to create their account with the assigned role. Navigate to <strong>Leadership Invites</strong>.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Users}
              title="Invitable Roles"
              items={[
                'Resident Pastor -- senior spiritual leader of a branch',
                'Church Admin -- administrative head of a branch',
                'Super Admin -- another platform-level administrator (global)',
                'General Overseer -- cross-branch executive oversight (global)',
                'Membership Team Lead -- head of membership operations at a branch',
                'Info Center Lead -- head of information center at a branch',
              ]}
            />
            <StepDetail
              icon={KeyRound}
              title="How It Works"
              items={[
                'Select the role and (for branch roles) assign a church',
                'Enter the invitee\'s name and email address',
                'A magic link token is generated -- copy it and send it to them',
                'They open the link to create their account with the pre-assigned role',
                'You can revoke pending invitations at any time',
                'Track status: Pending, Accepted & Active, or Expired',
              ]}
            />
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Security:</strong> Magic links expire after 72 hours. If an invite expires before use, revoke and re-issue. Never share links in public channels.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'feature-flags',
      title: 'Review & Configure Feature Flags',
      description: 'Control which modules and features are visible across the platform.',
      icon: Flag,
      priority: 'important',
      navigateTo: '/super-admin/settings',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Feature flags let you enable or disable entire modules globally. Navigate to <strong>Feature Flags & Matrix</strong> and select the <strong>Feature Flags</strong> tab.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Layers}
              title="Available Flags"
              items={[
                'Soul Winning & Registration -- soul capture and registration flow',
                'Soul Journal -- journaling and notes for discipleship',
                'Follow-Up Ministry -- follow-up task management',
                'Transport Coordination -- transport scheduling and logistics',
                'Ministry Leaderboard -- gamified ministry performance rankings',
                'Church Administration Panel -- admin panel access for church admins',
                'Membership Team Module -- membership CRM, birthdays, journey tracking',
                'Information Center Module -- visitor intake, attendance, foundation class',
              ]}
            />
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Strategy:</strong> All flags are enabled by default. Consider disabling modules you haven't trained your team on yet, then enabling them as teams are ready. This prevents confusion from unused features.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'role-permissions',
      title: 'Configure Role Permission Matrix',
      description: 'Fine-tune what each role can do across every module.',
      icon: Shield,
      priority: 'important',
      navigateTo: '/super-admin/settings',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Role Permission Matrix controls granular access across 7 modules. Navigate to <strong>Feature Flags & Matrix</strong> and select the <strong>Role Permissions</strong> tab.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Shield}
              title="Modules You Control"
              items={[
                'Souls -- create, update, view, delete, export soul records',
                'Follow-ups -- create, assign, approve, view follow-up tasks',
                'Transport -- create, approve, view transport requests',
                'Admin -- invite users, manage roles, view stats',
                'Reports -- publish, export, view church and global statistics',
                'Events -- create, update, delete, export event data',
                'Data -- bulk import, bulk export, backup, restore',
              ]}
            />
            <StepDetail
              icon={Users}
              title="Configurable Roles"
              items={[
                'General Overseer, Resident Pastor, Church Admin',
                'Team Lead, Steward, Member, Guest',
                'Super Admin permissions are always locked to full access',
              ]}
            />
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Sensitive Permissions:</strong> Be cautious with <code className="bg-amber-200/50 dark:bg-amber-800/50 px-1 rounded text-xs">can_backup</code>, <code className="bg-amber-200/50 dark:bg-amber-800/50 px-1 rounded text-xs">can_restore</code>, and <code className="bg-amber-200/50 dark:bg-amber-800/50 px-1 rounded text-xs">can_delete</code>. These are denied by default for roles below Super Admin. Only grant them if absolutely necessary.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'audit-logs',
      title: 'Understand the Security Audit Trail',
      description: 'Every privileged action is logged with an immutable, tamper-evident trail.',
      icon: ShieldAlert,
      priority: 'important',
      navigateTo: '/super-admin/audit-logs',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The audit log records every significant administrative action. Navigate to <strong>Security Audit Logs</strong> in the sidebar.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Eye}
              title="What Gets Logged"
              items={[
                'Branch operations: provision, update, archive, restore',
                'Leadership changes: reassign branch leadership',
                'Invitation events: invite leader, revoke invitation',
                'Settings changes: update system settings, update role permissions, update church settings',
              ]}
            />
            <StepDetail
              icon={ClipboardList}
              title="Each Log Entry Contains"
              items={[
                'Timestamp of the action',
                'Actor identity: name, email, and role',
                'Action type and target resource',
                'Description of what changed (diff)',
              ]}
            />
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Best Practice:</strong> Review the audit log weekly. Look for unexpected branch changes, permission modifications, or invitation activity. This is your accountability trail.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'executive-intelligence',
      title: 'Explore Executive Intelligence Tools',
      description: 'Access cross-branch analytics and 360-degree member dossiers.',
      icon: Sparkles,
      priority: 'recommended',
      navigateTo: '/general-overseer/dossier',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            As Super Admin, you have access to the same executive intelligence tools as the General Overseer. Find these under <strong>Executive Intelligence</strong> in the sidebar.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Sparkles}
              title="360-Degree Member Dossier"
              items={[
                'Search for any member across all branches',
                'View a complete profile: discipleship stage, follow-up history, attendance',
                'See the member\'s full journey timeline from first visit to current status',
                'Access situation reports (SitReps) compiled from all data sources',
              ]}
            />
            <StepDetail
              icon={BarChart3}
              title="Executive Analytics"
              items={[
                'Cross-branch KPI summary with key performance indicators',
                'Branch-by-branch performance comparison',
                'Trend analysis for soul winning, retention, and growth metrics',
              ]}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'admin-panel',
      title: 'Set Up Church Admin Operations',
      description: 'Manage churches, sectors, teams, member invites, and follow-up assignments.',
      icon: Settings,
      priority: 'recommended',
      navigateTo: '/admin',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Admin Panel is shared with Church Admins and provides operational management. Navigate to <strong>Administration</strong> in the sidebar.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Building2}
              title="Admin Panel Dashboard"
              items={[
                'Overview: churches, users, souls, and follow-ups at a glance',
                'Team performance rankings and weekly outreach metrics',
                'Recent activity feed and follow-up progress tracking',
              ]}
            />
            <StepDetail
              icon={Layers}
              title="Church Management (Admin > Management)"
              items={[
                'Create and manage Churches, Sectors, and Teams in three tabbed sections',
                'Assign users to teams and sectors',
                'Edit user roles across the platform',
              ]}
            />
            <StepDetail
              icon={Users}
              title="Member Invites"
              items={[
                'Full member directory with profile editing',
                'User roles table with inline role editing',
                'Different from Leadership Invites -- this is for regular members and workers',
              ]}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'team-modules',
      title: 'Review Team Module Capabilities',
      description: 'Understand the Membership Team and Information Center modules you oversee.',
      icon: Users,
      priority: 'recommended',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            As Super Admin, you have full visibility into all team modules. These appear in the sidebar under <strong>Membership Team</strong> and <strong>Information Center</strong>.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={UserCheck}
              title="Membership Team Module"
              items={[
                'Members CRM: central member relationship management',
                'Birthday & Anniversary Trackers: automated milestone tracking',
                'Member Journey: visualize each member\'s discipleship progression',
                'Profiling Queue: members awaiting profile completion and sector/team assignment',
              ]}
            />
            <StepDetail
              icon={ClipboardList}
              title="Information Center Module"
              items={[
                'Member Directory: searchable directory of all profiled members',
                'New Visitor intake with bulk CSV import support',
                'Attendance Tracking per service and event',
                'Foundation Class management for new believer onboarding',
              ]}
            />
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Delegation:</strong> While you can access everything, these modules are designed for team leads to manage day-to-day. Focus on setting up the right people via Leadership Invites and let them operate their modules.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'system-health',
      title: 'Monitor System Health',
      description: 'Check platform diagnostics, database status, and uptime.',
      icon: Activity,
      priority: 'recommended',
      navigateTo: '/super-admin/settings',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            System health diagnostics are available in <strong>Feature Flags & Matrix</strong> under the <strong>System Health</strong> tab.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Database}
              title="What You Can Monitor"
              items={[
                'Platform status: healthy or degraded',
                'PostgreSQL database connection health',
                'Server uptime since last restart',
                'Active feature flag count',
                'Total local churches, platform users, and profiled members',
                'Platform version and environment label',
              ]}
            />
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Tip:</strong> Check this tab periodically, especially after deploying updates or if users report issues. A degraded status may indicate a database connection problem.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const completedCount = steps.filter(s => completedSteps.has(s.id)).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  const criticalSteps = steps.filter(s => s.priority === 'critical');
  const importantSteps = steps.filter(s => s.priority === 'important');
  const recommendedSteps = steps.filter(s => s.priority === 'recommended');

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Platform Guide</h1>
            <p className="text-muted-foreground">
              Welcome, {user?.firstName}. Here is everything you need to set up and operate the Heritage MMC platform.
            </p>
          </div>
        </div>
      </div>

      {/* Progress Tracker */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Setup Progress</span>
            <span className="text-sm text-muted-foreground">{completedCount} of {steps.length} completed</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {progressPercent === 100 && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> All setup steps reviewed. You're ready to go.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Your Role Explained */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Your Role: Super Administrator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            As <strong>Super Admin</strong>, you hold the highest authority on the platform. You are the only role with access to the <strong>Super Administration</strong> section and have unrestricted permissions across every module.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Globe className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Platform Governance</p>
                <p className="text-xs text-muted-foreground">Provision branches, manage feature flags, configure system settings</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <KeyRound className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Access Control</p>
                <p className="text-xs text-muted-foreground">Invite leaders, assign roles, configure permissions per role</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Eye className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Full Visibility</p>
                <p className="text-xs text-muted-foreground">Audit logs, system health, executive analytics, all team modules</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Hierarchy Quick Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Role Hierarchy
          </CardTitle>
          <CardDescription>
            Who reports to whom -- and who can see what.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {[
              { role: 'Super Admin', scope: 'Global -- all branches, all modules, all settings', you: true },
              { role: 'General Overseer', scope: 'Global -- cross-branch executive intelligence, 360-degree dossiers' },
              { role: 'Resident Pastor', scope: 'Branch -- senior spiritual leadership of one branch' },
              { role: 'Church Admin', scope: 'Branch -- administrative head, manages members, sectors, teams' },
              { role: 'Sector Lead / Team Lead', scope: 'Sector or Team -- leads a specific sector or ministry team' },
              { role: 'Steward / Member', scope: 'Personal -- access to main menu features relevant to their service' },
              { role: 'First Timer / Guest', scope: 'Minimal -- limited access, early discipleship stage' },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-2.5 rounded-lg text-sm ${
                  item.you ? 'bg-primary/10 border border-primary/20' : i % 2 === 1 ? 'bg-muted/30' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {item.you && <Badge variant="default" className="text-[10px] px-1.5 py-0">You</Badge>}
                  <span className="font-medium whitespace-nowrap">{item.role}</span>
                </div>
                <span className="text-muted-foreground">{item.scope}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Setup Steps - Critical */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-semibold">Immediate Action Required</h2>
          <Badge className={priorityConfig.critical.color + ' border text-[10px]'}>{criticalSteps.length} steps</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Complete these before inviting anyone to the platform.
        </p>
        <Accordion type="multiple" className="space-y-2">
          {criticalSteps.map(step => (
            <GuideStepCard
              key={step.id}
              step={step}
              completed={completedSteps.has(step.id)}
              onToggle={() => toggleStep(step.id)}
              onNavigate={step.navigateTo ? () => navigate(step.navigateTo!) : undefined}
              priorityConfig={priorityConfig}
            />
          ))}
        </Accordion>
      </div>

      <Separator />

      {/* Setup Steps - Important */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold">Important Configuration</h2>
          <Badge className={priorityConfig.important.color + ' border text-[10px]'}>{importantSteps.length} steps</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Essential for a well-configured platform. Complete within your first week.
        </p>
        <Accordion type="multiple" className="space-y-2">
          {importantSteps.map(step => (
            <GuideStepCard
              key={step.id}
              step={step}
              completed={completedSteps.has(step.id)}
              onToggle={() => toggleStep(step.id)}
              onNavigate={step.navigateTo ? () => navigate(step.navigateTo!) : undefined}
              priorityConfig={priorityConfig}
            />
          ))}
        </Accordion>
      </div>

      <Separator />

      {/* Setup Steps - Recommended */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Explore & Familiarize</h2>
          <Badge className={priorityConfig.recommended.color + ' border text-[10px]'}>{recommendedSteps.length} steps</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Get to know the rest of the platform at your own pace.
        </p>
        <Accordion type="multiple" className="space-y-2">
          {recommendedSteps.map(step => (
            <GuideStepCard
              key={step.id}
              step={step}
              completed={completedSteps.has(step.id)}
              onToggle={() => toggleStep(step.id)}
              onNavigate={step.navigateTo ? () => navigate(step.navigateTo!) : undefined}
              priorityConfig={priorityConfig}
            />
          ))}
        </Accordion>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple">
            <AccordionItem value="faq-1">
              <AccordionTrigger className="text-sm">How do I change the default admin password?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                The platform is seeded with a default admin account (<code className="bg-muted px-1 rounded text-xs">admin@hofchurch.org</code>). Log in, navigate to your profile, and change your password immediately. This is the single most important security action you can take.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2">
              <AccordionTrigger className="text-sm">Can I have more than one Super Admin?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Yes. You can invite additional Super Admins via <strong>Leadership Invites</strong>. Super Admin is a global role -- it does not require a branch assignment. Keep this role limited to trusted platform administrators.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-3">
              <AccordionTrigger className="text-sm">What happens when I disable a feature flag?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Disabling a feature flag hides the corresponding module from the sidebar and blocks API access to its endpoints. Existing data is not deleted -- it becomes inaccessible until the flag is re-enabled. This is fully reversible.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-4">
              <AccordionTrigger className="text-sm">What is the difference between Leadership Invites and Member Invites?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                <strong>Leadership Invites</strong> (Super Administration section) generate magic links for executive and team lead roles -- Resident Pastor, Church Admin, Super Admin, General Overseer, and team leads. <strong>Member Invites</strong> (Administration section) manage regular platform users and their roles within the existing member directory.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-5">
              <AccordionTrigger className="text-sm">How do Branch Settings overrides work?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                In the <strong>Branch Settings</strong> tab of Feature Flags & Matrix, you can override specific system settings for individual church branches. For example, you can set a different Foundation Class minimum attendance requirement for a branch that's just getting started. Branch overrides take precedence over the global system setting.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pb-8">
        Your progress is saved locally. You can return to this guide anytime from the sidebar.
      </div>
    </div>
  );
}

function StepDetail({ icon: Icon, title, items }: { icon: React.ElementType; title: string; items: string[] }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <ul className="space-y-1 ml-6">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
            <ChevronRight className="h-3 w-3 mt-1 flex-shrink-0 text-muted-foreground/50" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuideStepCard({
  step,
  completed,
  onToggle,
  onNavigate,
  priorityConfig,
}: {
  step: GuideStep;
  completed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  priorityConfig: Record<string, { label: string; color: string }>;
}) {
  return (
    <AccordionItem value={step.id} className="border rounded-lg px-4 data-[state=open]:bg-muted/20">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center gap-3 text-left flex-1">
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              completed
                ? 'bg-green-600 border-green-600 text-white'
                : 'border-muted-foreground/30 hover:border-muted-foreground/60'
            }`}
          >
            {completed && <CheckCircle2 className="h-3.5 w-3.5" />}
          </button>
          <step.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <span className={`text-sm font-medium ${completed ? 'line-through text-muted-foreground' : ''}`}>
              {step.title}
            </span>
            <p className="text-xs text-muted-foreground truncate">{step.description}</p>
          </div>
          <Badge className={priorityConfig[step.priority].color + ' border text-[10px] ml-auto mr-2 whitespace-nowrap'}>
            {priorityConfig[step.priority].label}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        {step.content}
        {onNavigate && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onNavigate}>
            Go to {step.title.split(' ').slice(0, 3).join(' ')}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
