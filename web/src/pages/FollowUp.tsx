
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, 
  Phone, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  User
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

const FollowUp = () => {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Mock data - in real app this would come from Supabase
  const followUpTasks = [
    {
      id: 1,
      soulName: "Sarah Johnson",
      soulPhone: "+1 234-567-8901",
      type: "Call",
      dueDate: new Date(2024, 5, 23),
      priority: "High",
      status: "Pending",
      assignedBy: "Team Leader",
      notes: "Follow up on Sunday service invitation",
      createdDate: new Date(2024, 5, 20)
    },
    {
      id: 2,
      soulName: "Mike Davis",
      soulPhone: "+1 234-567-8902",
      type: "Visit",
      dueDate: new Date(2024, 5, 24),
      priority: "Medium",
      status: "Pending",
      assignedBy: "Sector Leader",
      notes: "Home visit to discuss baptism",
      createdDate: new Date(2024, 5, 19)
    },
    {
      id: 3,
      soulName: "Anna Williams",
      soulPhone: "+1 234-567-8903",
      type: "Message",
      dueDate: new Date(2024, 5, 22),
      priority: "Low",
      status: "Completed",
      assignedBy: "Self",
      notes: "Birthday wishes and prayer",
      createdDate: new Date(2024, 5, 21),
      completedDate: new Date(2024, 5, 22),
      completionNotes: "Sent birthday message, she was very grateful"
    }
  ];

  const getDateBadge = (date) => {
    if (isPast(date) && !isToday(date)) {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    }
    if (isToday(date)) {
      return <Badge className="bg-blue-100 text-blue-800">Today</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge className="bg-yellow-100 text-yellow-800">Tomorrow</Badge>;
    }
    return <Badge variant="outline">{format(date, 'MMM d')}</Badge>;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "Call":
        return <Phone className="h-4 w-4" />;
      case "Visit":
        return <User className="h-4 w-4" />;
      case "Message":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const completeTask = () => {
    if (!selectedTask) return;
    
    // In real app, this would be a Supabase mutation
    console.log('Completing task:', {
      taskId: selectedTask.id,
      completionNotes,
      completedBy: user?.name,
      completedDate: new Date()
    });
    
    setCompletionNotes('');
  };

  const pendingTasks = followUpTasks.filter(task => task.status === 'Pending');
  const completedTasks = followUpTasks.filter(task => task.status === 'Completed');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Follow-Up Tasks</h1>
          <p className="text-muted-foreground">Manage your outreach follow-up activities</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">
                  {pendingTasks.filter(task => isPast(task.dueDate) && !isToday(task.dueDate)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Today</p>
                <p className="text-2xl font-bold">
                  {pendingTasks.filter(task => isToday(task.dueDate)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Tasks ({pendingTasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Soul</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{task.soulName}</div>
                      <div className="text-sm text-muted-foreground">{task.soulPhone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(task.type)}
                      {task.type}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getDateBadge(task.dueDate)}
                      <div className="text-sm text-muted-foreground">
                        {format(task.dueDate, 'h:mm a')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{task.assignedBy}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedTask(task)}
                        >
                          Complete
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Complete Follow-Up Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <p><strong>Soul:</strong> {task.soulName}</p>
                            <p><strong>Type:</strong> {task.type}</p>
                            <p><strong>Notes:</strong> {task.notes}</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="completion-notes">Completion Notes</Label>
                            <Textarea
                              id="completion-notes"
                              placeholder="What was accomplished during this follow-up?"
                              value={completionNotes}
                              onChange={(e) => setCompletionNotes(e.target.value)}
                              className="min-h-[100px]"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button onClick={completeTask} className="flex-1">
                              Mark Complete
                            </Button>
                            <Button variant="outline" className="flex-1">
                              Reschedule
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Completed ({completedTasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Soul</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Completed Date</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{task.soulName}</div>
                      <div className="text-sm text-muted-foreground">{task.soulPhone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(task.type)}
                      {task.type}
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.completedDate && format(task.completedDate, 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{task.completionNotes}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FollowUp;
