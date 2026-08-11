
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
import { 
  Building, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield,
  Plus,
  Eye,
  UserCheck
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const SuperAdmin = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Redirect non-super-admin users
  if (user?.role !== 'super_admin') {
    return (
      <div className="p-6 page-background">
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have Super Admin permissions to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock data - in real app this would come from Supabase
  const stats = {
    denominations: 15,
    churches: 142,
    pendingAdmins: 8,
    totalUsers: 2847
  };

  const pendingDenominations = [
    {
      id: 1,
      name: "Baptist Union",
      contactEmail: "admin@baptistunion.org",
      requestedBy: "John Smith",
      submittedDate: "2024-06-20",
      status: "pending"
    },
    {
      id: 2,
      name: "Methodist Conference",
      contactEmail: "contact@methodist.org", 
      requestedBy: "Sarah Johnson",
      submittedDate: "2024-06-21",
      status: "pending"
    }
  ];

  const pendingUsers = [
    {
      id: 1,
      name: "Pastor Mike Wilson",
      email: "mike@church.com",
      role: "denomination_admin",
      denomination: "Baptist Union",
      submittedDate: "2024-06-22",
      status: "pending"
    },
    {
      id: 2,
      name: "Elder Susan Brown",
      email: "susan@methodist.org",
      role: "district_admin", 
      denomination: "Methodist Conference",
      submittedDate: "2024-06-21",
      status: "pending"
    }
  ];

  const approveUser = (userId: number) => {
    toast({
      title: "User Approved",
      description: "User has been successfully approved and activated.",
    });
  };

  const rejectUser = (userId: number) => {
    toast({
      title: "User Rejected", 
      description: "User application has been rejected.",
      variant: "destructive"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "denomination_admin":
        return "bg-purple-100 text-purple-800";
      case "district_admin":
        return "bg-blue-100 text-blue-800";
      case "local_church_head":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 page-background space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Super Admin Dashboard
        </h1>
        <p className="text-muted-foreground">Manage denominations, churches, and global system administration</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.denominations}</div>
                <div className="text-sm text-muted-foreground">Denominations</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.churches}</div>
                <div className="text-sm text-muted-foreground">Local Churches</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{stats.pendingAdmins}</div>
                <div className="text-sm text-muted-foreground">Pending Approvals</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button 
          variant={activeTab === 'overview' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </Button>
        <Button 
          variant={activeTab === 'pending-denominations' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('pending-denominations')}
        >
          Pending Denominations
        </Button>
        <Button 
          variant={activeTab === 'pending-users' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('pending-users')}
        >
          Pending Users
        </Button>
      </div>

      {/* Pending Denominations Tab */}
      {activeTab === 'pending-denominations' && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Pending Denomination Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Denomination</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDenominations.map((denomination) => (
                  <TableRow key={denomination.id}>
                    <TableCell className="font-medium">{denomination.name}</TableCell>
                    <TableCell>{denomination.contactEmail}</TableCell>
                    <TableCell>{denomination.requestedBy}</TableCell>
                    <TableCell>{denomination.submittedDate}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(denomination.status)}>
                        {denomination.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="default" size="sm">
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                        <Button variant="destructive" size="sm">
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pending Users Tab */}
      {activeTab === 'pending-users' && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Pending User Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Denomination</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.role)}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.denomination}</TableCell>
                    <TableCell>{user.submittedDate}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => approveUser(user.id)}
                        >
                          <UserCheck className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => rejectUser(user.id)}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Baptist Union approved</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Plus className="h-4 w-4 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">New admin invite sent</p>
                    <p className="text-xs text-muted-foreground">5 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Building className="h-4 w-4 text-purple-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Methodist Conference created</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Building className="h-4 w-4 mr-2" />
                Create New Denomination
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Generate Admin Invite
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                System Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;
