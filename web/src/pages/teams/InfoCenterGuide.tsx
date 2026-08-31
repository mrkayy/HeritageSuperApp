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
  UserPlus,
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
  Phone,
  Upload,
  FileSpreadsheet,
  ArrowDownUp,
  GraduationCap,
  BarChart3,
  Calendar,
  UserCheck,
  Shield,
  Settings,
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

const ALLOWED_ROLES = ['super_admin', 'church_admin', 'resident_pastor', 'team_lead', 'info_center_lead', 'info_center_worker'];

export default function InfoCenterGuide() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('ic-guide-completed');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const hasAccess = ALLOWED_ROLES.includes(user?.role || '') ||
    (user?.role === 'team_lead' && user?.teamName?.toLowerCase().includes('information'));

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">This guide is available to Information Center workers, leads, Church Admins, Resident Pastors, and Super Admins.</p>
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
      localStorage.setItem('ic-guide-completed', JSON.stringify([...next]));
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
      description: 'Your hub for visitor statistics, quick actions, and pipeline overview.',
      icon: BarChart3,
      priority: 'critical',
      navigateTo: '/teams/info-center',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Information Center Dashboard is your home base for tracking visitors and taking quick actions.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Rocket}
              title="Quick Action Cards (Top)"
              items={[
                'Register New Visitor -- jump directly to the visitor registration form',
                'Mark Attendance -- go to the attendance tracking page',
                'Foundation Class -- view candidates ready for recommendation (shows pending count)',
              ]}
            />
            <StepDetail
              icon={BarChart3}
              title="KPI Cards"
              items={[
                'Total Visitors -- everyone registered in the system',
                'First Timers -- visitors who have attended only once',
                'Returning Visitors -- those who have come back for a second visit or more',
                'Foundation Candidates -- visitors recommended for Foundation Class',
              ]}
            />
            <StepDetail
              icon={Layers}
              title="Recent Visitors & Pipeline"
              items={[
                'Recent Visitors table showing the 8 most recently registered visitors',
                'Visitor Pipeline sidebar showing the percentage breakdown across all 4 statuses',
                'Statuses: First Timer, Returning Visitor, Foundation Class Candidate, Profiled',
              ]}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'register-visitors',
      title: 'Register New Visitors (First Timers)',
      description: 'The core workflow -- capture first-time visitor information during or after a service.',
      icon: UserPlus,
      priority: 'critical',
      navigateTo: '/teams/info-center/new-visitor',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This is your most-used page. Navigate to <strong>New Visitor</strong> in the sidebar to register someone attending for the first time.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={ClipboardList}
              title="Registration Form"
              items={[
                'Phone Number (required) -- entered first, with automatic duplicate detection',
                'First Name, Last Name (required)',
                'Gender (required) -- Male or Female',
                'Residential Address (required)',
                'Email (optional)',
                'Who Invited You -- select a church member from the dropdown, or switch to "Guest/Other" for free text (e.g., "social media", "neighbor")',
                'Prayer Request (optional) -- captures any prayer needs',
                'Worker Notes (optional) -- your internal observations',
              ]}
            />
            <StepDetail
              icon={Phone}
              title="Duplicate Phone Detection"
              items={[
                'When you type a phone number and move to the next field, the system checks if it already exists',
                'If a match is found, a dialog offers 3 options:',
                '"Mark as Subsequent Visit" -- logs another attendance for the existing visitor',
                '"Update Visitor Profile" -- pre-fills the form with existing data for editing',
                '"Dismiss & Continue Fresh" -- ignore the match and register as new',
              ]}
            />
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Important:</strong> When a visitor is registered, their attendance for the current service is automatically logged. You do not need to separately mark attendance for new registrations.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'mark-attendance',
      title: 'Mark Attendance for Returning Visitors',
      description: 'Track which visitors attend each service to build their visit history.',
      icon: Calendar,
      priority: 'critical',
      navigateTo: '/teams/info-center/attendance',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            For visitors who are already in the system and returning for another service, use the Attendance page.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Search}
              title="Finding the Visitor"
              items={[
                'Search by name or phone number -- the search runs against the server for accurate results',
                'The table shows: Name, Phone, Status, Visit Count, and Last Attended Date',
                'Click "Mark" on the visitor\'s row to open the attendance dialog',
              ]}
            />
            <StepDetail
              icon={Calendar}
              title="Service Types"
              items={[
                'Sunday Service -- regular Sunday worship',
                'Midweek Service -- midweek gathering',
                'Special Program -- conferences, revivals, etc.',
                'Prayer Meeting -- prayer-focused gatherings',
                'Select the correct service type before marking attendance',
              ]}
            />
            <StepDetail
              icon={Eye}
              title="What Happens on Mark"
              items={[
                'The dialog shows the visitor\'s summary and their last 5 attendance records',
                'Click "Confirm Attendance" to record the visit',
                'Visit count increases by 1 automatically',
                'First Timers are automatically promoted to "Returning Visitor" on their second visit',
                'Duplicate protection: the system rejects if already marked for the same date',
              ]}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'foundation-candidates',
      title: 'Recommend Visitors for Foundation Class',
      description: 'Identify eligible visitors and send them to the Membership Team for profiling.',
      icon: GraduationCap,
      priority: 'important',
      navigateTo: '/teams/info-center/foundation-class',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            When visitors have attended enough services, they become eligible for Foundation Class. Navigate to <strong>Foundation Class</strong> in the sidebar.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={UserCheck}
              title="The Candidates Tab"
              items={[
                'Shows visitors who meet the minimum attendance threshold (default: 2 visits)',
                'Only visitors who are NOT yet recommended or profiled appear here',
                'Table columns: Name, Phone, Visit Count, First Attended, Last Attended, Status',
                'Click "Recommend" on a visitor\'s row to nominate them',
              ]}
            />
            <StepDetail
              icon={ArrowDownUp}
              title="What Happens When You Recommend"
              items={[
                'Visitor status changes to "Foundation Class Candidate"',
                'A profiling task is automatically created for the Membership Team',
                'The Membership Team receives this in their Profiling Queue',
                'You can add optional notes with the recommendation',
                'Once recommended, the visitor shows a "Recommended" badge instead of the button',
              ]}
            />
            <StepDetail
              icon={Settings}
              title="Settings Tab"
              items={[
                'Configure the "Minimum Attendance Count" (1 to 10, default: 2)',
                'This controls how many visits a visitor needs before appearing as a candidate',
                'Lower the threshold for fast-tracking; raise it for stricter qualification',
              ]}
            />
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>This is the handoff point:</strong> After you recommend a visitor, the Membership Team takes over. They will convert the visitor into a full church member. You've done your part.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'member-directory',
      title: 'Manage the Member Directory',
      description: 'Create, edit, search, and manage member records from the Info Center.',
      icon: Users,
      priority: 'important',
      navigateTo: '/teams/info-center/members',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Member Directory gives you access to the full member list. Navigate to <strong>Member Directory</strong> in the sidebar.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Search}
              title="Searching & Filtering"
              items={[
                'Search by name, email, or phone number',
                'Filter by growth stage using the dropdown selector',
                'Table shows: Member Name, Stage, Email/Phone, Sector/Team, and action buttons',
              ]}
            />
            <StepDetail
              icon={UserPlus}
              title="Creating Members"
              items={[
                'Click "Create Member" to add a new member directly',
                'Required fields: First Name and Surname',
                'Optional: Email, Phone, Growth Stage, Gender, Home Address',
                'Use "Bulk CSV Upload" for importing many members at once from a spreadsheet',
              ]}
            />
            <StepDetail
              icon={Users}
              title="Per-Member Actions"
              items={[
                'Manage Family/Guardians -- link parent, guardian, or sibling relationships',
                'Edit -- update any member details',
                'Delete -- permanently remove the member and all associated data',
              ]}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'member-journey',
      title: 'View the Member Journey Pipeline',
      description: 'See how members are distributed across growth stages.',
      icon: Layers,
      priority: 'important',
      navigateTo: '/teams/info-center/journey',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Member Journey shows the pipeline of members across 9 growth stages. Navigate to <strong>Member Journey</strong> in the sidebar.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Layers}
              title="What You See"
              items={[
                '9 stage cards showing member counts: First Time Guest through Resident Pastor',
                'Total pipeline count in the header',
                '"View Directory" button on each stage to browse members at that level',
              ]}
            />
            <StepDetail
              icon={ArrowDownUp}
              title="Moving Members Between Stages"
              items={[
                'Open a stage directory and use the dropdown next to each member to change their stage',
                'When advancing past intermediate stages, history entries are auto-created',
                'Search within any stage by member name',
                'Lists are paginated at 15 members per page',
              ]}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'bulk-visitor-import',
      title: 'Bulk Import Visitors via CSV',
      description: 'Register many first-time visitors at once from a spreadsheet.',
      icon: Upload,
      priority: 'recommended',
      navigateTo: '/teams/info-center/new-visitor',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            After a large event or conference, use bulk CSV import to register multiple first-timers at once instead of one-by-one.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={FileSpreadsheet}
              title="How to Bulk Import"
              items={[
                '1. Go to New Visitor and click "Bulk CSV Intake"',
                '2. Download the template CSV to see the expected format',
                '3. Upload your filled CSV file',
                '4. Preview and edit entries in an in-browser table before importing',
                '5. Submit -- the system processes records concurrently for speed',
                '6. Review results: success, skipped, and error counts',
              ]}
            />
            <StepDetail
              icon={ClipboardList}
              title="CSV Columns"
              items={[
                'First Name, Last Name (required)',
                'Phone Number (required)',
                'Gender (required)',
                'Residential Address',
                'Email',
                'Who Invited You',
                'Prayer Request',
                'Notes',
              ]}
            />
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Tip:</strong> Download the template first. It's named "heritage_first_timers_template.csv" and has all the correct headers pre-configured.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'visitor-lifecycle',
      title: 'Understand the Visitor Lifecycle',
      description: 'How visitors move through the system from first visit to full membership.',
      icon: ArrowDownUp,
      priority: 'recommended',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            As an Info Center worker, you manage the first two stages of the visitor lifecycle. Understanding the full pipeline helps you see how your work fits.
          </p>
          <div className="grid gap-3">
            <StepDetail
              icon={Layers}
              title="The 4 Visitor Statuses"
              items={[
                '1. First Timer -- you register them on their first visit',
                '2. Returning Visitor -- auto-promoted when you mark their second attendance',
                '3. Foundation Class Candidate -- you manually recommend them on the Foundation Class page',
                '4. Profiled -- the Membership Team converts them into a full member (out of your hands)',
              ]}
            />
            <StepDetail
              icon={Shield}
              title="Your Responsibilities vs. Membership Team"
              items={[
                'YOU handle: registration, attendance tracking, and foundation class recommendation',
                'MEMBERSHIP handles: converting candidates to members, CRM management, journey tracking',
                'The handoff happens automatically via the profiling task queue',
                'Once a visitor is "Profiled", they no longer appear in your active visitor lists',
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
            <h1 className="text-2xl font-bold tracking-tight">Information Center Guide</h1>
            <p className="text-muted-foreground">
              Welcome, {user?.firstName}. This guide covers everything you need to register visitors, track attendance, and manage the visitor pipeline.
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
              <CheckCircle2 className="h-4 w-4" /> All steps reviewed. You're ready to run the Information Center.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Your Role: Information Center
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Information Center is the front door of the church. You are the first point of contact for every new visitor. Your work feeds directly into the Membership Team's pipeline -- the quality and completeness of the data you capture determines how well the rest of the system works.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <UserPlus className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Visitor Registration</p>
                <p className="text-xs text-muted-foreground">Capture first-timer details during or after services</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Attendance Tracking</p>
                <p className="text-xs text-muted-foreground">Log return visits and build visitor engagement history</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <GraduationCap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Foundation Class Pipeline</p>
                <p className="text-xs text-muted-foreground">Recommend qualified visitors for membership profiling</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visitor status lifecycle visual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5" />
            Visitor Lifecycle at a Glance
          </CardTitle>
          <CardDescription>How visitors flow through your system into the Membership pipeline.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {[
              { status: 'First Timer', who: 'You register them', auto: false, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
              { status: 'Returning Visitor', who: 'Auto-promoted on 2nd attendance', auto: true, color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400' },
              { status: 'Foundation Class Candidate', who: 'You recommend them', auto: false, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
              { status: 'Profiled (Member)', who: 'Membership Team converts them', auto: false, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg text-sm ${item.color}`}>
                <Badge variant="outline" className="text-[10px] w-5 h-5 p-0 flex items-center justify-center rounded-full">{i + 1}</Badge>
                <span className="font-medium min-w-[200px]">{item.status}</span>
                <span className="text-xs">{item.who}</span>
                {item.auto && <Badge variant="secondary" className="text-[10px] ml-auto">Automatic</Badge>}
              </div>
            ))}
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
        <p className="text-sm text-muted-foreground">Your core daily workflows -- learn these first.</p>
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
        <p className="text-sm text-muted-foreground">Features you'll use regularly beyond the basics.</p>
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
        <p className="text-sm text-muted-foreground">Power features and deeper understanding.</p>
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
              <AccordionTrigger className="text-sm">What if a visitor's phone number already exists?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                The system detects duplicates automatically when you enter a phone number. You'll get three options: mark it as a return visit (logs attendance), update the existing profile (pre-fills the form), or dismiss and register as a new record. In most cases, "Mark as Subsequent Visit" is the right choice for returning visitors.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2">
              <AccordionTrigger className="text-sm">Do I need to mark attendance for newly registered visitors?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                No. When you register a new visitor through the New Visitor form, their attendance is automatically logged for the current service. You only need to use the Attendance page for visitors who are <strong>already in the system</strong> and returning for another service.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-3">
              <AccordionTrigger className="text-sm">When should I recommend someone for Foundation Class?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Visitors automatically appear on the Foundation Class candidates page once they meet the minimum attendance threshold (default: 2 visits). Use your judgment about their readiness -- the threshold is a minimum, not an automatic trigger. You can also adjust the threshold in the Settings tab on the Foundation Class page.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-4">
              <AccordionTrigger className="text-sm">What happens after I recommend a visitor?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Their status changes to "Foundation Class Candidate" and a profiling task is automatically sent to the Membership Team's queue. The Membership Team will review the visitor's details and convert them into a full church member. Once converted, the visitor's status becomes "Profiled" and they will no longer appear in your active visitor lists.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-5">
              <AccordionTrigger className="text-sm">Can I mark attendance for the same visitor twice on the same day?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                No. The system prevents duplicate attendance entries for the same visitor on the same date. If you try, you'll receive an error message. This ensures visit counts remain accurate.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-6">
              <AccordionTrigger className="text-sm">What's the difference between the Member Directory and the visitor list?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                The visitor list (on the Dashboard and Attendance pages) shows people registered through the Info Center who are still in the visitor pipeline (first timers, returning visitors, candidates). The <strong>Member Directory</strong> shows fully profiled church members with their growth stage, sector, and team assignments. A person starts as a visitor and eventually becomes a member when the Membership Team profiles them.
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
