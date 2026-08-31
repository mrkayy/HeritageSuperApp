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
  Users,
  UserCheck,
  Cake,
  Heart,
  Trophy,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lightbulb,
  Lock,
  ChevronRight,
  Rocket,
  Target,
  Zap,
  Eye,
  Layers,
  Search,
  Edit3,
  Trash2,
  Upload,
  Phone,
  MessageSquare,
  BarChart3,
  FileSpreadsheet,
  ArrowDownUp,
  UserPlus,
  Shield,
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

const ALLOWED_ROLES = ['super_admin', 'church_admin', 'resident_pastor', 'team_lead', 'membership_team_lead', 'membership_assistant_team_lead'];

export default function MembershipTeamGuide() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('mt-guide-completed');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const hasAccess = ALLOWED_ROLES.includes(user?.role || '') ||
    (user?.role === 'team_lead' && user?.teamName?.toLowerCase().includes('membership'));

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">This guide is available to Membership Team leads, Church Admins, Resident Pastors, and Super Admins.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      localStorage.setItem('mt-guide-completed', JSON.stringify([...next]));
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
      id: 'understand-dashboard',
      title: 'Get Oriented with the Dashboard',
      description: 'Your command center showing member stats, birthdays, anniversaries, and growth trends.',
      icon: BarChart3,
      priority: 'critical',
      navigateTo: '/teams/membership',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Membership Dashboard is your home base. It gives you an at-a-glance view of everything happening in your team.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={BarChart3}
              title="KPI Cards (Top Row)"
              items={[
                'Total Members -- count of all profiled members in the directory',
                'Birthdays This Month -- members celebrating birthdays, links to the Birthday Tracker',
                'Anniversaries This Month -- members celebrating wedding anniversaries, links to the Anniversary Tracker',
                'New Members (30 Days) -- recently added members to watch and welcome',
              ]}
            />
            <StepDetail
              icon={Layers}
              title="Membership Funnel Chart"
              items={[
                'Bar chart comparing current vs. previous month member counts by stage',
                'Stages tracked: First Time Guest through Stewardship',
                'Helps you spot bottlenecks in the discipleship pipeline',
              ]}
            />
            <StepDetail
              icon={Cake}
              title="Monthly Highlights"
              items={[
                'Up to 3 upcoming birthday and anniversary celebrants displayed',
                'Quick links to the full Birthday and Anniversary tracker pages',
              ]}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'members-crm',
      title: 'Master the Members CRM',
      description: 'Add, edit, search, and manage your full member directory.',
      icon: Users,
      priority: 'critical',
      navigateTo: '/teams/membership/members',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Members CRM is your primary workspace for managing every member record. Navigate to <strong>Members CRM</strong> in the sidebar.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Search}
              title="Finding Members"
              items={[
                'Search by name, email, or phone number using the search bar',
                'Filter by growth stage using the dropdown (e.g., show only "Foundation Class" members)',
                'Use Refresh to reload data after changes',
              ]}
            />
            <StepDetail
              icon={UserPlus}
              title="Adding a Member"
              items={[
                'Click "Add Member" to open the member form',
                'Tab 1 -- Basic Info: First Name, Surname, Email, Phone, Stage, Gender',
                'Tab 2 -- Birth & Anniversary: Birth day/month, Anniversary day/month, Marital Status',
                'Tab 3 -- Contact & Medical: Home Address, Occupation, Emergency Contact',
                'First Name and Surname are required; all other fields are optional',
              ]}
            />
            <StepDetail
              icon={Edit3}
              title="Editing & Deleting"
              items={[
                'Click the pencil icon on any row to edit that member\'s details',
                'Click the trash icon to delete -- this removes the member, their stage history, team assignments, and linked user account',
                'Manage Family/Guardians: link parent/guardian/sibling relationships between members',
              ]}
            />
            <StepDetail
              icon={FileSpreadsheet}
              title="Bulk CSV Upload"
              items={[
                'Click "Bulk CSV Upload" to import many members at once',
                '3-step wizard: Upload CSV, Preview & Edit in-browser, Review results',
                'Smart header detection -- matches columns like "First Name", "Phone", "DOB", "Anniversary"',
                'Duplicate handling -- members with the same email are updated, not duplicated',
              ]}
            />
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Caution:</strong> Deleting a member is permanent and cascades to their user account, stage history, team memberships, and guardian relationships. Double-check before confirming.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'profiling-queue',
      title: 'Process the Profiling Queue',
      description: 'Convert visitors from the Information Center into full church members.',
      icon: ClipboardList,
      priority: 'critical',
      navigateTo: '/teams/membership/profiling-queue',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Profiling Queue is where visitors become members. When the Information Center recommends a visitor for foundation class, a task appears here for you to action.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={ArrowDownUp}
              title="How the Pipeline Works"
              items={[
                '1. Info Center registers a first-time visitor',
                '2. Visitor attends services, visit count grows',
                '3. Info Center worker recommends them for Foundation Class',
                '4. A profiling task appears in YOUR queue with all their details',
                '5. You review and click "Convert to Member" to create their member record',
              ]}
            />
            <StepDetail
              icon={UserCheck}
              title="What Happens on Conversion"
              items={[
                'A member record is created with their visitor details (name, phone, gender, address)',
                'Stage is set to "Foundation Class" automatically',
                'Role is set to "Member"',
                'The visitor is marked as "Profiled" in the Info Center',
                'The profiling task is marked as completed',
              ]}
            />
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Best Practice:</strong> Check the Profiling Queue at least once a week. Visitors waiting too long to be profiled may disengage. The pending count badge on the page tells you how many are waiting.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'member-journey',
      title: 'Track the Member Journey Pipeline',
      description: 'Visualize and manage member progression through 9 growth stages.',
      icon: Trophy,
      priority: 'important',
      navigateTo: '/teams/membership/journey',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Member Journey is a pipeline view of where every member stands in their discipleship path. Navigate to <strong>Member Journey</strong> in the sidebar.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Layers}
              title="The 9 Growth Stages"
              items={[
                '1. First Time Guest -- brand new to the church',
                '2. Foundation Class -- attending foundational teaching',
                '3. Sunday School Module 1, 2, 3 -- progressive teaching series',
                '4. Membership Class -- formal membership preparation',
                '5. Stewardship -- active service and giving',
                '6. MIT (Minister In Training) -- leadership development',
                '7. Resident Pastor -- highest discipleship level',
              ]}
            />
            <StepDetail
              icon={Eye}
              title="What You Can Do"
              items={[
                'See member counts at each stage in the card grid',
                'Click "View Directory" on any stage to see the members at that stage',
                'Search within a stage by name',
                'Move a member to a different stage using the dropdown next to their name',
                'Paginated lists (15 per page) for stages with many members',
              ]}
            />
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Automatic History:</strong> When you advance a member to a later stage, the platform automatically creates history entries for all preceding stages they haven't been recorded in. No manual backfilling needed.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'birthday-tracker',
      title: 'Use the Birthday Tracker',
      description: 'Never miss a member\'s birthday -- browse by month and reach out directly.',
      icon: Cake,
      priority: 'important',
      navigateTo: '/teams/membership/birthdays',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Birthday Tracker shows all members with birthdays in the selected month, with direct contact options.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Cake}
              title="Features"
              items={[
                'Month selector to browse birthdays for any month of the year',
                'Today\'s birthdays are highlighted prominently at the top with a special card',
                'Each member card shows: name, growth stage, birthday day, email, and phone',
                'Birthday celebrants today get a visual highlight (pink ring)',
              ]}
            />
            <StepDetail
              icon={Phone}
              title="Contact Actions"
              items={[
                'Phone icon -- tap to call the member directly',
                'WhatsApp "Wish" button -- opens a WhatsApp chat with the member\'s phone number',
                'Both actions work on mobile and desktop',
              ]}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'anniversary-tracker',
      title: 'Use the Anniversary Tracker',
      description: 'Celebrate wedding anniversaries with your members.',
      icon: Heart,
      priority: 'important',
      navigateTo: '/teams/membership/anniversaries',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Works identically to the Birthday Tracker but for wedding anniversaries.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Heart}
              title="Features"
              items={[
                'Month selector to browse anniversaries for any month',
                'Today\'s anniversaries are highlighted with a special card at the top',
                'Each member card shows: name, marital status, anniversary day, email, and phone',
                'Anniversary couples today get a visual highlight (rose ring)',
              ]}
            />
            <StepDetail
              icon={MessageSquare}
              title="Reaching Out"
              items={[
                'Phone icon -- call the member directly',
                'WhatsApp "Congratulate" button -- send a congratulatory message',
                'Consider sending personalized messages rather than generic ones',
              ]}
            />
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Tip:</strong> For both Birthday and Anniversary trackers to work well, make sure you fill in the Birth Day/Month and Anniversary Day/Month fields when adding or editing members in the CRM.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'bulk-import',
      title: 'Bulk Import Members via CSV',
      description: 'Import existing member records from spreadsheets quickly.',
      icon: Upload,
      priority: 'recommended',
      navigateTo: '/teams/membership/members',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you have an existing member list in a spreadsheet, you can bulk-import it into the CRM in one go.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={FileSpreadsheet}
              title="Step-by-Step"
              items={[
                '1. Go to Members CRM and click "Bulk CSV Upload"',
                '2. Upload your CSV file (or download the template first to see the expected format)',
                '3. Preview the parsed data in an editable table -- fix any issues before importing',
                '4. Click Import to process -- results show success/skip/error counts per row',
              ]}
            />
            <StepDetail
              icon={Search}
              title="Smart Column Matching"
              items={[
                'Headers are matched by pattern, not exact name -- "First Name", "firstname", "FIRST_NAME" all work',
                'Supported columns: Name, Phone/Mobile, Email, Gender, DOB/Birthday, Anniversary, Address, Occupation, Marital Status',
                '"Full Name" columns are automatically split into first name and surname',
                'Dates can be "7-November", "November 7", "11/7", or "7/11/1995"',
              ]}
            />
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Duplicates:</strong> If a member with the same email already exists, the import updates their record instead of creating a duplicate. Members without an email are always created as new records.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'info-center-handoff',
      title: 'Understand the Info Center Handoff',
      description: 'How visitors flow from the Information Center into your Membership pipeline.',
      icon: ArrowDownUp,
      priority: 'recommended',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Membership Team and Information Center work together through an automated handoff pipeline.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Layers}
              title="The Visitor-to-Member Lifecycle"
              items={[
                'First Timer -- visitor is registered by the Information Center',
                'Returning Visitor -- auto-promoted after their second attendance',
                'Foundation Class Candidate -- Info Center worker recommends them',
                'Profiling Queue -- a task lands in YOUR queue for conversion',
                'Profiled Member -- you convert them into a full member record',
              ]}
            />
            <StepDetail
              icon={Shield}
              title="What You Need to Know"
              items={[
                'You don\'t need to manually track visitors -- the Info Center handles that',
                'When they\'re ready, a profiling task appears automatically in your queue',
                'After conversion, the member starts at "Foundation Class" stage in the Member Journey',
                'The visitor record in the Info Center is marked as "Profiled" and linked to the new member',
              ]}
            />
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
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Membership Team Guide</h1>
            <p className="text-muted-foreground">
              Welcome, {user?.firstName}. This guide covers everything your team needs to manage the church membership pipeline.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Onboarding Progress</span>
            <span className="text-sm text-muted-foreground">{completedCount} of {steps.length} completed</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {progressPercent === 100 && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> All steps reviewed. You're ready to manage the membership pipeline.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Your Role: Membership Team
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Membership Team is responsible for managing the full lifecycle of church members -- from profiling new converts to tracking their discipleship journey, celebrating milestones, and maintaining accurate records.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <UserCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Member Profiling</p>
                <p className="text-xs text-muted-foreground">Convert visitors into members, maintain the CRM directory</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Trophy className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Journey Tracking</p>
                <p className="text-xs text-muted-foreground">Monitor and advance members through 9 growth stages</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Cake className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Milestone Celebrations</p>
                <p className="text-xs text-muted-foreground">Track birthdays and anniversaries, reach out directly</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-semibold">Get Started</h2>
          <Badge className={priorityConfig.critical.color + ' border text-[10px]'}>{criticalSteps.length} steps</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Learn these first -- they're the core of your daily work.</p>
        <Accordion type="multiple" className="space-y-2">
          {criticalSteps.map(step => (
            <GuideStepCard key={step.id} step={step} completed={completedSteps.has(step.id)} onToggle={() => toggleStep(step.id)} onNavigate={step.navigateTo ? () => navigate(step.navigateTo!) : undefined} priorityConfig={priorityConfig} />
          ))}
        </Accordion>
      </div>

      <Separator />

      {/* Important */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold">Core Capabilities</h2>
          <Badge className={priorityConfig.important.color + ' border text-[10px]'}>{importantSteps.length} steps</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Features you'll use regularly. Familiarize yourself within your first week.</p>
        <Accordion type="multiple" className="space-y-2">
          {importantSteps.map(step => (
            <GuideStepCard key={step.id} step={step} completed={completedSteps.has(step.id)} onToggle={() => toggleStep(step.id)} onNavigate={step.navigateTo ? () => navigate(step.navigateTo!) : undefined} priorityConfig={priorityConfig} />
          ))}
        </Accordion>
      </div>

      <Separator />

      {/* Recommended */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Advanced & Reference</h2>
          <Badge className={priorityConfig.recommended.color + ' border text-[10px]'}>{recommendedSteps.length} steps</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Power features and background knowledge for when you're ready.</p>
        <Accordion type="multiple" className="space-y-2">
          {recommendedSteps.map(step => (
            <GuideStepCard key={step.id} step={step} completed={completedSteps.has(step.id)} onToggle={() => toggleStep(step.id)} onNavigate={step.navigateTo ? () => navigate(step.navigateTo!) : undefined} priorityConfig={priorityConfig} />
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
              <AccordionTrigger className="text-sm">How does a visitor end up in my Profiling Queue?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                The Information Center team registers visitors when they attend services. Once a visitor meets the minimum attendance threshold (default: 2 visits), an Info Center worker can recommend them for Foundation Class. That recommendation creates a profiling task in your queue automatically.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2">
              <AccordionTrigger className="text-sm">What happens when I change a member's growth stage?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                The platform automatically records the stage change with a timestamp. If you advance a member past intermediate stages (e.g., directly to "Membership Class"), history entries are automatically created for all preceding stages they skipped. This keeps the journey record complete.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-3">
              <AccordionTrigger className="text-sm">Can I undo a member deletion?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                No. Deleting a member permanently removes their record, stage history, team assignments, guardian relationships, and linked user account. Always double-check before confirming a deletion. If you need to deactivate someone instead, consider changing their role to "guest" rather than deleting.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-4">
              <AccordionTrigger className="text-sm">Why don't birthdays or anniversaries show up for some members?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Birthday and anniversary trackers rely on the Birth Day/Month and Anniversary Day/Month fields in the member's CRM record. If these fields are empty, the member won't appear in the trackers. Edit their record in the CRM and fill in the "Birth & Anniversary" tab.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-5">
              <AccordionTrigger className="text-sm">What CSV format should I use for bulk import?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Download the template from the Bulk CSV Upload dialog for the exact format. The importer is flexible with column headers (e.g., "Phone", "Phone Number", "Mobile" all work). Dates can be in formats like "7-November", "11/7", or "7/11/1995". If a member with the same email already exists, their record will be updated instead of duplicated.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

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
  step, completed, onToggle, onNavigate, priorityConfig,
}: {
  step: GuideStep; completed: boolean; onToggle: () => void; onNavigate?: () => void;
  priorityConfig: Record<string, { label: string; color: string }>;
}) {
  return (
    <AccordionItem value={step.id} className="border rounded-lg px-4 data-[state=open]:bg-muted/20">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center gap-3 text-left flex-1">
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              completed ? 'bg-green-600 border-green-600 text-white' : 'border-muted-foreground/30 hover:border-muted-foreground/60'
            }`}
          >
            {completed && <CheckCircle2 className="h-3.5 w-3.5" />}
          </button>
          <step.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <span className={`text-sm font-medium ${completed ? 'line-through text-muted-foreground' : ''}`}>{step.title}</span>
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
            Go to {step.title.split(' ').slice(-2).join(' ')}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
