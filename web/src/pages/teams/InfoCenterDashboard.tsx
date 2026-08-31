import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MembershipService, Member } from '@/services/membershipService';
import { AdminBackOfficeServices } from '@/services/AdminBackOfficeServices';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CsvPreviewModal from '@/components/layout/CsvPreviewModal';
import {
  Building,
  UserPlus,
  Users,
  TrendingUp,
  Search,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  FolderPlus,
  FileSpreadsheet,
  Upload
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useZodForm, FieldError } from '@/hooks/useZodForm';
import { memberInfoCenterSchema, type MemberInfoCenterFormValues } from '@/lib/schemas/member';
import { MEMBERSHIP_STAGES, USER_ROLES } from '@/lib/constants';

interface LocalChurch { id: string; name: string; }
interface Sector { id: string; name: string; }
interface Team { id: string; name: string; }

export default function InfoCenterDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Aux state for dropdowns
  const [churches, setChurches] = useState<LocalChurch[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // CSV Upload State
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // Form State (useZodForm)
  const defaultValues: MemberInfoCenterFormValues = {
    firstName: '',
    surname: '',
    email: '',
    phoneNumber: '',
    role: 'member',
    currentStage: 'first_time_guest',
    sectorId: '',
    teamId: '',
    gender: '',
    homeAddress: '',
  };

  const form = useZodForm({
    schema: memberInfoCenterSchema,
    initialValues: defaultValues,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [membersData, teamsData, sectorsData, churchesData] = await Promise.all([
        MembershipService.fetchMembers(),
        AdminBackOfficeServices.fetchTeams().catch(() => []),
        AdminBackOfficeServices.fetchSectors().catch(() => []),
        AdminBackOfficeServices.fetchChurches().catch(() => []),
      ]);
      setMembers(membersData || []);
      setTeams(teamsData || []);
      setSectors(sectorsData || []);
      setChurches(churchesData || []);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error loading Info Center data",
        description: "Failed to fetch members directory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onProfileSubmit = async (data: MemberInfoCenterFormValues) => {
    try {
      const fullName = `${data.firstName.trim()} ${data.surname.trim()}`;
      await MembershipService.profileMember({
        name: fullName,
        email: data.email.trim(),
        role: data.role,
        current_stage: data.currentStage,
        sector_id: data.sectorId || undefined,
        team_id: data.teamId || undefined,
      });

      toast({
        title: "Member Profiled!",
        description: `Successfully registered ${fullName} in system directory.`,
      });

      form.reset();
      setIsProfileModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Profiling Failed",
        description: err.response?.data?.message || err.message || "Failed to profile member",
        variant: "destructive",
      });
    }
  };

  // Metrics calculation
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const newMembersCount = members.filter(m => m.createdAt && new Date(m.createdAt) >= thirtyDaysAgo).length;
  const firstTimersCount = members.filter(m => m.currentStage === 'first_time_guest').length;

  const stageCounts: Record<string, number> = {};
  members.forEach(m => {
    const s = m.currentStage || 'first_time_guest';
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50">
        <div>
          <Badge variant="outline" className="text-primary border-primary/30 mb-2">
            <Building className="w-3.5 h-3.5 mr-1" /> Information Center Desk
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Member Profiling & Integration Station
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create member records, set growth stages, and integrate new attendees into sectors & teams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => { form.reset(); setIsProfileModalOpen(true); }}
                  size="icon"
                  className="bg-primary text-primary-foreground shadow-md h-9 w-9 rounded-xl"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="sr-only">Profile New Member</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Profile New Member</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setCsvModalOpen(true)} 
                  size="icon" 
                  variant="secondary" 
                  className="shadow-sm h-9 w-9 rounded-xl"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span className="sr-only">Bulk CSV Upload</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Bulk CSV Upload</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                  <Link to="/teams/info-center/members">
                    <Users className="w-4 h-4" />
                    <span className="sr-only">Member Directory</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Member Directory</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Directory</CardTitle>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? '...' : members.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active profiled members</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Registrations (30d)</CardTitle>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <UserPlus className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? '...' : newMembersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Profiled in past 30 days</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:border-blue-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">First Time Guests</CardTitle>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <FolderPlus className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? '...' : firstTimersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Initial entry stage</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:border-purple-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Growth Pipeline</CardTitle>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{MEMBERSHIP_STAGES.length} Stages</div>
            <Link to="/teams/info-center/journey" className="text-xs text-primary hover:underline flex items-center mt-1">
              View Member Journey &rarr;
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Profiling Activity Feed & Stage Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Onboarding Feed */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Member Registrations</CardTitle>
              <CardDescription>Latest profiles registered via Information Desk</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/teams/info-center/members">
                View All Directory <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50">
                    <TableHead className="font-semibold">Member Name</TableHead>
                    <TableHead className="font-semibold">Email / Contact</TableHead>
                    <TableHead className="font-semibold">Stage</TableHead>
                    <TableHead className="font-semibold">Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No member records found.</TableCell>
                    </TableRow>
                  ) : (
                    members.slice(0, 5).map(m => (
                      <TableRow key={m.id} className="hover:bg-secondary/40">
                        <TableCell className="font-medium text-foreground">
                          {m.firstName} {m.surname}
                          {m.role && (
                            <Badge variant="outline" className="text-[10px] ml-2 capitalize">
                              {m.role.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.email || m.phoneNumber || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {(m.currentStage || 'first_time_guest').replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Growth Stage Funnel */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Growth Stage Distribution</CardTitle>
            <CardDescription>Member breakdown across spiritual growth stages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {MEMBERSHIP_STAGES.map(s => {
              const count = stageCounts[s.value] || 0;
              const pct = members.length > 0 ? Math.round((count / members.length) * 100) : 0;
              return (
                <div key={s.value} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-foreground">{s.label}</span>
                    <span className="text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Profiling Dialog / Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Information Center: Profile New Member
            </DialogTitle>
            <DialogDescription>
              Register a new attendee or member into the church database and assign initial role & growth stage.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...form.getInputProps('firstName')}
                  placeholder="e.g. Samuel"
                />
                <FieldError message={form.errors.firstName} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Surname *</Label>
                <Input
                  id="surname"
                  {...form.getInputProps('surname')}
                  placeholder="e.g. Adebayo"
                />
                <FieldError message={form.errors.surname} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.getInputProps('email')}
                  placeholder="samuel@example.com"
                />
                <FieldError message={form.errors.email} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  {...form.getInputProps('phoneNumber')}
                  placeholder="+234..."
                />
                <FieldError message={form.errors.phoneNumber} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">User Role</Label>
                <Select {...form.getSelectProps('role')}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={form.errors.role} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentStage">Initial Growth Stage</Label>
                <Select {...form.getSelectProps('currentStage')}>
                  <SelectTrigger id="currentStage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBERSHIP_STAGES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={form.errors.currentStage} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {sectors.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="sectorId">Sector / Zone</Label>
                  <Select {...form.getSelectProps('sectorId')}>
                    <SelectTrigger id="sectorId">
                      <SelectValue placeholder="Select Sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectors.map((s: any) => (
                        <SelectItem key={s.id || s.sector_id} value={s.id || s.sector_id}>{s.name || s.sector_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={form.errors.sectorId} />
                </div>
              )}

              {teams.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="teamId">Assigned Ministry Team</Label>
                  <Select {...form.getSelectProps('teamId')}>
                    <SelectTrigger id="teamId">
                      <SelectValue placeholder="Select Team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t: any) => (
                        <SelectItem key={t.id || t.team_id} value={t.id || t.team_id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={form.errors.teamId} />
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setIsProfileModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.isSubmitting}>
                {form.isSubmitting ? 'Profiling...' : 'Profile Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Bulk Profiling Modal */}
      <CsvPreviewModal 
        open={csvModalOpen} 
        onOpenChange={setCsvModalOpen} 
        onImportComplete={loadData}
      />
    </div>
  );
}
