import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  ShieldAlert, 
  UserPlus, 
  Search, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  Clock, 
  KeyRound, 
  Loader2,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SuperAdminService, LeadershipInvite, CreateLeadershipInvitePayload, LocalChurchBranch } from '@/services/superAdminService';

const LEADERSHIP_ROLES = [
  { value: 'resident_pastor', label: 'Resident Pastor (Branch Super-Admin)' },
  { value: 'church_admin', label: 'Church Admin' },
  { value: 'super_admin', label: 'Super Admin (Global Platform)' },
  { value: 'general_overseer', label: 'General Overseer' }
];

export default function SuperAdminInvites() {
  const [invites, setInvites] = useState<LeadershipInvite[]>([]);
  const [branches, setBranches] = useState<LocalChurchBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formEmail, setFormEmail] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formRole, setFormRole] = useState('resident_pastor');
  const [formChurchId, setFormChurchId] = useState('');

  // Copied state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [inviteList, branchList] = await Promise.all([
        SuperAdminService.listLeadershipInvites(),
        SuperAdminService.listBranches(),
      ]);
      setInvites(inviteList);
      setBranches(branchList);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load executive leadership invitations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenInvite = () => {
    setFormEmail('');
    setFormFirstName('');
    setFormLastName('');
    setFormRole('resident_pastor');
    setFormChurchId(branches[0]?.id || '');
    setInviteOpen(true);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formFirstName.trim() || !formLastName.trim()) {
      toast({ title: "Validation Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateLeadershipInvitePayload = {
        email: formEmail.trim(),
        first_name: formFirstName.trim(),
        last_name: formLastName.trim(),
        role: formRole,
        church_id: ['super_admin', 'general_overseer'].includes(formRole) ? undefined : (formChurchId || undefined),
      };

      const result = await SuperAdminService.createLeadershipInvite(payload);
      toast({
        title: "Leadership Magic Link Generated",
        description: `Dispatched single-use onboarding token for ${result.first_name} ${result.last_name} (${result.role}).`,
      });
      setInviteOpen(false);
      loadData();
    } catch (err: any) {
      toast({
        title: "Invitation Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await SuperAdminService.revokeLeadershipInvite(id);
      toast({
        title: "Invitation Revoked",
        description: "The magic link token has been permanently invalidated.",
      });
      loadData();
    } catch (err: any) {
      toast({
        title: "Revocation Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = (invite: LeadershipInvite) => {
    const link = `${window.location.origin}/auth/magic-login?code=${invite.otp_code}&email=${encodeURIComponent(invite.email)}`;
    navigator.clipboard.writeText(link);
    setCopiedId(invite.id);
    toast({
      title: "Magic Link Copied",
      description: "Invitation link copied to clipboard.",
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredInvites = invites.filter(inv => {
    const matchesSearch = 
      inv.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.last_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || inv.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-primary border-primary/30">
              <KeyRound className="w-3.5 h-3.5 mr-1" /> Super Admin
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Executive Onboarding Engine
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Leadership & Admin Magic Link Invitations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dispatch high-privilege single-use Magic Link invitations with automatic 72-hour expiration and Security PIN onboarding.
          </p>
        </div>
        <Button onClick={handleOpenInvite} className="gap-2 bg-primary hover:bg-primary/90">
          <Send className="w-4 h-4" /> Invite Executive Leader
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Leadership Invites</CardTitle>
              <CardDescription>View, copy, or revoke executive onboarding tokens.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="h-9 px-3 rounded-lg border border-input bg-background text-xs"
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                {LEADERSHIP_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-9 text-xs"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading invitations...</p>
            </div>
          ) : filteredInvites.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <KeyRound className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium">No invitations found</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table className="text-xs">
                <TableHeader className="bg-secondary/40">
                  <TableRow>
                    <TableHead>Invitee Details</TableHead>
                    <TableHead>Target Branch</TableHead>
                    <TableHead>Elevated Role</TableHead>
                    <TableHead>Token Status</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvites.map(invite => (
                    <TableRow key={invite.id} className="hover:bg-secondary/10">
                      <TableCell>
                        <div className="font-semibold text-foreground text-sm">
                          {invite.first_name} {invite.last_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">{invite.email}</div>
                      </TableCell>
                      <TableCell>
                        {invite.church_name ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                            <span className="font-medium text-foreground">{invite.church_name}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Global Organization</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {invite.role.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invite.used ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Accepted & Active
                          </Badge>
                        ) : new Date(invite.expires_at) < new Date() ? (
                          <Badge variant="destructive" className="gap-1">
                            <Clock className="w-3 h-3" /> Expired
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                            <Clock className="w-3 h-3" /> Pending (72h)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground font-mono">
                          {new Date(invite.expires_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {!invite.used && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleCopyLink(invite)}
                          >
                            {copiedId === invite.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            Copy Magic Link
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-rose-600 hover:text-rose-700"
                          onClick={() => handleRevoke(invite.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Revoke
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

      {/* Modal: Invite Executive Leader */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <UserPlus className="w-5 h-5 text-primary" />
              Invite Executive Leader
            </DialogTitle>
            <DialogDescription>
              Dispatches a secure, single-use onboarding link for leadership account setup.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendInvite} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="invFirstName">First Name *</Label>
                <Input
                  id="invFirstName"
                  placeholder="e.g. David"
                  value={formFirstName}
                  onChange={e => setFormFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invLastName">Last Name *</Label>
                <Input
                  id="invLastName"
                  placeholder="e.g. Oyedepo"
                  value={formLastName}
                  onChange={e => setFormLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invEmail">Email Address *</Label>
              <Input
                id="invEmail"
                type="email"
                placeholder="pastor@hofchurch.org"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invRole">Elevated Role *</Label>
              <select
                id="invRole"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                value={formRole}
                onChange={e => setFormRole(e.target.value)}
              >
                {LEADERSHIP_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {!['super_admin', 'general_overseer'].includes(formRole) && (
              <div className="space-y-2">
                <Label htmlFor="invChurch">Assigned Local Church Branch *</Label>
                <select
                  id="invChurch"
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs"
                  value={formChurchId}
                  onChange={e => setFormChurchId(e.target.value)}
                  required
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.slug})</option>
                  ))}
                </select>
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90">
                {submitting ? "Generating..." : "Dispatch Magic Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
