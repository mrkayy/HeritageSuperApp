import React, { useState, useEffect, useCallback } from 'react';
import { MembershipService, Member, SaveMemberPayload } from '@/services/membershipService';
import { AdminBackOfficeServices } from '@/services/AdminBackOfficeServices';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  Cake, 
  Heart, 
  Calendar, 
  Filter, 
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Briefcase
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

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const formatStage = (stage?: string) => {
  if (!stage) return 'First Time Guest';
  const found = MEMBERSHIP_STAGES.find(s => s.value === stage);
  if (found) return found.label;
  return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatMonthName = (monthNum?: number) => {
  if (!monthNum) return null;
  const m = MONTHS.find(item => item.value === monthNum);
  return m ? m.label : null;
};

export default function MembershipTeamCRM() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  // Edit / Add modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<SaveMemberPayload>({
    firstName: '',
    surname: '',
    email: '',
    phoneNumber: '',
    homeAddress: '',
    gender: '',
    dateOfBirthDay: null,
    dateOfBirthMonth: null,
    maritalStatus: '',
    weddingAnniversaryDay: null,
    weddingAnniversaryMonth: null,
    jobOccupation: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    allergies: '',
    medicalNotes: '',
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
      dateOfBirthDay: null,
      dateOfBirthMonth: null,
      maritalStatus: '',
      weddingAnniversaryDay: null,
      weddingAnniversaryMonth: null,
      jobOccupation: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      allergies: '',
      medicalNotes: '',
      currentStage: 'first_time_guest',
    });
    setEditModalOpen(true);
  };

  const handleOpenEdit = (member: Member) => {
    setSelectedMember(member);
    setFormData({
      firstName: member.firstName || '',
      surname: member.surname || '',
      email: member.email || '',
      phoneNumber: member.phoneNumber || '',
      homeAddress: member.homeAddress || '',
      gender: member.gender || '',
      dateOfBirthDay: member.dateOfBirthDay || null,
      dateOfBirthMonth: member.dateOfBirthMonth || null,
      maritalStatus: member.maritalStatus || '',
      weddingAnniversaryDay: member.weddingAnniversaryDay || null,
      weddingAnniversaryMonth: member.weddingAnniversaryMonth || null,
      jobOccupation: member.jobOccupation || '',
      emergencyContactName: member.emergencyContactName || '',
      emergencyContactPhone: member.emergencyContactPhone || '',
      allergies: member.allergies || '',
      medicalNotes: member.medicalNotes || '',
      currentStage: member.currentStage || 'first_time_guest',
    });
    setEditModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.surname.trim()) {
      toast({
        title: "Validation Error",
        description: "First Name and Surname are required.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      if (selectedMember) {
        await MembershipService.updateMember(selectedMember.id, formData);
        toast({ title: "Success", description: "Member profile updated successfully" });
      } else {
        await MembershipService.addMember(formData);
        toast({ title: "Success", description: "Member added successfully" });
      }
      setEditModalOpen(false);
      loadMembers();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Save Failed",
        description: err.response?.data?.message || err.message || "Failed to save member profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: Member) => {
    if (!window.confirm(`Are you sure you want to delete member "${member.firstName} ${member.surname}"? This operation will remove all associated stage histories.`)) {
      return;
    }

    try {
      await MembershipService.deleteMember(member.id);
      toast({ title: "Member Deleted", description: `Member ${member.name} deleted` });
      loadMembers();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Delete Failed",
        description: err.response?.data?.message || err.message || "Failed to delete member",
        variant: "destructive",
      });
    }
  };

  // Filtered members list
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
            Membership CRM
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Member Management Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage birthdays, wedding anniversaries, stage progression, and contact info for all members.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadMembers} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleOpenAdd} size="sm" className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
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

      {/* Member Table */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/50 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Members Directory ({filteredMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="font-semibold">Member Name</TableHead>
                  <TableHead className="font-semibold">Current Stage</TableHead>
                  <TableHead className="font-semibold">Birthday (DOB)</TableHead>
                  <TableHead className="font-semibold">Wedding Anniversary</TableHead>
                  <TableHead className="font-semibold">Contact Info</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading members...
                    </TableCell>
                  </TableRow>
                ) : filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No members found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map(member => {
                    const monthName = formatMonthName(member.dateOfBirthMonth);
                    const annMonthName = formatMonthName(member.weddingAnniversaryMonth);
                    return (
                      <TableRow key={member.id} className="hover:bg-secondary/40">
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground flex items-center gap-2">
                              {member.firstName} {member.surname}
                              {member.role && (
                                <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">
                                  {member.role.replace(/_/g, ' ')}
                                </Badge>
                              )}
                            </div>
                            {member.jobOccupation && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Briefcase className="w-3 h-3" /> {member.jobOccupation}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal text-xs">
                            {formatStage(member.currentStage)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.dateOfBirthDay && monthName ? (
                            <div className="flex items-center gap-1.5 text-xs text-pink-600 dark:text-pink-400 font-medium">
                              <Cake className="w-3.5 h-3.5 flex-shrink-0" />
                              {member.dateOfBirthDay} {monthName}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Not specified</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.weddingAnniversaryDay && annMonthName ? (
                            <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                              <Heart className="w-3.5 h-3.5 flex-shrink-0" />
                              {member.weddingAnniversaryDay} {annMonthName}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Not specified</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-xs">
                            {member.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="w-3 h-3 text-muted-foreground" /> {member.email}
                              </div>
                            )}
                            {member.phoneNumber && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="w-3 h-3 text-muted-foreground" /> {member.phoneNumber}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpenEdit(member)}>
                              <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(member)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit / Add Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMember ? `Edit Member: ${selectedMember.firstName} ${selectedMember.surname}` : 'Add New Member'}
            </DialogTitle>
            <DialogDescription>
              Update member profile information, stage history, and celebration dates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="dates">Birth & Anniversary</TabsTrigger>
                <TabsTrigger value="other">Contact & Medical</TabsTrigger>
              </TabsList>

              {/* Tab 1: Basic Info */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="e.g. John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="surname">Surname *</Label>
                    <Input
                      id="surname"
                      value={formData.surname}
                      onChange={e => setFormData({ ...formData, surname: e.target.value })}
                      placeholder="e.g. Doe"
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
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber || ''}
                      onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="+234..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentStage">Current Membership Stage</Label>
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
              </TabsContent>

              {/* Tab 2: Birth & Wedding Anniversary */}
              <TabsContent value="dates" className="space-y-6">
                {/* Date of Birth Section */}
                <div className="space-y-3 p-4 rounded-xl border border-pink-500/20 bg-pink-500/5">
                  <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 font-semibold text-sm">
                    <Cake className="w-4 h-4" /> Date of Birth (Day & Month)
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dobMonth">Birth Month</Label>
                      <Select
                        value={formData.dateOfBirthMonth ? String(formData.dateOfBirthMonth) : ''}
                        onValueChange={val => setFormData({ ...formData, dateOfBirthMonth: val ? Number(val) : null })}
                      >
                        <SelectTrigger id="dobMonth">
                          <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(m => (
                            <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dobDay">Birth Day</Label>
                      <Select
                        value={formData.dateOfBirthDay ? String(formData.dateOfBirthDay) : ''}
                        onValueChange={val => setFormData({ ...formData, dateOfBirthDay: val ? Number(val) : null })}
                      >
                        <SelectTrigger id="dobDay">
                          <SelectValue placeholder="Select Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map(d => (
                            <SelectItem key={d} value={String(d)}>Day {d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Wedding Anniversary Section */}
                <div className="space-y-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-sm">
                    <Heart className="w-4 h-4" /> Wedding Anniversary (Day & Month)
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="annMonth">Anniversary Month</Label>
                      <Select
                        value={formData.weddingAnniversaryMonth ? String(formData.weddingAnniversaryMonth) : ''}
                        onValueChange={val => setFormData({ ...formData, weddingAnniversaryMonth: val ? Number(val) : null })}
                      >
                        <SelectTrigger id="annMonth">
                          <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(m => (
                            <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annDay">Anniversary Day</Label>
                      <Select
                        value={formData.weddingAnniversaryDay ? String(formData.weddingAnniversaryDay) : ''}
                        onValueChange={val => setFormData({ ...formData, weddingAnniversaryDay: val ? Number(val) : null })}
                      >
                        <SelectTrigger id="annDay">
                          <SelectValue placeholder="Select Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map(d => (
                            <SelectItem key={d} value={String(d)}>Day {d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select
                    value={formData.maritalStatus || ''}
                    onValueChange={val => setFormData({ ...formData, maritalStatus: val })}
                  >
                    <SelectTrigger id="maritalStatus">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Tab 3: Contact & Medical */}
              <TabsContent value="other" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="homeAddress">Home Address</Label>
                  <Input
                    id="homeAddress"
                    value={formData.homeAddress || ''}
                    onChange={e => setFormData({ ...formData, homeAddress: e.target.value })}
                    placeholder="Residential address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobOccupation">Job / Occupation</Label>
                  <Input
                    id="jobOccupation"
                    value={formData.jobOccupation || ''}
                    onChange={e => setFormData({ ...formData, jobOccupation: e.target.value })}
                    placeholder="e.g. Software Engineer, Accountant"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyName">Emergency Contact Name</Label>
                    <Input
                      id="emergencyName"
                      value={formData.emergencyContactName || ''}
                      onChange={e => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                    <Input
                      id="emergencyPhone"
                      value={formData.emergencyContactPhone || ''}
                      onChange={e => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
