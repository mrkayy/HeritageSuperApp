
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Shield, Plus, Trash2, Search, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { cn, generateOTP } from "@/lib/utils";
import { Sector, LocalChurch as Church, User, AdminUser as Admin } from '@repo/dto';


// Form schemas
export const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp_code: z.string().optional(), // Made optional as it's generated
  role: z.enum(['super_admin', 'church_admin', 'team_lead', 'member', 'guest']),
  used: z.boolean().default(false),
  expires_at: z.string(),
  sector_id: z.string().uuid().nullable().optional(),
  church_id: z.string().uuid().nullable().optional(),
  created_by_user_id: z.string().uuid().nullable().optional(),
  used_by_user_id: z.string().uuid().nullable().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface Invite {
  id: string;
  email: string;
  otp_code: string;
  role: string;
  used: boolean;
  expires_at: string;
  created_at: string;
  sector?: Sector,
  church?: Church,
  created_by_user_id?: Admin,
  used_by_user_id?: Partial<User>,
}

const SuperAdminInvites = () => {
  const { user } = useAuthStore();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [editingInvite, setEditingInvite] = useState<Invite | null>(null);
  const [churches, setChurches] = useState<Church[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [churchFilter, setChurchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const inviteData = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'member',
      sector_id: '',
      church_id: user?.church_id ?? '',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    },
  });

  // Check permissions
  if (!user || user.role !== 'super_admin') {
    return (
      <div className="p-6 page-background">
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don&apos;t have Super Admin permissions to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    fetchInvites();
    fetchSector();
    fetchChurches();
  }, []);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/otp-invites');
      setInvites(data || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
      toast({
        title: "Error",
        description: "Failed to fetch invites",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChurches = async () => {
    try {
      const { data } = await api.get('/churches');
      setChurches(data || []);
    } catch (error) {
      console.error('Error fetching churches:', error);
    }
  };

  const fetchSector = async () => {
    try {
      const { data } = await api.get('/sectors');
      setSectors(data || []);
    } catch (error) {
      console.error('Error fetching sectors:', error);
    }
  };

  const handleUpdateStatus = async (inviteId: string, used: boolean) => {
    try {
      setLoading(true);
      await api.put(`/otp-invites/${inviteId}/status`, { used });
      toast({
        title: "Success",
        description: `Invite ${used ? 'activated' : 'deactivated'} successfully`,
      });
      fetchInvites();
    } catch (error) {
      console.error('Error updating invite status:', error);
      toast({
        title: "Error",
        description: "Failed to update invite status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    inviteData.reset({
      email: '',
      role: 'member',
      sector_id: '',
      church_id: user?.church_id ?? '',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    });
  }

  const handleEdit = (invite: Invite) => {
    // setEditingInvite(invite);
    // form.reset({
    //   email: invite.email,
    //   role: invite.role as any,
    //   sector_id: invite.sector_id || '',
    //   expires_at: new Date(invite.expires_at),
    // });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.user_id) return;

    try {
      // Get form values
      const formValues = inviteData.getValues();
      setLoading(true);

      // Prepare data for insert (convert expires_at to string, handle optional fields)
      const insertData = {
        email: formValues.email,
        otp_code: generateOTP(),
        role: formValues.role,
        used: false,
        expires_at: formValues.expires_at ? new Date(formValues.expires_at).toISOString() : null,
        sector_id: formValues.sector_id && formValues.sector_id !== "none" ? formValues.sector_id : null,
        church_id: formValues.church_id && formValues.church_id !== "none" ? formValues.church_id : null,
        created_by_user_id: user.user_id,
      };

      inviteSchema.parse(insertData);
      console.error('Saving invite:', insertData);

      await api.post('/otp-invites/invite', {
        email: insertData.email,
        otp_code: insertData.otp_code,
        role: insertData.role,
        used: insertData.used,
        expires_at: insertData.expires_at,
        sector_id: insertData.sector_id,
        church_id: insertData.church_id,
        created_by_user_id: insertData.created_by_user_id,
      });

      toast({
        title: "Success",
        description: "Invite created successfully",
      });

      inviteData.reset();
      setEditingInvite(null);
      setIsDialogOpen(false);
      fetchInvites();
    } catch (error) {
      console.error('Error saving invite:', error);
      toast({
        title: "Error",
        description: `Failed to save invite.`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (inviteId: string) => {
    if (!confirm('Are you sure you want to delete this invite?')) return;

    try {
      setLoading(true);
      await api.delete(`/otp-invites/${inviteId}`);

      toast({
        title: "Success",
        description: "Invite deleted successfully",
      });
      fetchInvites();
    } catch (error) {
      console.error('Error deleting invite:', error);
      toast({
        title: "Error",
        description: "Failed to delete invite",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      super_admin: 'bg-red-100 text-red-800',
      church_admin: 'bg-purple-100 text-purple-800',
      team_lead: 'bg-blue-100 text-blue-800',
      member: 'bg-green-100 text-green-800',
      guest: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge className={roleColors[role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'}>
        {role.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = (invite: Invite) => {
    if (invite.used) {
      return <Badge className="bg-green-100 text-green-800">USED</Badge>;
    } else if (new Date(invite.expires_at || '') < new Date()) {
      return <Badge className="bg-red-100 text-red-800">EXPIRED</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">UNUSED</Badge>;
    }
  };

  const filteredInvites = invites.filter(invite => {
    const matchesSearch = invite.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invite.otp_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || invite.role === roleFilter;
    const matchesChurch = churchFilter === 'all' || invite.church?.church_id === churchFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'used' && invite.used) ||
      (statusFilter === 'unused' && !invite.used) ||
      (statusFilter === 'expired' && new Date(invite.expires_at || '') < new Date());

    return matchesSearch && matchesRole && matchesChurch && matchesStatus;
  });

  return (
    <div className="p-6 page-background space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Member Invites
          </h1>
          <p className="text-muted-foreground">Manage invites for new members</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Create New Invite
              </DialogTitle>
            </DialogHeader>
            <Form {...inviteData}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                  control={inviteData.control}
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
                  control={inviteData.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="team_lead">Team Lead</SelectItem>
                          <SelectItem value="church_admin">Church Admin</SelectItem>
                          <SelectItem value="guest">Guest</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={inviteData.control}
                  name="church_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Church Center (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your Center" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {churches.map((church) => (
                            <SelectItem key={church.church_id} value={church.church_id}>
                              {church.name}-{church.center}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Show sector field only if a church is selected */}
                {inviteData.watch('church_id') && (
                  <FormField
                    control={inviteData.control}
                    name="sector_id"
                    render={({ field }) => {
                      const selectedChurchId = inviteData.watch('church_id');
                      const filteredSectors = sectors.filter((sector) => sector.church_id === selectedChurchId);
                      return (
                        <FormItem>
                          <FormLabel>Sector (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select sector" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredSectors.map((sector) => (
                                <SelectItem key={sector.sector_id} value={sector.sector_id || ''}>
                                  {sector.sector_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                <FormField
                  control={inviteData.control}
                  name="expires_at"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expiry Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date()
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                    {loading ? "Saving..." : editingInvite ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or invite code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="church_admin">Church Admin</SelectItem>
                <SelectItem value="team_lead">Team Lead</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
            <Select value={churchFilter} onValueChange={setChurchFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by church" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Churches</SelectItem>
                {churches.map((church) => (
                  <SelectItem key={church.church_id} value={church.church_id}>
                    {church.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="unused">Unused</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invites Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Invites ({filteredInvites.length})</CardTitle>
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
                  <TableHead>Invite Code</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Used By</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No invites found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.otp_code}</TableCell>
                      <TableCell className="font-medium">{invite.email}</TableCell>
                      <TableCell>
                        {invite.used_by_user_id?.first_name} {invite.used_by_user_id?.last_name}
                      </TableCell>
                      <TableCell>{getRoleBadge(invite.role)}</TableCell>
                      <TableCell>{getStatusBadge(invite)}</TableCell>
                      <TableCell>
                        {new Date(invite.expires_at || '').toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {invite.created_by_user_id?.first_name} {invite.created_by_user_id?.last_name}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {!invite.used && new Date(invite.expires_at || '') > new Date() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateStatus(invite.id, true)}
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
                          {invite.used && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateStatus(invite.id, false)}
                            >
                              <XCircle className="h-4 w-4 text-yellow-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(invite.id)}
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

export default SuperAdminInvites;
