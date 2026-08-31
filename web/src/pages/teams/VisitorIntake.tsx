import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InfoCenterService, Visitor } from '@/services/infoCenterService';
import { MembershipService, Member } from '@/services/membershipService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  UserPlus, 
  Phone, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  UserCheck, 
  Edit3, 
  Search,
  Users,
  FileSpreadsheet
} from 'lucide-react';
import VisitorCsvPreviewModal from '@/components/layout/VisitorCsvPreviewModal';
import { toast } from '@/hooks/use-toast';
import { useZodForm, FieldError } from '@/hooks/useZodForm';
import { visitorIntakeSchema, type VisitorIntakeFormValues } from '@/lib/schemas/infocenter';

const defaultValues: VisitorIntakeFormValues = {
  first_name: '',
  last_name: '',
  phone_number: '',
  gender: 'male',
  address: '',
  email: '',
  prayer_request: '',
  invited_by_member_id: '',
  invited_by_text: '',
  notes: '',
};

export default function VisitorIntake() {
  const navigate = useNavigate();
  const [duplicateVisitor, setDuplicateVisitor] = useState<Visitor | null>(null);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [isSubsequentMarking, setIsSubsequentMarking] = useState(false);
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // Inviter Selection State
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviterMode, setInviterMode] = useState<'member' | 'custom'>('member');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const form = useZodForm({
    schema: visitorIntakeSchema,
    initialValues: defaultValues,
  });

  // Fetch church members for inviter lookup
  useEffect(() => {
    async function loadMembers() {
      setLoadingMembers(true);
      try {
        const data = await MembershipService.fetchMembers();
        setMembers(data || []);
      } catch (err) {
        console.error('Failed to load members for inviter dropdown:', err);
      } finally {
        setLoadingMembers(false);
      }
    }
    loadMembers();
  }, []);

  // Check phone duplicate
  const checkPhoneDuplicate = useCallback(async (phone: string) => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 7) {
      setDuplicateVisitor(null);
      setPhoneChecked(false);
      return;
    }
    try {
      const existing = await InfoCenterService.checkPhone(cleanPhone);
      if (existing) {
        setDuplicateVisitor(existing);
        setDuplicateModalOpen(true);
      } else {
        setDuplicateVisitor(null);
      }
      setPhoneChecked(true);
    } catch (err) {
      console.error('Error checking duplicate phone:', err);
    }
  }, []);

  // Auto-trigger duplicate check on blur
  const handlePhoneBlur = () => {
    if (form.values.phone_number && !isEditMode) {
      checkPhoneDuplicate(form.values.phone_number);
    }
  };

  // Option A: Mark Subsequent Visit
  const handleMarkSubsequentVisit = async () => {
    if (!duplicateVisitor) return;
    setIsSubsequentMarking(true);
    try {
      await InfoCenterService.markAttendance({ visitor_id: duplicateVisitor.visitor_id });
      toast({
        title: "Subsequent Visit Marked",
        description: `Marked present for today's service! Total visits: ${duplicateVisitor.visit_count + 1}`,
      });
      setDuplicateModalOpen(false);
      setDuplicateVisitor(null);
      setPhoneChecked(false);
      form.reset();
    } catch (err: any) {
      toast({
        title: "Attendance Failed",
        description: err.response?.data?.message || "Failed to mark attendance",
        variant: "destructive",
      });
    } finally {
      setIsSubsequentMarking(false);
    }
  };

  // Option B: Pre-fill form to update details
  const handlePrefillForUpdate = () => {
    if (!duplicateVisitor) return;
    setIsEditMode(true);
    form.setValue('first_name', duplicateVisitor.first_name);
    form.setValue('last_name', duplicateVisitor.last_name);
    form.setValue('phone_number', duplicateVisitor.phone_number);
    form.setValue('gender', duplicateVisitor.gender as 'male' | 'female');
    form.setValue('address', duplicateVisitor.address);
    form.setValue('email', duplicateVisitor.email || '');
    form.setValue('prayer_request', duplicateVisitor.prayer_request || '');
    form.setValue('invited_by_member_id', duplicateVisitor.invited_by_member_id || '');
    form.setValue('invited_by_text', duplicateVisitor.invited_by_text || '');
    form.setValue('notes', duplicateVisitor.notes || '');

    if (duplicateVisitor.invited_by_member_id) {
      setInviterMode('member');
    } else if (duplicateVisitor.invited_by_text) {
      setInviterMode('custom');
    }

    setDuplicateModalOpen(false);
    toast({
      title: "Profile Loaded for Editing",
      description: "You can now modify the visitor's details and save updates.",
    });
  };

  const onSubmit = async (data: VisitorIntakeFormValues) => {
    try {
      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        gender: data.gender,
        address: data.address,
        email: data.email || undefined,
        prayer_request: data.prayer_request || undefined,
        invited_by_member_id: inviterMode === 'member' && data.invited_by_member_id ? data.invited_by_member_id : undefined,
        invited_by_text: inviterMode === 'custom' && data.invited_by_text ? data.invited_by_text : undefined,
        notes: data.notes || undefined,
      };

      await InfoCenterService.createVisitor(payload);

      toast({
        title: isEditMode ? "Visitor Profile Updated" : "First-Timer Registered",
        description: `${data.first_name} ${data.last_name} has been documented and service attendance logged.`,
      });

      form.reset();
      setDuplicateVisitor(null);
      setPhoneChecked(false);
      setIsEditMode(false);
    } catch (err: any) {
      toast({
        title: "Registration Failed",
        description: err.response?.data?.message || "Failed to register visitor",
        variant: "destructive",
      });
    }
  };

  // Filtered member list for inviter selection
  const filteredMembers = members.filter(m => {
    if (!memberSearchQuery) return true;
    const q = memberSearchQuery.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.firstName?.toLowerCase().includes(q) ||
      m.surname?.toLowerCase().includes(q) ||
      m.phoneNumber?.includes(q)
    );
  });

  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-primary border-primary/30">
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Information Center
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Calendar className="w-3 h-3 mr-1" /> {todayFormatted}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {isEditMode ? 'Update Visitor Profile' : 'First-Timer Visitor Intake'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Capture first-time guest details and automatically log service presence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isEditMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCsvModalOpen(true)}
              className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              Bulk CSV Intake
            </Button>
          )}
          {isEditMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditMode(false);
                form.reset();
              }}
            >
              Cancel Edit
            </Button>
          )}
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Visitor Information</CardTitle>
          <CardDescription>Fields marked with * are required for follow-up.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Phone Number with Instant Duplicate Checking */}
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone_number"
                    type="tel"
                    autoComplete="tel"
                    {...form.getInputProps('phone_number')}
                    onBlur={handlePhoneBlur}
                    placeholder="e.g. 08012345678"
                    className="pl-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => checkPhoneDuplicate(form.values.phone_number)}
                  disabled={form.values.phone_number.length < 7}
                >
                  <Search className="w-4 h-4 mr-1.5" /> Check
                </Button>
              </div>
              <FieldError message={form.errors.phone_number} />
              
              {phoneChecked && !duplicateVisitor && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> New Visitor (No duplicate record found)
                </div>
              )}
            </div>

            {/* First & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  {...form.getInputProps('first_name')}
                  placeholder="e.g. Samuel"
                />
                <FieldError message={form.errors.first_name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name (Surname) *</Label>
                <Input
                  id="last_name"
                  {...form.getInputProps('last_name')}
                  placeholder="e.g. Adebayo"
                />
                <FieldError message={form.errors.last_name} />
              </div>
            </div>

            {/* Gender & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select {...form.getSelectProps('gender')}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={form.errors.gender} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.getInputProps('email')}
                  placeholder="samuel@example.com"
                />
                <FieldError message={form.errors.email} />
              </div>
            </div>

            {/* Residential Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Residential Address / Area *</Label>
              <Input
                id="address"
                {...form.getInputProps('address')}
                placeholder="e.g. 15 Adeola Odeku St, Victoria Island, Lagos"
              />
              <FieldError message={form.errors.address} />
            </div>

            {/* Who Invited You? (Search Church Member vs Free-text description) */}
            <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border/40">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" /> Who Invited You?
                </Label>
                <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border/50 text-xs">
                  <button
                    type="button"
                    onClick={() => setInviterMode('member')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      inviterMode === 'member' ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    Church Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviterMode('custom')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      inviterMode === 'custom' ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    Guest / Other
                  </button>
                </div>
              </div>

              {inviterMode === 'member' ? (
                <div className="space-y-2">
                  <Select
                    value={form.values.invited_by_member_id || ''}
                    onValueChange={(val) => form.setValue('invited_by_member_id', val)}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder={loadingMembers ? "Loading members..." : "Select inviting church member..."} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border/50">
                        <Input
                          placeholder="Search member by name/phone..."
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          className="h-8 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      {filteredMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{m.name || `${m.firstName} ${m.surname}`}</span>
                            {m.phoneNumber && (
                              <span className="text-xs text-muted-foreground">({m.phoneNumber})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                      {filteredMembers.length === 0 && (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                          No matching church members found.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Input
                  id="invited_by_text"
                  {...form.getInputProps('invited_by_text')}
                  placeholder="e.g. Saw church banner, invited by neighbor, social media, etc."
                  className="bg-background"
                />
              )}
            </div>

            {/* Prayer Request */}
            <div className="space-y-2">
              <Label htmlFor="prayer_request">Prayer Request / Special Needs</Label>
              <Textarea
                id="prayer_request"
                value={form.values.prayer_request}
                onChange={(e) => form.setValue('prayer_request', e.target.value)}
                placeholder="Share any prayer item or areas where the church can agree with you..."
                rows={3}
              />
            </div>

            {/* Additional Worker Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Information Center Worker Notes</Label>
              <Textarea
                id="notes"
                value={form.values.notes}
                onChange={(e) => form.setValue('notes', e.target.value)}
                placeholder="First impression, service attended (1st/2nd), language preference, etc."
                rows={2}
              />
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => navigate('/teams/info-center')}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.isSubmitting}>
                <UserPlus className="w-4 h-4 mr-1.5" />
                {form.isSubmitting ? 'Saving...' : isEditMode ? 'Save Updates' : 'Register First-Timer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Interactive Duplicate Resolution Modal */}
      <Dialog open={duplicateModalOpen} onOpenChange={setDuplicateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-xl">Existing Visitor Record Found</DialogTitle>
            <DialogDescription className="text-center">
              This phone number is already registered in this local church.
            </DialogDescription>
          </DialogHeader>

          {duplicateVisitor && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border/50 space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Full Name:</span>
                <span className="font-semibold text-foreground">
                  {duplicateVisitor.first_name} {duplicateVisitor.last_name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Phone:</span>
                <span>{duplicateVisitor.phone_number}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">First Attended:</span>
                <span>{new Date(duplicateVisitor.first_attendance_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Visits to Date:</span>
                <Badge variant="secondary" className="font-bold">
                  {duplicateVisitor.visit_count} Service(s)
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Status:</span>
                <Badge variant="outline" className="capitalize">
                  {duplicateVisitor.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          )}

          <div className="space-y-2.5 pt-2">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 py-5"
              onClick={handleMarkSubsequentVisit}
              disabled={isSubsequentMarking}
            >
              <UserCheck className="w-4 h-4" />
              {isSubsequentMarking ? 'Marking Attendance...' : 'Mark as Subsequent Visit (e.g. 2nd/3rd Timer)'}
            </Button>

            <Button
              variant="outline"
              className="w-full gap-2 py-5"
              onClick={handlePrefillForUpdate}
            >
              <Edit3 className="w-4 h-4" /> Update Visitor Profile Information
            </Button>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDuplicateModalOpen(false)}
              className="text-xs text-muted-foreground"
            >
              Dismiss & Continue Fresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk First-Timer CSV Modal */}
      <VisitorCsvPreviewModal
        open={csvModalOpen}
        onOpenChange={setCsvModalOpen}
        onImportComplete={() => {
          toast({
            title: "Intake Complete",
            description: "First-timers successfully imported and attendance logged.",
          });
        }}
      />
    </div>
  );
}
