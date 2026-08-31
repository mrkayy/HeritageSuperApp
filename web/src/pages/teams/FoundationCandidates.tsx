import { useState, useEffect, useCallback } from 'react';
import { InfoCenterService, Visitor, ChurchSettings } from '@/services/infoCenterService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap,
  Users,
  Settings,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useZodForm, FieldError } from '@/hooks/useZodForm';
import { churchSettingsSchema, type ChurchSettingsFormValues } from '@/lib/schemas/infocenter';

export default function FoundationCandidates() {
  const [candidates, setCandidates] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ChurchSettings | null>(null);
  const [recommendDialogOpen, setRecommendDialogOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [recommendNotes, setRecommendNotes] = useState('');
  const [recommending, setRecommending] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const settingsForm = useZodForm({
    schema: churchSettingsSchema,
    initialValues: { foundation_class_min_attendance: 2 },
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [candidateData, settingsData] = await Promise.all([
        InfoCenterService.listFoundationCandidates().catch(() => []),
        InfoCenterService.getSettings().catch(() => null),
      ]);
      setCandidates(candidateData);
      if (settingsData) {
        setSettings(settingsData);
        settingsForm.reset({
          foundation_class_min_attendance: settingsData.foundation_class_min_attendance,
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load foundation class data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openRecommendDialog = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setRecommendNotes('');
    setRecommendDialogOpen(true);
  };

  const handleRecommend = async () => {
    if (!selectedVisitor) return;
    setRecommending(true);
    try {
      await InfoCenterService.recommendForFoundation(
        selectedVisitor.visitor_id,
        recommendNotes || undefined,
      );
      toast({
        title: "Recommendation Sent",
        description: `${selectedVisitor.first_name} ${selectedVisitor.last_name} has been recommended for Foundation Class.`,
      });
      setRecommendDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to send recommendation",
        variant: "destructive",
      });
    } finally {
      setRecommending(false);
    }
  };

  const handleSaveSettings = async (data: ChurchSettingsFormValues) => {
    setSavingSettings(true);
    try {
      const minAttendance = data.foundation_class_min_attendance ?? 2;
      const updated = await InfoCenterService.updateSettings({ foundation_class_min_attendance: minAttendance });
      setSettings(updated);
      toast({
        title: "Settings Updated",
        description: `Minimum attendance threshold set to ${minAttendance}.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50">
        <div>
          <Badge variant="outline" className="text-primary border-primary/30 mb-2">
            <GraduationCap className="w-3.5 h-3.5 mr-1" /> Foundation Class
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Foundation Class Recommendations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visitors who meet the attendance threshold are eligible for Foundation Class enrollment.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Users className="w-3.5 h-3.5 mr-1" />
          {candidates.length} Eligible
        </Badge>
      </div>

      <Tabs defaultValue="candidates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="candidates">
            <Users className="w-4 h-4 mr-1" /> Candidates
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-1" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="candidates">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Eligible Visitors</CardTitle>
              <CardDescription>
                Visitors with {settings?.foundation_class_min_attendance || 2}+ service attendances
                who qualify for Foundation Class recommendation.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/50">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Phone</TableHead>
                      <TableHead className="font-semibold">Visit Count</TableHead>
                      <TableHead className="font-semibold">First Attended</TableHead>
                      <TableHead className="font-semibold">Last Attended</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Loading candidates...
                        </TableCell>
                      </TableRow>
                    ) : candidates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <AlertCircle className="w-8 h-8" />
                            <p>No visitors currently meet the attendance threshold.</p>
                            <p className="text-xs">
                              Visitors need at least {settings?.foundation_class_min_attendance || 2} recorded attendances.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      candidates.map((v) => (
                        <TableRow key={v.visitor_id} className="hover:bg-secondary/40">
                          <TableCell className="font-medium">
                            {v.first_name} {v.last_name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {v.phone_number}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-500/10 text-green-600">
                              {v.visit_count} visits
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(v.first_attendance_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(v.last_attended_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                v.status === 'foundation_class_candidate'
                                  ? 'bg-purple-500/10 text-purple-600'
                                  : 'bg-blue-500/10 text-blue-600'
                              }
                            >
                              {v.status.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {v.status === 'foundation_class_candidate' ? (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Recommended
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRecommendDialog(v)}
                              >
                                <Send className="w-4 h-4 mr-1" /> Recommend
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="glass-card max-w-lg">
            <CardHeader>
              <CardTitle className="text-lg">Attendance Threshold</CardTitle>
              <CardDescription>
                Configure the minimum number of service attendances required
                before a visitor becomes eligible for Foundation Class recommendation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={settingsForm.handleSubmit(handleSaveSettings)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="foundation_class_min_attendance">
                    Minimum Attendance Count
                  </Label>
                  <Input
                    id="foundation_class_min_attendance"
                    type="number"
                    min={1}
                    max={10}
                    value={settingsForm.values.foundation_class_min_attendance}
                    onChange={(e) =>
                      settingsForm.setValue(
                        'foundation_class_min_attendance',
                        parseInt(e.target.value) || 1,
                      )
                    }
                  />
                  <FieldError message={settingsForm.errors.foundation_class_min_attendance} />
                  <p className="text-xs text-muted-foreground">
                    Visitors with this many recorded attendances will appear in the candidates list.
                  </p>
                </div>
                <Button type="submit" disabled={savingSettings}>
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommend Dialog */}
      <Dialog open={recommendDialogOpen} onOpenChange={setRecommendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Recommend for Foundation Class
            </DialogTitle>
            <DialogDescription>
              This will flag the visitor as a Foundation Class candidate and create a todo for the membership team.
            </DialogDescription>
          </DialogHeader>

          {selectedVisitor && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-secondary/30 rounded-xl space-y-1">
                <p className="font-semibold">
                  {selectedVisitor.first_name} {selectedVisitor.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{selectedVisitor.phone_number}</p>
                <Badge variant="outline">{selectedVisitor.visit_count} visits recorded</Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommend-notes">Notes (Optional)</Label>
                <Textarea
                  id="recommend-notes"
                  value={recommendNotes}
                  onChange={(e) => setRecommendNotes(e.target.value)}
                  placeholder="Any notes about this visitor's readiness..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRecommendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecommend} disabled={recommending}>
              {recommending ? 'Sending...' : 'Send Recommendation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
