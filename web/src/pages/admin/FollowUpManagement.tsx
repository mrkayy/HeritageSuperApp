
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MessageSquare, Plus, Pencil, Trash2, Search, UserCheck, Clock, CheckCircle } from 'lucide-react';
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Calendar } from '@/components/ui/calendar';

// Form schemas
const followUpSchema = z.object({
  soul_id: z.string().min(1, "Soul is required"),
  assigned_to_user_id: z.string().min(1, "Assigned user is required"),
  due_date: z.date({
    required_error: "Due date is required",
  }),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  notes: z.string().optional(),
});

type FollowUpFormData = z.infer<typeof followUpSchema>;

interface FollowUp {
  follow_up_id: string;
  soul_id?: string | null;
  assigned_to_user_id?: string | null;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | null;
  created_at?: string | null;
  soul?: {
    full_name: string;
    phone: string;
  } | null;
  assigned_user?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface Soul {
  soul_id: string;
  full_name: string;
  phone: string;
}

interface User {
  user_id: string;
  first_name: string;
  last_name: string;
}

const FollowUpManagement = () => {
  const { user } = useAuthStore();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [souls, setSouls] = useState<Soul[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);

  const form = useForm<FollowUpFormData>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      status: 'pending',
      notes: '', // Initialize notes to an empty string to avoid undefined issues
    },
  });

  useEffect(() => {
    fetchFollowUps();
    fetchSouls();
    fetchUsers();
  }, []);

  // Check permissions
  if (!user || (user.role !== 'church_admin' && user.role !== 'super_admin' && user.role !== 'team_lead')) {
    return (
      <div className="p-6 page-background">
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don&apos;t have permission to manage follow-ups.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/follow-up');
      setFollowUps(data || []);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
      toast({
        title: "Error",
        description: "Failed to fetch follow-ups",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSouls = async () => {
    try {
      const { data } = await api.get('/souls', { params: { is_active: true } });
      setSouls(data || []);
    } catch (error) {
      console.error('Error fetching souls:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const onSubmit = async (data: FollowUpFormData) => {
    try {
      setLoading(true);

      if (editingFollowUp) {
        await api.patch(`/follow-up/${editingFollowUp.follow_up_id}`, {
          soul_id: data.soul_id,
          assigned_to_user_id: data.assigned_to_user_id,
          due_date: data.due_date.toISOString().split('T')[0],
          status: data.status,
        });
        toast({ title: "Success", description: "Follow-up updated successfully" });
        setIsEditOpen(false);
        setEditingFollowUp(null);
      } else {
        await api.post('/follow-up', {
          soul_id: data.soul_id,
          assigned_to_user_id: data.assigned_to_user_id,
          due_date: data.due_date.toISOString().split('T')[0],
          status: data.status,
        });
        toast({ title: "Success", description: "Follow-up created successfully" });
        setIsCreateOpen(false);
      }

      form.reset();
      fetchFollowUps();
    } catch (error) {
      console.error('Error saving follow-up:', error);
      toast({
        title: "Error",
        description: "Failed to save follow-up",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (followUp: FollowUp) => {
    setEditingFollowUp(followUp);
    form.reset({
      soul_id: followUp.soul_id ?? '',
      assigned_to_user_id: followUp.assigned_to_user_id ?? '',
      due_date: new Date(followUp.due_date),
      status: (followUp.status ?? 'pending') as 'pending' | 'in_progress' | 'completed' | 'cancelled',
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (followUpId: string) => {
    if (!confirm('Are you sure you want to delete this follow-up?')) return;

    try {
      setLoading(true);
      await api.delete(`/follow-up/${followUpId}`);
      toast({ title: "Success", description: "Follow-up deleted successfully" });
      fetchFollowUps();
    } catch (error) {
      console.error('Error deleting follow-up:', error);
      toast({
        title: "Error",
        description: "Failed to delete follow-up",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      in_progress: { color: 'bg-blue-100 text-blue-800', icon: UserCheck },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: Trash2 },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const IconComponent = config?.icon || Clock;

    return (
      <Badge className={config?.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const filteredFollowUps = followUps.filter(followUp => {
    const matchesSearch = followUp.soul?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      followUp.assigned_user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      followUp.assigned_user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || followUp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const FormContent = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="soul_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Soul</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a soul" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {souls.map((soul) => (
                    <SelectItem key={soul.soul_id} value={soul.soul_id}>
                      {soul.full_name} - {soul.phone}
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
          name="assigned_to_user_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign To</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.first_name} {user.last_name}
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
          name="due_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date</FormLabel>
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

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
            onClick={() => {
              setIsCreateOpen(false);
              setIsEditOpen(false);
              form.reset();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : editingFollowUp ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="p-6 page-background space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Follow-up Management
          </h1>
          <p className="text-muted-foreground">Assign and manage soul follow-ups</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Assign Follow-up
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Assign New Follow-up</DialogTitle>
            </DialogHeader>
            <FormContent />
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
                placeholder="Search by soul name or assigned user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Follow-ups Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Follow-ups ({filteredFollowUps.length})</CardTitle>
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
                  <TableHead>Soul</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFollowUps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No follow-ups found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFollowUps.map((followUp) => (
                    <TableRow key={followUp.follow_up_id}>
                      <TableCell className="font-medium">
                        {followUp.soul?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{followUp.soul?.phone || 'N/A'}</TableCell>
                      <TableCell>
                        {followUp.assigned_user?.first_name} {followUp.assigned_user?.last_name}
                      </TableCell>
                      <TableCell>
                        {new Date(followUp.due_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {followUp.status ? getStatusBadge(followUp.status) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {followUp.created_at ? new Date(followUp.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(followUp)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(followUp.follow_up_id)}
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Follow-up</DialogTitle>
          </DialogHeader>
          <FormContent />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FollowUpManagement;
