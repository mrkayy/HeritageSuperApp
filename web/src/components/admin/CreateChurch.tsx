import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { LocalChurch } from '@/integrations/type_def';
import { useZodForm, FieldError } from '@/hooks/useZodForm';
import { churchSchema, type ChurchFormValues } from '@/lib/schemas/admin';

const CreateChurch = () => {
  const { user } = useAuthStore();
  const [churches, setChurches] = useState<LocalChurch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChurch, setEditingChurch] = useState<LocalChurch | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'church_admin';

  const form = useZodForm({
    schema: churchSchema,
    initialValues: { name: '', center: '', description: '' },
  });

  useEffect(() => {
    fetchChurches();
  }, []);

  const fetchChurches = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/churches');
      setChurches(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch churches.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ChurchFormValues) => {
    if (!isAdmin) {
      toast({ title: "Access Denied", description: "Only admin users can perform this operation.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingChurch && editingChurch.church_id) {
        await api.put(`/churches/${editingChurch.church_id}`, data);
        toast({ title: "Church Updated", description: "Local church has been successfully updated." });
      } else {
        await api.post('/churches', data);
        toast({ title: "Church Created", description: "Local church has been successfully created." });
      }
      form.reset();
      setEditingChurch(null);
      setIsDialogOpen(false);
      fetchChurches();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save church. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (church: LocalChurch) => {
    setEditingChurch(church);
    form.reset({
      name: church.name || '',
      center: church.center || '',
      description: church.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (churchId: string | undefined) => {
    if (!isAdmin) {
      toast({ title: "Access Denied", description: "Only admin users can perform this operation.", variant: "destructive" });
      return;
    }
    if (!churchId || !confirm('Are you sure you want to delete this church?')) return;

    try {
      await api.delete(`/churches/${churchId}`);
      toast({ title: "Church Deleted", description: "Local church has been successfully deleted." });
      fetchChurches();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete church. Please try again.", variant: "destructive" });
    }
  };

  const openCreateDialog = () => {
    form.reset();
    setEditingChurch(null);
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div>Loading churches...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Local Churches
          </CardTitle>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Church
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingChurch ? 'Edit Church' : 'Create New Church'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Church Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter church name"
                        {...form.getInputProps('name')}
                      />
                      <FieldError message={form.errors.name} />
                    </div>
                    <div>
                      <Label htmlFor="center">Center</Label>
                      <Input
                        id="center"
                        placeholder="eg. Ikeja Center"
                        {...form.getInputProps('center')}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of the church"
                      rows={3}
                      {...form.getInputProps('description')}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : (editingChurch ? 'Update Church' : 'Create Church')}
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
                <TableHead>Center</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {churches.map((church) => (
                <TableRow key={church.church_id!}>
                  <TableCell className="font-medium">{church.name}</TableCell>
                  <TableCell>{church.center}</TableCell>
                  <TableCell>{church.slug || '-'}</TableCell>
                  <TableCell>{church.description || '-'}</TableCell>
                  <TableCell>{church.created_at ? new Date(church.created_at).toLocaleDateString() : '-'}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(church)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(church.church_id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {churches.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No churches found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateChurch;
