import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Building } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Sector, LocalChurch as Church } from '@/integrations/type_def';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});



const CreateSector = () => {
  const { user } = useAuthStore();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);

  const [sectorForm, setSectorForm] = useState({
    sector_name: '',
    description: '',
    region: '',
    church_id: user?.role === 'super_admin' ? '' : user?.church_id || ''
  });

  useEffect(() => {
    fetchSectors();
    if (user?.role === 'super_admin') {
      fetchChurches();
    }
  }, [user]);

  const fetchSectors = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/sectors');
      setSectors(data || []);
    } catch (error) {
      console.error('Error fetching sectors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sectors",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sectorForm.sector_name.trim()) {
      toast({
        title: "Error",
        description: "Sector name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const sectorData = {
        sector_name: sectorForm.sector_name.trim(),
        description: sectorForm.description.trim() || undefined,
        region: sectorForm.region || undefined,
        church_id: sectorForm.church_id || user?.church_id
      };

      if (editingSector) {
        await api.put(`/sectors/${editingSector.sector_id}`, sectorData);

        toast({
          title: "Success",
          description: "Sector updated successfully",
        });
      } else {
        await api.post('/sectors', sectorData);

        toast({
          title: "Success",
          description: "Sector created successfully",
        });
      }

      setSectorForm({
        sector_name: '',
        description: '',
        region: '',
        church_id: user?.role === 'super_admin' ? '' : user?.church_id || ''
      });
      setEditingSector(null);
      setIsDialogOpen(false);
      fetchSectors();
    } catch (error) {
      console.error('Error saving sector:', error);
      toast({
        title: "Error",
        description: "Failed to save sector",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sector: Sector) => {
    setEditingSector(sector);
    setSectorForm({
      sector_name: sector.sector_name,
      description: sector.description || '',
      region: (sector as any).region || '',
      church_id: sector.church_id || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (sectorId: string) => {
    if (!confirm('Are you sure you want to delete this sector?')) return;

    try {
      setLoading(true);
      await api.delete(`/sectors/${sectorId}`);

      toast({
        title: "Success",
        description: "Sector deleted successfully",
      });
      fetchSectors();
    } catch (error) {
      console.error('Error deleting sector:', error);
      toast({
        title: "Error",
        description: "Failed to delete sector",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSectorForm({
      sector_name: '',
      description: '',
      region: '',
      church_id: user?.role === 'super_admin' ? '' : user?.church_id || ''
    });
    setEditingSector(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Sector Management</h2>
          <p className="text-muted-foreground">Create and manage sectors for your church</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sector
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSector ? 'Edit Sector' : 'Create New Sector'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sector_name">Sector Name *</Label>
                <Input
                  id="sector_name"
                  value={sectorForm.sector_name}
                  onChange={(e) => setSectorForm(prev => ({ ...prev, sector_name: e.target.value }))}
                  placeholder="Enter sector name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={sectorForm.description}
                  onChange={(e) => setSectorForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter sector description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Select value={sectorForm.region} onValueChange={(value) => setSectorForm(prev => ({ ...prev, region: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="North">North</SelectItem>
                    <SelectItem value="South">South</SelectItem>
                    <SelectItem value="East">East</SelectItem>
                    <SelectItem value="West">West</SelectItem>
                    <SelectItem value="Central">Central</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {user?.role === 'super_admin' && (
                <div className="space-y-2">
                  <Label htmlFor="church_id">Church *</Label>
                  <Select value={sectorForm.church_id} onValueChange={(value) => setSectorForm(prev => ({ ...prev, church_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select church" />
                    </SelectTrigger>
                    <SelectContent>
                      {churches.map((church) => (
                        <SelectItem key={church.church_id} value={church.church_id}>
                          {church.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingSector ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sectors List */}
      <Card>
        <CardHeader>
          <CardTitle>Sectors ({sectors.length})</CardTitle>
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
                  <TableHead>Description</TableHead>
                  <TableHead>Region</TableHead>
                  {user?.role === 'super_admin' && <TableHead>Church</TableHead>}
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === 'super_admin' ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      No sectors found. Create your first sector to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  sectors.map((sector) => (
                    <TableRow key={sector.sector_id}>
                      <TableCell className="font-medium">{sector.sector_name}</TableCell>
                      <TableCell>{sector.description || '-'}</TableCell>
                      <TableCell>
                        {(sector as any).region ? (
                          <Badge variant="outline">{(sector as any).region}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      {user?.role === 'super_admin' && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            {churches.find(c => c.church_id === sector.church_id)?.name || 'Unknown'}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        {new Date(sector.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(sector)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(sector.sector_id)}
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

export default CreateSector;
