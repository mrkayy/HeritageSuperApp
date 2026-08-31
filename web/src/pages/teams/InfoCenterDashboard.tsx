import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { InfoCenterService, Visitor } from '@/services/infoCenterService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Building,
  UserPlus,
  Users,
  ClipboardCheck,
  GraduationCap,
  ArrowRight,
  Eye,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; color: string }> = {
  first_timer: { label: 'First Timer', variant: 'default', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  returning_visitor: { label: 'Returning Visitor', variant: 'secondary', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  foundation_class_candidate: { label: 'Foundation Candidate', variant: 'outline', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  profiled: { label: 'Profiled', variant: 'outline', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.first_timer;
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.color}`}>
      {config.label}
    </Badge>
  );
}

export default function InfoCenterDashboard() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [candidates, setCandidates] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [visitorsData, candidatesData] = await Promise.all([
        InfoCenterService.listVisitors(),
        InfoCenterService.listFoundationCandidates().catch(() => []),
      ]);
      setVisitors(visitorsData || []);
      setCandidates(candidatesData || []);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error loading dashboard",
        description: "Failed to fetch visitor data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const firstTimersCount = visitors.filter(v => v.status === 'first_timer').length;
  const returningCount = visitors.filter(v => v.status === 'returning_visitor').length;
  const candidatesCount = candidates.length;

  const recentVisitors = [...visitors]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const statusCounts: Record<string, number> = {};
  visitors.forEach(v => {
    statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50">
        <div>
          <Badge variant="outline" className="text-primary border-primary/30 mb-2">
            <Building className="w-3.5 h-3.5 mr-1" /> Information Center
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Visitor Management Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Register visitors, track attendance, and manage foundation class recommendations.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={loadData}
          disabled={loading}
          className="h-9 w-9 rounded-xl"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/teams/info-center/new-visitor" className="group">
          <Card className="glass-card h-full hover:border-blue-500/40 transition-all hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-colors">
                <UserPlus className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">Register New Visitor</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Capture first-timer details</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/teams/info-center/attendance" className="group">
          <Card className="glass-card h-full hover:border-amber-500/40 transition-all hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">Mark Attendance</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Record returning visitor presence</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/teams/info-center/foundation-class" className="group">
          <Card className="glass-card h-full hover:border-purple-500/40 transition-all hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20 transition-colors">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">Foundation Class</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {candidatesCount > 0 ? `${candidatesCount} candidate${candidatesCount !== 1 ? 's' : ''} pending` : 'Review eligible visitors'}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Visitors</CardTitle>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : visitors.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All registered visitors</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">First Timers</CardTitle>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Eye className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : firstTimersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting return visit</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Returning Visitors</CardTitle>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <UserCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : returningCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Multiple visits recorded</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Foundation Candidates</CardTitle>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <GraduationCap className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : candidatesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for recommendation</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Visitors & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Visitors */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Visitors</CardTitle>
              <CardDescription>Latest registered visitors</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/teams/info-center/new-visitor">
                Register New <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-center">Visits</TableHead>
                    <TableHead className="font-semibold">Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : recentVisitors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No visitors registered yet. Click "Register New" to add the first visitor.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentVisitors.map(v => (
                      <TableRow key={v.visitor_id} className="hover:bg-secondary/40">
                        <TableCell className="font-medium text-foreground">
                          {v.first_name} {v.last_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {v.phone_number}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={v.status} />
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-sm font-medium">
                            {v.visit_count}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(v.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Visitor Status Breakdown */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Visitor Pipeline</CardTitle>
            <CardDescription>Status distribution across the visitor lifecycle</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const count = statusCounts[key] || 0;
              const pct = visitors.length > 0 ? Math.round((count / visitors.length) * 100) : 0;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{config.label}</span>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        key === 'first_timer' ? 'bg-blue-500' :
                        key === 'returning_visitor' ? 'bg-amber-500' :
                        key === 'foundation_class_candidate' ? 'bg-purple-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{pct}% of all visitors</p>
                </div>
              );
            })}

            {visitors.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No visitor data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
