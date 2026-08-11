
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, UserPlus, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { cn, generateOTP } from "@/lib/utils";

import { Invite, Sector } from '@/integrations/type_def';

// Form schemas
const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(['super_admin', 'church_admin', 'team_lead', 'member', 'guest']),
  sector_id: z.string().optional(),
  expires_at: z.date({
    required_error: "Expiry date is required",
  }),
});

type InviteFormData = z.infer<typeof inviteSchema>;

// interface Invite {
//   id: string;
//   email: string;
//   otp_code: string;
//   role: string;
//   used: boolean;
//   expires_at: string;
//   created_at: string;
//   sector_id?: string;
// }

// interface Sector {
//   sector_id: string;
//   sector_name: string;
// }

const MemberInvites = () => {
  const { user } = useAuthStore();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvite, setEditingInvite] = useState<Invite | null>(null);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'member',
      sector_id: '',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  useEffect(() => {
    fetchInvites();
    fetchSectors();
  }, []);

  const fetchInvites = async () => {
    if (!user?.church_id || !user?.user_id) return;

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

  const fetchSectors = async () => {
    if (!user?.church_id) return;

    try {
      const { data } = await api.get('/sectors');

      setSectors(data || []);
    } catch (error) {
      console.error('Error fetching sectors:', error);
    }
  };

  const onSubmit = async (data: InviteFormData) => {
    if (!user?.user_id) return;

    try {
      setLoading(true);

      const inviteData = {
        email: data.email,
        otp_code: generateOTP(),
        role: data.role,
        sector_id: data.sector_id || null,
        expires_at: data.expires_at.toISOString(),
        created_by_user_id: user.user_id,
        used: false
      };

      if (editingInvite) {
        await api.patch(`/otp-invites/${editingInvite.id}`, inviteData);

        toast({
          title: "Success",
          description: "Invite updated successfully",
        });
      } else {
        await api.post('/otp-invites/invite', inviteData);

        toast({
          title: "Success",
          description: "Invite created successfully",
        });
      }

      form.reset();
      setEditingInvite(null);
      setIsDialogOpen(false);
      fetchInvites();
    } catch (error) {
      console.error('Error saving invite:', error);
      toast({
        title: "Error",
        description: "Failed to save invite",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (invite: Invite) => {
    setEditingInvite(invite);
    form.reset({
      email: invite.email,
      role: invite.role,
      sector_id: invite.sector_id || '',
      expires_at: new Date(invite.expires_at),
    });
    setIsDialogOpen(true);
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

  const resetForm = () => {
    form.reset({
      email: '',
      role: 'member',
      sector_id: '',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    setEditingInvite(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Member Invites
          </h1>
          <p className="text-muted-foreground">Invite new members to join your church</p>
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
                {editingInvite ? 'Edit Invite' : 'Create New Invite'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  control={form.control}
                  name="sector_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sector (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sector" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No Sector</SelectItem>
                          {sectors.map((sector) => (
                            <SelectItem key={sector.sector_id} value={sector.sector_id}>
                              {sector.sector_name}
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
                            selected={field.value}
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

      {/* Invites Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invites ({invites.length})</CardTitle>
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
                  <TableHead>Email</TableHead>
                  <TableHead>OTP Code</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No invites found. Create your first invite to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">{invite.email}</TableCell>
                      <TableCell className="font-mono">{invite.otp_code}</TableCell>
                      <TableCell className="capitalize">{invite.role.replace('_', ' ')}</TableCell>
                      <TableCell>
                        {invite.sector_id ?
                          sectors.find(s => s.sector_id === invite.sector_id)?.sector_name || 'Unknown' :
                          'No Sector'
                        }
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${invite.used ? 'bg-green-100 text-green-800' :
                          new Date(invite.expires_at) < new Date() ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                          {invite.used ? 'Used' :
                            new Date(invite.expires_at) < new Date() ? 'Expired' : 'Active'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(invite)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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

export default MemberInvites;
