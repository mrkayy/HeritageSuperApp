import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Building2, 
  Plus, 
  Search, 
  Users, 
  MapPin, 
  ShieldCheck, 
  Archive, 
  RotateCcw, 
  Edit3, 
  UserCheck, 
  Loader2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SuperAdminService, LocalChurchBranch, CreateBranchPayload, UpdateBranchPayload } from '@/services/superAdminService';
import api from '@/lib/api';

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function SuperAdminChurches() {
  const [branches, setBranches] = useState<LocalChurchBranch[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [leadershipOpen, setLeadershipOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<LocalChurchBranch | null>(null);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPastorId, setFormPastorId] = useState('');
  const [formAdminId, setFormAdminId] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [branchList, userListRes] = await Promise.all([
        SuperAdminService.listBranches(),
        api.get('/users').catch(() => ({ data: [] })),
      ]);
      setBranches(branchList);
      
      const mappedUsers: UserOption[] = (userListRes.data || []).map((u: any) => ({
        id: u.id || u.user_id,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
        email: u.email,
        role: u.role || 'member',
      }));
      setUsers(mappedUsers);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load church branches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenProvision = () => {
    setFormName('');
    setFormSlug('');
    setFormAddress('');
    setFormCity('');
    setFormState('Lagos');
    setFormPastorId('');
    setFormAdminId('');
    setProvisionOpen(true);
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast({ title: "Validation Error", description: "Branch Name is required", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateBranchPayload = {
        name: formName.trim(),
        slug: formSlug.trim() || formName.trim().toLowerCase().replace(/\s+/g, '-'),
        center: formName.trim(),
        address: formAddress.trim() || undefined,
        city: formCity.trim() || undefined,
        state: formState.trim() || undefined,
        resident_pastor_id: formPastorId || undefined,
        church_admin_id: formAdminId || undefined,
      };

      await SuperAdminService.createBranch(payload);
      toast({
        title: "Branch Provisioned",
        description: `Successfully created ${payload.name}. Default local configurations initialized.`,
      });
      setProvisionOpen(false);
      loadData();
    } catch (err: any) {
      toast({
        title: "Provisioning Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (branch: LocalChurchBranch) => {
    setSelectedBranch(branch);
    setFormName(branch.name);
    setFormSlug(branch.slug);
    setFormAddress(branch.address || '');
    setFormCity(branch.city || '');
    setFormState(branch.state || '');
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    try {
      setSubmitting(true);
      const payload: UpdateBranchPayload = {
        name: formName.trim(),
        slug: formSlug.trim(),
        address: formAddress.trim() || undefined,
        city: formCity.trim() || undefined,
        state: formState.trim() || undefined,
      };

      await SuperAdminService.updateBranch(selectedBranch.id, payload);
      toast({
        title: "Branch Updated",
        description: "Branch details saved successfully.",
      });
      setEditOpen(false);
      loadData();
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenLeadership = (branch: LocalChurchBranch) => {
    setSelectedBranch(branch);
    setFormPastorId(branch.resident_pastor_id || '');
    setFormAdminId(branch.church_admin_id || '');
    setLeadershipOpen(true);
  };

  const handleReassignLeadership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    try {
      setSubmitting(true);
      await SuperAdminService.reassignLeadership(selectedBranch.id, {
        resident_pastor_id: formPastorId,
        church_admin_id: formAdminId,
      });

      toast({
        title: "Leadership Reassigned",
        description: `Updated leadership appointments for ${selectedBranch.name}.`,
      });
      setLeadershipOpen(false);
      loadData();
    } catch (err: any) {
      toast({
        title: "Reassignment Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (branch: LocalChurchBranch) => {
    try {
      const res = await SuperAdminService.toggleBranchStatus(branch.id);
      toast({
        title: res.is_active ? "Branch Restored" : "Branch Archived",
        description: `${branch.name} is now ${res.is_active ? 'active' : 'archived'}. Historical data preserved.`,
      });
      loadData();
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    }
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.city && b.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-primary border-primary/30">
              <Building2 className="w-3.5 h-3.5 mr-1" /> Super Admin
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Heritage of Faith International Church
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Local Church Branches & Leadership
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Provision isolated branch tenants, assign Resident Pastors & Church Admins, and manage archival lifecycle.
          </p>
        </div>
        <Button onClick={handleOpenProvision} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Provision New Branch
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Branches</p>
                <h3 className="text-3xl font-bold mt-1 text-foreground">{branches.length}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Tenants</p>
                <h3 className="text-3xl font-bold mt-1 text-emerald-500">
                  {branches.filter(b => b.is_active).length}
                </h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Archived Branches</p>
                <h3 className="text-3xl font-bold mt-1 text-muted-foreground">
                  {branches.filter(b => !b.is_active).length}
                </h3>
              </div>
              <div className="p-3 bg-muted rounded-xl text-muted-foreground">
                <Archive className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Branch Directory</CardTitle>
              <CardDescription>All chartered local church branches and their appointed leadership.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search branches or city..."
                className="pl-9 text-xs"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading chartered branches...</p>
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium">No church branches found</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table className="text-xs">
                <TableHeader className="bg-secondary/40">
                  <TableRow>
                    <TableHead>Branch Name & Slug</TableHead>
                    <TableHead>Physical Location</TableHead>
                    <TableHead>Resident Pastor</TableHead>
                    <TableHead>Church Admin</TableHead>
                    <TableHead>Membership</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranches.map(branch => (
                    <TableRow key={branch.id} className="hover:bg-secondary/10">
                      <TableCell>
                        <div className="font-semibold text-foreground text-sm">{branch.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">slug: {branch.slug}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                          <span>{branch.address || 'Address pending'}, {branch.city || 'Lagos'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {branch.resident_pastor_name ? (
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                            <span className="font-medium text-foreground">{branch.resident_pastor_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {branch.church_admin_name ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-medium text-foreground">{branch.church_admin_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 font-mono">
                          <Users className="w-3 h-3" /> {branch.total_members}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {branch.is_active ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground">
                            Archived
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleOpenLeadership(branch)}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-primary" /> Leadership
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleOpenEdit(branch)}
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 text-xs ${branch.is_active ? 'text-rose-600 hover:text-rose-700' : 'text-emerald-600 hover:text-emerald-700'}`}
                          onClick={() => handleToggleStatus(branch)}
                        >
                          {branch.is_active ? (
                            <>
                              <Archive className="w-3.5 h-3.5 mr-1" /> Archive
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal 1: Provision New Branch */}
      <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Building2 className="w-5 h-5 text-primary" />
              Provision New Local Church Branch
            </DialogTitle>
            <DialogDescription>
              Create a new church branch with isolated tenant data and local ministry defaults.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleProvision} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="branchName">Branch Name *</Label>
              <Input
                id="branchName"
                placeholder="e.g. Heritage of Faith — Lekki Center"
                value={formName}
                onChange={e => {
                  setFormName(e.target.value);
                  if (!formSlug || formSlug === formName.toLowerCase().replace(/\s+/g, '-')) {
                    setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  }
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchSlug">Tenant Slug (Unique URL identifier) *</Label>
              <Input
                id="branchSlug"
                placeholder="e.g. lekki"
                value={formSlug}
                onChange={e => setFormSlug(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="branchCity">City</Label>
                <Input
                  id="branchCity"
                  placeholder="e.g. Lekki"
                  value={formCity}
                  onChange={e => setFormCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchState">State</Label>
                <Input
                  id="branchState"
                  placeholder="e.g. Lagos"
                  value={formState}
                  onChange={e => setFormState(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchAddress">Physical Address</Label>
              <Input
                id="branchAddress"
                placeholder="e.g. Plot 12, Admiralty Way, Lekki Phase 1"
                value={formAddress}
                onChange={e => setFormAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pastorSelect">Appoint Resident Pastor (Optional)</Label>
              <select
                id="pastorSelect"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                value={formPastorId}
                onChange={e => setFormPastorId(e.target.value)}
              >
                <option value="">-- Leave Unassigned / Invite Later --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminSelect">Appoint Church Admin (Optional)</Label>
              <select
                id="adminSelect"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                value={formAdminId}
                onChange={e => setFormAdminId(e.target.value)}
              >
                <option value="">-- Leave Unassigned / Invite Later --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setProvisionOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90">
                {submitting ? "Provisioning..." : "Provision Branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Edit Branch Details */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Branch Details</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editName">Branch Name</Label>
              <Input
                id="editName"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editSlug">Tenant Slug</Label>
              <Input
                id="editSlug"
                value={formSlug}
                onChange={e => setFormSlug(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="editCity">City</Label>
                <Input
                  id="editCity"
                  value={formCity}
                  onChange={e => setFormCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editState">State</Label>
                <Input
                  id="editState"
                  value={formState}
                  onChange={e => setFormState(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editAddress">Physical Address</Label>
              <Input
                id="editAddress"
                value={formAddress}
                onChange={e => setFormAddress(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Reassign Leadership */}
      <Dialog open={leadershipOpen} onOpenChange={setLeadershipOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Reassign Branch Leadership
            </DialogTitle>
            <DialogDescription>
              Transfer or update appointed pastors and administrators for {selectedBranch?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReassignLeadership} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reassignPastor">Resident Pastor</Label>
              <select
                id="reassignPastor"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                value={formPastorId}
                onChange={e => setFormPastorId(e.target.value)}
              >
                <option value="">-- No Pastor Assigned --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reassignAdmin">Church Admin</Label>
              <select
                id="reassignAdmin"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                value={formAdminId}
                onChange={e => setFormAdminId(e.target.value)}
              >
                <option value="">-- No Admin Assigned --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-secondary/30 rounded-xl text-xs text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500 mt-0.5" />
              <span>Reassigning leadership instantly grants branch tenant management and transfers dashboard authority.</span>
            </div>

            <DialogFooter className="pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setLeadershipOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90">
                {submitting ? "Updating..." : "Save Appointments"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
