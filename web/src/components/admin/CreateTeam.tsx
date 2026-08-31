import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { useZodForm, FieldError } from '@/hooks/useZodForm';
import { teamSchema, type TeamFormValues } from '@/lib/schemas/admin';

interface Team {
  team_id?: string;
  name: string;
  description?: string;
  created_at?: string;
}

const CreateTeam = () => {
  const { user } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'church_admin';

  const form = useZodForm({
    schema: teamSchema,
    initialValues: { name: '', description: '' },
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data } = await api.get('/teams');
      setTeams(data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch teams.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TeamFormValues) => {
    if (!isAdmin) {
      toast({ title: "Access Denied", description: "Only admin users can perform this operation.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const teamData = {
        name: data.name,
        description: data.description || null,
      };

      if (editingTeam) {
        await api.put(`/teams/${editingTeam.team_id}`, teamData);
        toast({ title: "Team Updated", description: "Team has been successfully updated." });
      } else {
        await api.post('/teams', teamData);
        toast({ title: "Team Created", description: "Team has been successfully created." });
      }

      form.reset();
      setEditingTeam(null);
      setIsDialogOpen(false);
      fetchTeams();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save team. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    form.reset({
      name: team.name,
      description: team.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (teamId: string) => {
    if (!isAdmin) {
      toast({ title: "Access Denied", description: "Only admin users can perform this operation.", variant: "destructive" });
      return;
    }
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      await api.delete(`/teams/${teamId}`);
      toast({ title: "Team Deleted", description: "Team has been successfully deleted." });
      fetchTeams();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete team. Please try again.", variant: "destructive" });
    }
  };

  const openCreateDialog = () => {
    form.reset();
    setEditingTeam(null);
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div>Loading teams...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Teams
          </CardTitle>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingTeam ? 'Edit Team' : 'Create New Team'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Team Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter team name"
                        {...form.getInputProps('name')}
                      />
                      <FieldError message={form.errors.name} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of the team and its purpose"
                      rows={3}
                      {...form.getInputProps('description')}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : (editingTeam ? 'Update Team' : 'Create Team')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.team_id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.description || '-'}</TableCell>
                  <TableCell>{team.created_at ? new Date(team.created_at).toLocaleDateString() : '-'}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(team)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(team.team_id || '')}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {teams.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No teams found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTeam;
