import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Plus, Pencil, Trash2, Users, Shield, Search, GraduationCap, UserCheck, ShieldAlert } from 'lucide-react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface LocalChurch {
  id: string;
  name: string;
  center?: string;
}

interface Sector {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
}

interface MemberProfile {
  id: string;
  name: string;
  firstName?: string;
  surname?: string;
  email: string;
  currentStage?: string;
  localChurchId?: string;
  localChurchName?: string;
  sectorId?: string;
  sectorName?: string;
  teamId?: string;
  teamName?: string;
  createdAt: string;
}

interface SystemUser {
  user_id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  user_team: {
    team: {
      team_id: string;
      name: string;
    };
  }[];
  user_sector: {
    sector: {
      sector_id: string;
      sector_name: string;
    };
  }[];
}

const MEMBERSHIP_STAGES = [
  { value: 'first_time_guest', label: 'First Time Guest' },
  { value: 'foundation_class', label: 'Foundation Class' },
  { value: 'sunday_school_module_1', label: 'Sunday School Module 1' },
  { value: 'sunday_school_module_2', label: 'Sunday School Module 2' },
  { value: 'sunday_school_module_3', label: 'Sunday School Module 3' },
  { value: 'membership_class', label: 'Membership Class' },
  { value: 'stewardship', label: 'Stewardship' },
] as const;

const USER_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'church_admin', label: 'Church Admin' },
  { value: 'resident_pastor', label: 'Resident Pastor' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'steward', label: 'Steward' },
  { value: 'member', label: 'Member' },
  { value: 'guest', label: 'Guest' },
] as const;

// Form schema for profiling / editing a member
const memberProfileSchema = z.object({
  name: z.string().min(1, "Full name is required").refine(
    (val) => val.trim().split(/\s+/).length >= 2,
    { message: "Please provide both first name and surname (e.g. John Doe)" }
  ),
  email: z.string().email("Invalid email address"),
  role: z.enum(['super_admin', 'church_admin', 'resident_pastor', 'team_lead', 'steward', 'member', 'guest']),
  current_stage: z.string().min(1, "Current stage is required"),
  church_id: z.string().optional(),
  sector_id: z.string().optional(),
  team_id: z.string().optional(),
});

type MemberProfileFormData = z.infer<typeof memberProfileSchema>;

