import { useState, useEffect, useCallback } from 'react';
import { ProfilingService, TeamTodo } from '@/services/profilingService';
import { InfoCenterService, Visitor } from '@/services/infoCenterService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  UserCheck,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ProfilingQueue() {
  const [todos, setTodos] = useState<TeamTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTodo, setSelectedTodo] = useState<TeamTodo | null>(null);
  const [visitorDetail, setVisitorDetail] = useState<Visitor | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profiling, setProfiling] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ProfilingService.listProfilingQueue();
      setTodos(data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load profiling queue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const openProfileDialog = async (todo: TeamTodo) => {
    setSelectedTodo(todo);
    setProfileDialogOpen(true);
    try {
      const visitor = await InfoCenterService.getVisitor(todo.entity_id);
      setVisitorDetail(visitor);
    } catch {
      setVisitorDetail(null);
    }
  };

  const handleProfile = async () => {
    if (!selectedTodo) return;
    setProfiling(true);
    try {
      await ProfilingService.profileVisitor(selectedTodo.entity_id);
      toast({
        title: "Visitor Profiled",
        description: "The visitor has been converted to a member successfully.",
      });
      setProfileDialogOpen(false);
      setSelectedTodo(null);
      setVisitorDetail(null);
      loadQueue();
    } catch (err: any) {
      toast({
        title: "Profiling Failed",
        description: err.response?.data?.message || "Failed to profile visitor",
        variant: "destructive",
      });
    } finally {
      setProfiling(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50">
        <div>
          <Badge variant="outline" className="text-primary border-primary/30 mb-2">
            <UserCheck className="w-3.5 h-3.5 mr-1" /> Profiling Pipeline
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Visitor-to-Member Profiling Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visitors recommended by the Information Center for Foundation Class enrollment.
            Convert them to full member profiles here.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <ClipboardList className="w-3.5 h-3.5 mr-1" />
          {todos.length} Pending
        </Badge>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Pending Recommendations</CardTitle>
          <CardDescription>
            Review visitor details and convert them to members in the church directory.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50">
                  <TableHead className="font-semibold">Title</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Loading queue...
                    </TableCell>
                  </TableRow>
                ) : todos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                        <p>No pending profiling tasks.</p>
                        <p className="text-xs">
                          Visitors will appear here when the Information Center recommends them.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  todos.map((todo) => (
                    <TableRow key={todo.id} className="hover:bg-secondary/40">
                      <TableCell className="font-medium">{todo.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {todo.description || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(todo.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            todo.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-600'
                              : todo.status === 'completed'
                              ? 'bg-green-500/10 text-green-600'
                              : 'bg-blue-500/10 text-blue-600'
                          }
                        >
                          {todo.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => openProfileDialog(todo)}
                        >
                          <UserCheck className="w-4 h-4 mr-1" /> Profile
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

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Convert Visitor to Member
            </DialogTitle>
            <DialogDescription>
              This will create a full member profile and mark the visitor as profiled.
            </DialogDescription>
          </DialogHeader>

          {visitorDetail ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-secondary/30 rounded-xl space-y-2">
                <p className="font-semibold text-lg">
                  {visitorDetail.first_name} {visitorDetail.last_name}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    {visitorDetail.phone_number}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gender:</span>{' '}
                    {visitorDetail.gender}
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Address:</span>{' '}
                    {visitorDetail.address}
                  </div>
                  {visitorDetail.email && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Email:</span>{' '}
                      {visitorDetail.email}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Badge variant="secondary">
                    {visitorDetail.status.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant="outline">{visitorDetail.visit_count} visits</Badge>
                </div>
              </div>

              {visitorDetail.prayer_request && (
                <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                  <p className="text-xs font-medium text-blue-600 mb-1">Prayer Request</p>
                  <p className="text-sm">{visitorDetail.prayer_request}</p>
                </div>
              )}

              <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                <p className="text-xs text-amber-600">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  The member will be created with Foundation Class stage and "member" role.
                  You can adjust details later from the Member Directory.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Loading visitor details...
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setProfileDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProfile} disabled={profiling || !visitorDetail}>
              {profiling ? 'Profiling...' : 'Convert to Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
