import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart3, 
  Download, 
  Users, 
  UserPlus, 
  GraduationCap, 
  Heart, 
  Flame, 
  Building2, 
  TrendingUp, 
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { GeneralOverseerService, ExecutiveSummary } from '@/services/generalOverseerService';

export default function ExecutiveAnalytics() {
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await GeneralOverseerService.getExecutiveSummary();
      setSummary(data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load executive analytics summary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleExportCSV = () => {
    if (!summary || !summary.branch_performance) return;

    const headers = ["Branch Name", "Active Members", "Total Visitors", "First-Timers", "Souls Won"];
    const rows = summary.branch_performance.map(b => [
      `"${b.church_name}"`,
      b.member_count,
      b.visitor_count,
      b.first_timer_count,
      b.souls_won_count,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hof_executive_analytics_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Dataset Exported",
      description: "Executive analytics CSV dataset downloaded successfully.",
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-primary border-primary/30">
              <BarChart3 className="w-3.5 h-3.5 mr-1 text-primary" /> Executive Intelligence
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Cross-Branch Health & Pipeline Metrics
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Executive Analytics & Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global and branch-level church health, discipleship funnel efficiency, and evangelism growth digest.
          </p>
        </div>
        <Button onClick={handleExportCSV} className="gap-2 bg-primary hover:bg-primary/90">
          <FileSpreadsheet className="w-4 h-4" /> Export CSV Dataset
        </Button>
      </div>

      {loading ? (
        <div className="p-24 glass-card rounded-2xl text-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p>Compiling cross-branch executive analytics...</p>
        </div>
      ) : summary ? (
        <>
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Active Members</p>
                    <h3 className="text-3xl font-bold mt-1 text-foreground">{summary.total_active_members}</h3>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">First-Timer Inflow</p>
                    <h3 className="text-3xl font-bold mt-1 text-emerald-500">{summary.total_first_timers}</h3>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <UserPlus className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Foundation Candidates</p>
                    <h3 className="text-3xl font-bold mt-1 text-amber-500">{summary.total_foundation_class}</h3>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Souls Won</p>
                    <h3 className="text-3xl font-bold mt-1 text-rose-500">{summary.total_souls_won}</h3>
                  </div>
                  <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500">
                    <Flame className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Branch Performance Comparison Table */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Branch Performance Matrix</CardTitle>
              <CardDescription>Side-by-side branch comparison of membership, intake, and spiritual conversion.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <Table className="text-xs">
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead>Chartered Local Church Branch</TableHead>
                      <TableHead className="text-center">Active Members</TableHead>
                      <TableHead className="text-center">First-Time Visitors</TableHead>
                      <TableHead className="text-center">Total Visitors Logged</TableHead>
                      <TableHead className="text-center">Souls Harvest</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.branch_performance.map(b => (
                      <TableRow key={b.church_id} className="hover:bg-secondary/10">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-foreground text-sm">{b.church_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-foreground">
                          {b.member_count}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                            {b.first_timer_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground">
                          {b.visitor_count}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold">
                            {b.souls_won_count}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
