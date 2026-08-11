import React, { useState, useEffect, useCallback } from 'react';
import { MembershipService, Member, SaveMemberPayload } from '@/services/membershipService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CsvPreviewModal from '@/components/layout/CsvPreviewModal';
import { 
  Users, 
  Search, 
  UserPlus, 
  Pencil, 
  Trash2, 
  Filter, 
  RefreshCw,
  Phone,
  Mail,
  Building,
  Briefcase,
  FileSpreadsheet,
  Upload
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const MEMBERSHIP_STAGES = [
  { value: 'first_time_guest', label: 'First Time Guest' },
  { value: 'foundation_class', label: 'Foundation Class' },
  { value: 'sunday_school_module_1', label: 'Sunday School Module 1' },
  { value: 'sunday_school_module_2', label: 'Sunday School Module 2' },
  { value: 'sunday_school_module_3', label: 'Sunday School Module 3' },
  { value: 'membership_class', label: 'Membership Class' },
  { value: 'stewardship', label: 'Stewardship' },
  { value: 'mit', label: 'Minister In Training' },
  { value: 'resident_pastor', label: 'Resident Pastor' },
];

const USER_ROLES = [
  { value: 'church_admin', label: 'Church Admin' },
  { value: 'resident_pastor', label: 'Resident Pastor' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'steward', label: 'Steward' },
  { value: 'member', label: 'Member' },
  { value: 'first_timer', label: 'First Timer' },
  { value: 'guest', label: 'Guest' },
];

export default function InfoCenterMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  // Edit / Add modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);

  // CSV Upload State
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  const [formData, setFormData] = useState<SaveMemberPayload>({
    firstName: '',
    surname: '',
    email: '',
    phoneNumber: '',
    homeAddress: '',
    gender: '',
    jobOccupation: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    currentStage: 'first_time_guest',
  });

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await MembershipService.fetchMembers();
      setMembers(data);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to load members directory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleOpenAdd = () => {
    setSelectedMember(null);
    setFormData({
      firstName: '',
      surname: '',
      email: '',
      phoneNumber: '',
      homeAddress: '',
      gender: '',
      jobOccupation: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      currentStage: 'first_time_guest',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (m: Member) => {
    setSelectedMember(m);
    setFormData({
      firstName: m.firstName || '',
      surname: m.surname || '',
      email: m.email || '',
      phoneNumber: m.phoneNumber || '',
      homeAddress: m.homeAddress || '',
      gender: m.gender || '',
      jobOccupation: m.jobOccupation || '',
      emergencyContactName: m.emergencyContactName || '',
      emergencyContactPhone: m.emergencyContactPhone || '',
      currentStage: m.currentStage || 'first_time_guest',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.surname.trim()) {
      toast({ title: "Error", description: "First Name and Surname are required.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      if (selectedMember) {
        await MembershipService.updateMember(selectedMember.id, formData);
        toast({ title: "Success", description: "Member record updated" });
      } else {
        await MembershipService.addMember(formData);
        toast({ title: "Success", description: "New member created" });
      }
      setModalOpen(false);
      loadMembers();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Save Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: Member) => {
    if (!window.confirm(`Delete member record for ${m.firstName} ${m.surname}?`)) return;

    try {
      await MembershipService.deleteMember(m.id);
      toast({ title: "Deleted", description: "Member record removed" });
      loadMembers();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Delete Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    }
  };

  const filteredMembers = members.filter(m => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${m.firstName} ${m.surname} ${m.name}`.toLowerCase();
    const matchesSearch = !searchTerm || fullName.includes(searchLower) || (m.email && m.email.toLowerCase().includes(searchLower)) || (m.phoneNumber && m.phoneNumber.includes(searchTerm));
    const matchesStage = stageFilter === 'all' || m.currentStage === stageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl">
        <div>
          <Badge variant="outline" className="text-primary border-primary/30 mb-2">
            <Building className="w-3.5 h-3.5 mr-1" /> Information Desk Directory
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Member Creation & Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search, profile, and update member details across growth stages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={loadMembers} variant="outline" size="icon" className="h-9 w-9 rounded-xl" disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="sr-only">Refresh Directory</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh Directory</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setCsvModalOpen(true)} size="icon" variant="secondary" className="shadow-sm h-9 w-9 rounded-xl">
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
                <Button onClick={handleOpenAdd} size="icon" className="bg-primary text-primary-foreground h-9 w-9 rounded-xl">
                  <UserPlus className="w-4 h-4" />
                  <span className="sr-only">Create Member</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create Member</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto items-center">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Stage:
              </span>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {MEMBERSHIP_STAGES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/50">
          <CardTitle className="text-base font-semibold">
            Information Center Directory ({filteredMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50">
                  <TableHead className="font-semibold">Member Name & Role</TableHead>
                  <TableHead className="font-semibold">Current Stage</TableHead>
                  <TableHead className="font-semibold">Email / Phone</TableHead>
                  <TableHead className="font-semibold">Sector / Team</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading directory...</TableCell>
                  </TableRow>
                ) : filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No members found matching filter.</TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map(m => (
                    <TableRow key={m.id} className="hover:bg-secondary/40">
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground flex items-center gap-2">
                            {m.firstName} {m.surname}
                            {m.role && (
                              <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">
                                {m.role.replace(/_/g, ' ')}
                              </Badge>
                            )}
                          </div>
                          {m.jobOccupation && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Briefcase className="w-3 h-3" /> {m.jobOccupation}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {(m.currentStage || 'first_time_guest').replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          {m.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {m.email}</div>}
                          {m.phoneNumber && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {m.phoneNumber}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.sectorName || m.teamName || 'Unassigned'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpenEdit(m)}>
                            <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(m)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit / Add Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMember ? `Edit Member: ${selectedMember.firstName} ${selectedMember.surname}` : 'Create Member Record'}
            </DialogTitle>
            <DialogDescription>
              Information Center member profiling and contact details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Surname *</Label>
                <Input
                  id="surname"
                  value={formData.surname}
                  onChange={e => setFormData({ ...formData, surname: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber || ''}
                  onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentStage">Growth Stage</Label>
                <Select
                  value={formData.currentStage || 'first_time_guest'}
                  onValueChange={val => setFormData({ ...formData, currentStage: val })}
                >
                  <SelectTrigger id="currentStage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBERSHIP_STAGES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender || ''}
                  onValueChange={val => setFormData({ ...formData, gender: val })}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="homeAddress">Address</Label>
              <Input
                id="homeAddress"
                value={formData.homeAddress || ''}
                onChange={e => setFormData({ ...formData, homeAddress: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Bulk Profiling Modal */}
      <CsvPreviewModal 
        open={csvModalOpen} 
        onOpenChange={setCsvModalOpen} 
        onSuccess={loadMembers} 
      />
    </div>
  );
}
