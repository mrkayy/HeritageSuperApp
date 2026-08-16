import React, { useState, useEffect, useCallback } from 'react';
import { MembershipService, Member } from '@/services/membershipService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { TrendingUp, Users, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2, Phone, Mail, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const STAGES = [
  { key: 'first_time_guest', label: 'First Time Guest', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  { key: 'foundation_class', label: 'Foundation Class', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' },
  { key: 'sunday_school_module_1', label: 'Sunday School 1', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30' },
  { key: 'sunday_school_module_2', label: 'Sunday School 2', color: 'bg-teal-500/10 text-teal-600 border-teal-500/30' },
  { key: 'sunday_school_module_3', label: 'Sunday School 3', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  { key: 'membership_class', label: 'Membership Class', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  { key: 'stewardship', label: 'Stewardship', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  { key: 'mit', label: 'MIT', color: 'bg-violet-500/10 text-violet-600 border-violet-500/30' },
  { key: 'resident_pastor', label: 'Resident Pastor', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30' },
];

export default function MemberJourney() {
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [totalPipelineCount, setTotalPipelineCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [movingMemberId, setMovingMemberId] = useState<string | null>(null);

  // Modal State
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<any | null>(null);
  const [modalMembers, setModalMembers] = useState<Member[]>([]);
  const [modalTotal, setModalTotal] = useState(0);
  const [modalPage, setModalPage] = useState(1);
  const [modalSearch, setModalSearch] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const modalLimit = 15;

  const loadStageCounts = async () => {
    try {
      setLoadingCounts(true);
      const counts = await MembershipService.fetchStageCounts();
      setStageCounts(counts);
      let sum = 0;
      Object.values(counts).forEach(c => { sum += c; });
      setTotalPipelineCount(sum);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to load stage counts",
        variant: "destructive",
      });
    } finally {
      setLoadingCounts(false);
    }
  };

  const loadModalMembers = useCallback(async (stageKey: string, page: number, search: string) => {
    try {
      setLoadingMembers(true);
      const res = await MembershipService.fetchMembersPaginated(page, modalLimit, search, stageKey);
      setModalMembers(res.members || []);
      setModalTotal(res.total || 0);
      setModalPage(res.page || 1);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to load stage members",
        variant: "destructive",
      });
    } finally {
      setLoadingMembers(false);
    }
  }, [modalLimit]);

  useEffect(() => {
    loadStageCounts();
  }, []);

  useEffect(() => {
    if (stageModalOpen && selectedStage) {
      loadModalMembers(selectedStage.key, modalPage, modalSearch);
    }
  }, [stageModalOpen, selectedStage, modalPage, modalSearch, loadModalMembers]);

  const handleStageChange = async (member: Member, newStage: string) => {
    if (member.currentStage === newStage) return;

    try {
      setMovingMemberId(member.id);
      await MembershipService.updateMember(member.id, {
        firstName: member.firstName,
        surname: member.surname,
        email: member.email,
        phoneNumber: member.phoneNumber,
        currentStage: newStage,
      });

      toast({
        title: "Stage Updated",
        description: `${member.firstName} ${member.surname} moved to ${newStage.replace(/_/g, ' ')}. Preceding stage histories auto-filled.`,
      });

      // Reload both counts and current modal view
      loadStageCounts();
      if (selectedStage) {
        loadModalMembers(selectedStage.key, modalPage, modalSearch);
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Failed to update stage",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setMovingMemberId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(modalTotal / modalLimit));

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl">
        <div>
          <Badge variant="outline" className="text-primary border-primary/30 mb-2">
            <TrendingUp className="w-3.5 h-3.5 mr-1" /> Pipeline Growth
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Member Journey Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visual stage progression. Changing a member's stage automatically backfills preceding stage history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            Total Pipeline: {loadingCounts ? '...' : totalPipelineCount} Members
          </Badge>
        </div>
      </div>

      {/* Stage Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        {STAGES.map(stage => {
          const count = stageCounts[stage.key] || 0;
          return (
            <Card key={stage.key} className="glass-card hover:border-primary/40 transition-colors p-5 flex flex-col justify-between h-44">
              <div>
                <Badge variant="outline" className={`${stage.color} font-semibold text-xs px-2.5 py-0.5 mb-2`}>
                  {stage.label}
                </Badge>
                <div className="text-3xl font-bold text-foreground mt-2">
                  {loadingCounts ? '...' : count}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Profiled members at this stage</p>
              </div>
              <Button 
                onClick={() => {
                  setSelectedStage(stage);
                  setModalPage(1);
                  setModalSearch('');
                  setStageModalOpen(true);
                }} 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between mt-4 text-xs font-semibold hover:bg-secondary/80 group"
              >
                <span>View Directory</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Stage Members Modal (Dialog) */}
      <Dialog open={stageModalOpen} onOpenChange={setStageModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {selectedStage?.label} Directory
            </DialogTitle>
            <DialogDescription>
              View and manage members currently at the {selectedStage?.label} growth stage.
            </DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative my-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search member by name..."
              className="pl-9 h-9 text-xs"
              value={modalSearch}
              onChange={e => {
                setModalSearch(e.target.value);
                setModalPage(1);
              }}
            />
          </div>

          {/* Modal Members List */}
          <div className="space-y-3 py-2 flex-1 overflow-y-auto min-h-[250px] max-h-[40vh] pr-1">
            {loadingMembers ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Loading stage members...
              </div>
            ) : modalMembers.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border/50 rounded-2xl">
                No members found at this stage.
              </div>
            ) : (
              modalMembers.map(m => (
                <Card
                  key={m.id}
                  className="p-4 border border-border/50 bg-background/50 hover:border-primary/30 transition-colors shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-foreground">
                        {m.firstName} {m.surname}
                      </div>
                      {m.email && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {m.email}
                        </div>
                      )}
                      {m.phoneNumber && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="w-3.5 h-3.5" /> {m.phoneNumber}
                        </div>
                      )}
                    </div>
                    <Select
                      disabled={movingMemberId === m.id}
                      value={m.currentStage || 'first_time_guest'}
                      onValueChange={newStage => handleStageChange(m, newStage)}
                    >
                      <SelectTrigger className="h-8 text-xs w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map(s => (
                          <SelectItem key={s.key} value={s.key}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stage Move Dropdown */}
                  {/*<div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Move to Stage:</span>
                    <Select
                      disabled={movingMemberId === m.id}
                      value={m.currentStage || 'first_time_guest'}
                      onValueChange={newStage => handleStageChange(m, newStage)}
                    >
                      <SelectTrigger className="h-8 text-xs w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map(s => (
                          <SelectItem key={s.key} value={s.key}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  */}
                </Card>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-4">
              <span className="text-xs text-muted-foreground">
                Page {modalPage} of {totalPages} ({modalTotal} total)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  disabled={modalPage <= 1 || loadingMembers}
                  onClick={() => setModalPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  disabled={modalPage >= totalPages || loadingMembers}
                  onClick={() => setModalPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-border/50">
            <Button onClick={() => setStageModalOpen(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
