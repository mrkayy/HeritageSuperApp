
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserPlus, Plus, Pencil, Trash2 } from 'lucide-react';
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
  email: string;
  role: string;
  localChurchId?: string;
  localChurchName?: string;
  sectorId?: string;
  sectorName?: string;
  teamId?: string;
  teamName?: string;
  createdAt: string;
}

// Form schema for profiling a new member
const memberProfileSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(['super_admin', 'church_admin', 'resident_pastor', 'team_lead', 'steward', 'member', 'guest']),
  church_id: z.string().optional(),
  sector_id: z.string().optional(),
  team_id: z.string().optional(),
});

type MemberProfileFormData = z.infer<typeof memberProfileSchema>;

const MemberInvites = () => {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [churches, setChurches] = useState<LocalChurch[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberProfile | null>(null);

  const form = useForm<MemberProfileFormData>({
    resolver: zodResolver(memberProfileSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'member',
      church_id: user?.church_id || '',
      sector_id: '',
      team_id: '',
    },
  });

  useEffect(() => {
    fetchMembers();
    fetchChurches();
    fetchSectors();
    fetchTeams();
  }, []);

  const fetchMembers = async () => {
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
  };

  const fetchChurches = async () => {
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
  };

  const fetchSectors = async () => {
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
  };

  const fetchTeams = async () => {
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
  };

  const onSubmit = async (data: MemberProfileFormData) => {
    try {
      setLoading(true);

      const payload = {
        name: data.name,
        email: data.email,
        role: data.role,
        church_id: data.church_id || user?.church_id || undefined,
        sector_id: data.sector_id || undefined,
        team_id: data.team_id || undefined,
      };

      if (editingMember) {
        await api.put(`/members/${editingMember.id}`, payload);
        toast({
          title: "Success",
          description: "Member updated successfully",
        });
      } else {
        await api.post('/members/profile', payload);
        toast({
          title: "Success",
          description: "Member profiled successfully",
        });
      }

      resetForm();
      setIsDialogOpen(false);
      fetchMembers();
    } catch (error: any) {
      console.error('Error profiling member:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to profile member",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (member: MemberProfile) => {
    setEditingMember(member);
    form.reset({
      name: member.name || '',
      email: member.email || '',
      role: (member.role as any) || 'member',
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
      church_id: user?.church_id || '',
      sector_id: '',
      team_id: '',
    });
    setEditingMember(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Member Directory & Profiling
          </h1>
          <p className="text-muted-foreground">Pre-profile members to allow signup and assign roles, sectors, and teams</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Profile New Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
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

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="team_lead">Team Lead</SelectItem>
                          <SelectItem value="resident_pastor">Resident Pastor</SelectItem>
                          <SelectItem value="church_admin">Church Admin</SelectItem>
                          <SelectItem value="steward">Steward</SelectItem>
                          {/* <SelectItem value="guest">Guest</SelectItem> */}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : editingMember ? "Update" : "Profile Member"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members Directory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Profiled Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Local Church</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No profiled members found. Profile your first member to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name || `${(member as any).firstName || ''} ${(member as any).surname || ''}`.trim()}</TableCell>
                      <TableCell>{member.email || '-'}</TableCell>
                      <TableCell className="capitalize">{member.role ? member.role.replace('_', ' ') : 'Member'}</TableCell>
                      <TableCell>{member.localChurchName || 'Default Church'}</TableCell>
                      <TableCell>{member.sectorName || 'No Sector'}</TableCell>
                      <TableCell>{member.teamName || 'No Team'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(member)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(member.id)}
                            className="text-red-600 hover:text-red-800"
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
    </div>
  );
};

export default MemberInvites;
