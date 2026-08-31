import { useState, useEffect, useCallback } from 'react';
import { InfoCenterService, Visitor, AttendanceRecord } from '@/services/infoCenterService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  ClipboardList,
  Search,
  CheckCircle2,
  Calendar,
  Users,
  UserCheck,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AttendanceTracking() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [markDialogOpen, setMarkDialogOpen] = useState(false);
  const [serviceType, setServiceType] = useState('sunday_service');
  const [marking, setMarking] = useState(false);

  const loadVisitors = useCallback(async () => {
    try {
      setLoading(true);
      const params = searchQuery ? { query: searchQuery } : undefined;
      const data = await InfoCenterService.listVisitors(params);
      setVisitors(data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load visitors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadVisitors();
  }, [loadVisitors]);

  const openMarkDialog = async (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setMarkDialogOpen(true);
    try {
      const history = await InfoCenterService.getVisitorAttendance(visitor.visitor_id);
      setAttendanceHistory(history);
    } catch {
      setAttendanceHistory([]);
    }
  };

  const handleMarkAttendance = async () => {
    if (!selectedVisitor) return;
    setMarking(true);
    try {
      await InfoCenterService.markAttendance({
        visitor_id: selectedVisitor.visitor_id,
        service_type: serviceType || undefined,
      });
      toast({
        title: "Attendance Marked",
        description: `${selectedVisitor.first_name} ${selectedVisitor.last_name}'s attendance has been recorded.`,
      });
      setMarkDialogOpen(false);
      setSelectedVisitor(null);
      loadVisitors();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to mark attendance";
      toast({
        title: "Error",
        description: msg.includes('duplicate') ? "Attendance already recorded for this visitor today." : msg,
        variant: "destructive",
      });
    } finally {
      setMarking(false);
    }
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50">
        <div>
          <Badge variant="outline" className="text-primary border-primary/30 mb-2">
            <ClipboardList className="w-3.5 h-3.5 mr-1" /> Attendance Tracking
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Service Attendance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            {todayStr}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            <Users className="w-3.5 h-3.5 mr-1" />
            {visitors.length} Visitors
          </Badge>
        </div>
      </div>

      {/* Search & Filter */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Service type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunday_service">Sunday Service</SelectItem>
                <SelectItem value="midweek_service">Midweek Service</SelectItem>
                <SelectItem value="special_program">Special Program</SelectItem>
                <SelectItem value="prayer_meeting">Prayer Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Visitor List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Registered Visitors</CardTitle>
          <CardDescription>Select a visitor to mark their attendance for today's service</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Phone</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Visit Count</TableHead>
                  <TableHead className="font-semibold">Last Attended</TableHead>
                  <TableHead className="font-semibold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading visitors...
                    </TableCell>
                  </TableRow>
                ) : visitors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No visitors match your search.' : 'No visitors registered yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  visitors.map((v) => (
                    <TableRow key={v.visitor_id} className="hover:bg-secondary/40">
                      <TableCell className="font-medium">
                        {v.first_name} {v.last_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.phone_number}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            v.status === 'first_timer'
                              ? 'bg-blue-500/10 text-blue-600'
                              : v.status === 'returning_visitor'
                              ? 'bg-green-500/10 text-green-600'
                              : v.status === 'foundation_class_candidate'
                              ? 'bg-purple-500/10 text-purple-600'
                              : 'bg-gray-500/10 text-gray-600'
                          }
                        >
                          {v.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{v.visit_count}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(v.last_attended_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMarkDialog(v)}
                        >
                          <UserCheck className="w-4 h-4 mr-1" /> Mark
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mark Attendance Dialog */}
      <Dialog open={markDialogOpen} onOpenChange={setMarkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Mark Attendance
            </DialogTitle>
            <DialogDescription>
              Record today's attendance for this visitor.
            </DialogDescription>
          </DialogHeader>

          {selectedVisitor && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-secondary/30 rounded-xl space-y-2">
                <p className="font-semibold text-lg">
                  {selectedVisitor.first_name} {selectedVisitor.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{selectedVisitor.phone_number}</p>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {selectedVisitor.status.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant="outline">{selectedVisitor.visit_count} visits</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunday_service">Sunday Service</SelectItem>
                    <SelectItem value="midweek_service">Midweek Service</SelectItem>
                    <SelectItem value="special_program">Special Program</SelectItem>
                    <SelectItem value="prayer_meeting">Prayer Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {attendanceHistory.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Recent Attendance</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {attendanceHistory.slice(0, 5).map((a) => (
                      <div key={a.attendance_id} className="flex justify-between text-xs p-2 bg-secondary/20 rounded">
                        <span>{new Date(a.service_date).toLocaleDateString()}</span>
                        <span className="text-muted-foreground">{a.service_type?.replace(/_/g, ' ') || 'General'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMarkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAttendance} disabled={marking}>
              {marking ? 'Recording...' : 'Confirm Attendance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
