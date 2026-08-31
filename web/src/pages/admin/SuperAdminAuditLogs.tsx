import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Eye, 
  Lock, 
  Loader2,
  Calendar,
  User,
  Activity
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SuperAdminService, AuditLog } from '@/services/superAdminService';

export default function SuperAdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  // Drawer / Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await SuperAdminService.listAuditLogs(100);
      setLogs(data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleOpenDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.actor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('provision') || action.includes('create')) {
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{action}</Badge>;
    }
    if (action.includes('archive') || action.includes('revoke') || action.includes('delete')) {
      return <Badge variant="destructive">{action}</Badge>;
    }
    if (action.includes('reassign') || action.includes('update')) {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">{action}</Badge>;
    }
    return <Badge variant="secondary">{action}</Badge>;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-primary border-primary/30">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Platform Security
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Lock className="w-3 h-3 mr-1 text-emerald-500" /> Immutable Tamper-Evident Trail
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Platform Security Center & Audit Trail
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable, tamper-evident log tracking all high-privilege administrative operations and tenant mutations.
          </p>
        </div>
        <Button onClick={loadLogs} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Trail
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Security Events Stream</CardTitle>
              <CardDescription>Chronological ledger of system mutations with actor IP and identity tracking.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="h-9 px-3 rounded-lg border border-input bg-background text-xs"
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
              >
                <option value="all">All Event Types</option>
                <option value="provision_branch">Provision Branch</option>
                <option value="update_branch">Update Branch</option>
                <option value="reassign_branch_leadership">Reassign Leadership</option>
                <option value="archive_branch">Archive Branch</option>
                <option value="restore_branch">Restore Branch</option>
                <option value="invite_leader">Invite Leader</option>
                <option value="revoke_leadership_invite">Revoke Invite</option>
              </select>
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs or details..."
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
              <p className="text-sm">Querying immutable security ledger...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium">No audit events found</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table className="text-xs">
                <TableHeader className="bg-secondary/40">
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor Identity</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Event Action</TableHead>
                    <TableHead>Target Resource</TableHead>
                    <TableHead>Description / Diff</TableHead>
                    <TableHead className="text-right">Metadata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => (
                    <TableRow key={log.id} className="hover:bg-secondary/10">
                      <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-primary" />
                          <span>
                            {new Date(log.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">{log.actor_name || log.actor_email}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{log.actor_email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-[11px]">
                          {(log.actor_role || 'super_admin').replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <span className="font-mono text-[11px] bg-secondary/50 px-2 py-0.5 rounded">
                          {log.resource_type}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {log.details}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleOpenDetail(log)}
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
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

      {/* Inspect Log Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Security Audit Event Details
            </DialogTitle>
            <DialogDescription>
              Cryptographically verified, immutable record of administrative mutation.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/20 rounded-xl">
                <div>
                  <span className="text-muted-foreground block">Event Action</span>
                  <span className="font-semibold text-foreground text-sm">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Resource Type</span>
                  <span className="font-mono font-semibold text-foreground">{selectedLog.resource_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Actor</span>
                  <span className="font-semibold text-foreground">{selectedLog.actor_name} ({selectedLog.actor_email})</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Recorded Timestamp</span>
                  <span className="font-mono text-muted-foreground">
                    {new Date(selectedLog.created_at).toUTCString()}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-foreground">Mutation Payload Details:</span>
                <p className="p-3 bg-secondary/30 rounded-xl font-mono text-xs break-all text-muted-foreground">
                  {selectedLog.details}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