const formatStage = (stage?: string) => {
  if (!stage) return 'First Time Guest';
  const cleaned = stage.replace(/'/g, '');
  const found = MEMBERSHIP_STAGES.find((s) => s.value === cleaned);
  if (found) return found.label;
  return cleaned.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const getRoleBadgeVariant = (role?: string) => {
  switch (role) {
    case 'super_admin':
    case 'church_admin':
      return 'default';
    case 'resident_pastor':
    case 'team_lead':
      return 'secondary';
    case 'steward':
      return 'outline';
    default:
      return 'outline';
  }
};

const MemberInvites = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [churches, setChurches] = useState<LocalChurch[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberProfile | null>(null);

  // Role edit modal state
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<SystemUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const [roleUpdating, setRoleUpdating] = useState(false);

  // Filters for User Roles tab
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Search filter for Members tab
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [memberStageFilter, setMemberStageFilter] = useState('all');

  const form = useForm<MemberProfileFormData>({
    resolver: zodResolver(memberProfileSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'member',
      current_stage: 'first_time_guest',
      church_id: user?.church_id || '',
      sector_id: '',
      team_id: '',
    },
  });

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/members');
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: "Error",
        description: "Failed to fetch members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  const fetchChurches = useCallback(async () => {
    try {
      const { data } = await api.get('/churches');
      const mapped = (data || []).map((item: any) => ({
        id: item.id || item.church_id || '',
        name: item.name || '',
        center: item.center || '',
      }));
      setChurches(mapped);
    } catch (error) {
      console.error('Error fetching churches:', error);
    }
  }, []);

  const fetchSectors = useCallback(async () => {
    try {
      const { data } = await api.get('/sectors');
      const mapped = (data || []).map((item: any) => ({
        id: item.id || item.sector_id || '',
        name: item.name || item.sector_name || '',
      }));
      setSectors(mapped);
    } catch (error) {
      console.error('Error fetching sectors:', error);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const { data } = await api.get('/teams');
      const mapped = (data || []).map((item: any) => ({
        id: item.id || item.team_id || '',
        name: item.name || item.team_name || '',
      }));
      setTeams(mapped);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchUsers();
    fetchChurches();
    fetchSectors();
    fetchTeams();
  }, [fetchMembers, fetchUsers, fetchChurches, fetchSectors, fetchTeams]);

  const onSubmit = async (data: MemberProfileFormData) => {
    try {
      setLoading(true);

      const nameParts = data.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const surname = nameParts.slice(1).join(' ') || nameParts[0];

      if (editingMember) {
        // Backend PUT /api/members/:id expects createPayload
        const updatePayload = {
          firstName,
          surname,
          email: data.email.trim(),
          currentStage: data.current_stage || 'first_time_guest',
          localChurchId: data.church_id || user?.church_id || undefined,
          sectorId: data.sector_id || undefined,
          teamId: data.team_id || undefined,
        };

        await api.put(`/members/${editingMember.id}`, updatePayload);
        toast({
          title: "Success",
          description: "Member updated successfully",
        });
      } else {
        // Backend POST /api/members/profile expects profilePayload
        const profilePayload = {
          name: data.name.trim(),
          email: data.email.trim(),
          role: data.role || 'member',
          church_id: data.church_id || user?.church_id || undefined,
          sector_id: data.sector_id || undefined,
          team_id: data.team_id || undefined,
        };

        await api.post('/members/profile', profilePayload);
        toast({
          title: "Success",
          description: "Member profiled successfully",
        });
      }

      resetForm();
      setIsDialogOpen(false);
      fetchMembers();
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving member:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to save member",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (member: MemberProfile) => {
    setEditingMember(member);
    const memberName = (
      member.name ||
      `${member.firstName || ''} ${member.surname || ''}`
    ).trim();

    const cleanedStage = (member.currentStage || 'first_time_guest').replace(/'/g, '');

    form.reset({
      name: memberName,
      email: member.email || '',
      role: 'member',
      current_stage: cleanedStage,
      church_id: member.localChurchId || user?.church_id || '',
      sector_id: member.sectorId || '',
      team_id: member.teamId || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm('Are you sure you want to delete this member profile?')) return;

    try {
      setLoading(true);
      await api.delete(`/members/${memberId}`);

      toast({
        title: "Success",
        description: "Member deleted successfully",
      });
      fetchMembers();
      fetchUsers();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: "Error",
        description: "Failed to delete member",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    form.reset({
      name: '',
      email: '',
      role: 'member',
      current_stage: 'first_time_guest',
      church_id: user?.church_id || '',
      sector_id: '',
      team_id: '',
    });
    setEditingMember(null);
  };

  const handleOpenRoleModal = (u: SystemUser) => {
    setSelectedUserForRole(u);
    setSelectedRole(u.role || 'member');
    setRoleModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUserForRole) return;
    try {
      setRoleUpdating(true);
      await api.put(`/users/${selectedUserForRole.user_id}/role`, {
        role: selectedRole,
      });

      toast({
        title: "Success",
        description: `Role updated to ${selectedRole.replace(/_/g, ' ')} successfully`,
      });

      setRoleModalOpen(false);
      setSelectedUserForRole(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update user role",
        variant: "destructive"
      });
    } finally {
      setRoleUpdating(false);
    }
  };

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const fullName = (m.name || `${m.firstName || ''} ${m.surname || ''}`).toLowerCase();
    const email = (m.email || '').toLowerCase();
    const search = memberSearchTerm.toLowerCase();
    const matchesSearch = fullName.includes(search) || email.includes(search);

    const stageCleaned = (m.currentStage || '').replace(/'/g, '');
    const matchesStage = memberStageFilter === 'all' || stageCleaned === memberStageFilter;

    return matchesSearch && matchesStage;
  });

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const search = userSearchTerm.toLowerCase();
    const matchesSearch = fullName.includes(search) || email.includes(search);
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Member Directory & Role Management
          </h1>
          <p className="text-muted-foreground">
            Manage membership records, progression stages, and user account roles
          </p>
        </div>

        {activeTab === 'members' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Profile New Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? 'Edit Member Profile' : 'Profile New Member'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name (e.g. John Doe)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Role field (active on new profiling) */}
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <Shield className="h-4 w-4 text-primary" />
                            Account Role
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {USER_ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Current Stage of Membership field */}
                    <FormField
                      control={form.control}
                      name="current_stage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            Current Stage
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select membership stage" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MEMBERSHIP_STAGES.map((stage) => (
                                <SelectItem key={stage.value} value={stage.value}>
                                  {stage.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="church_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local Church</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Default (Creator's Local Church)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Default (Creator's Local Church)</SelectItem>
                            {churches.map((church) => (
                              <SelectItem key={church.id} value={church.id}>
                                {church.name} {church.center ? `(${church.center})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sector_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sector (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select sector" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">No Sector</SelectItem>
                              {sectors.map((sector) => (
                                <SelectItem key={sector.id} value={sector.id}>
                                  {sector.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="team_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select team" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">No Team</SelectItem>
                              {teams.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter className="pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : editingMember ? "Update Member" : "Profile Member"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'members' | 'roles')}
        className="space-y-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Profiled Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            User Roles ({users.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profiled Members */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Profiled Members Directory</CardTitle>
                  <CardDescription>
                    All church members with their progression stage, local church, sector, and team assignments
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search member by name/email..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                  <Select value={memberStageFilter} onValueChange={setMemberStageFilter}>
                    <SelectTrigger className="w-48 h-9 text-sm">
                      <SelectValue placeholder="Filter by stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stages</SelectItem>
                      {MEMBERSHIP_STAGES.map((st) => (
                        <SelectItem key={st.value} value={st.value}>
                          {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Current Stage</TableHead>
                      <TableHead>Local Church</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          {members.length === 0
                            ? "No profiled members found. Click 'Profile New Member' to get started."
                            : "No members match the current search or stage filter."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.name || `${member.firstName || ''} ${member.surname || ''}`.trim() || 'Unknown'}
                          </TableCell>
                          <TableCell>{member.email || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal text-xs">
                              {formatStage(member.currentStage)}
                            </Badge>
                          </TableCell>
                          <TableCell>{member.localChurchName || 'Default Church'}</TableCell>
                          <TableCell>{member.sectorName || 'No Sector'}</TableCell>
                          <TableCell>{member.teamName || 'No Team'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(member)}
                                title="Edit Member"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(member.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete Member"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: User Roles */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>System Users & Role Management</CardTitle>
                  <CardDescription>
                    Update account roles and permission levels for registered users
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search user by name/email..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger className="w-48 h-9 text-sm">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {USER_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        {users.length === 0
                          ? "No registered users found."
                          : "No users match the current search or role filter."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => {
                      const userSector =
                        u.user_sector && u.user_sector.length > 0 && u.user_sector[0]?.sector
                          ? u.user_sector[0].sector.sector_name
                          : 'No Sector';
                      const userTeam =
                        u.user_team && u.user_team.length > 0 && u.user_team[0]?.team
                          ? u.user_team[0].team.name
                          : 'No Team';

                      return (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium">
                            {`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'}
                          </TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(u.role)} className="capitalize">
                              {u.role ? u.role.replace(/_/g, ' ') : 'Member'}
                            </Badge>
                          </TableCell>
                          <TableCell>{userSector}</TableCell>
                          <TableCell>{userTeam}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenRoleModal(u)}
                              className="h-8 gap-1"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit Role
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Role Dialog */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Update User Role
            </DialogTitle>
          </DialogHeader>
          {selectedUserForRole && (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">User</p>
                <p className="text-sm text-muted-foreground">
                  {`${selectedUserForRole.first_name || ''} ${selectedUserForRole.last_name || ''}`.trim()} ({selectedUserForRole.email})
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new role" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRoleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleUpdateRole}
                  disabled={roleUpdating}
                >
                  {roleUpdating ? "Updating..." : "Save Role"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberInvites;
