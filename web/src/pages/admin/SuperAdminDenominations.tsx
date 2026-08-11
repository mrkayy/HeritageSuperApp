
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building, Plus, Edit, Trash2, Users, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const SuperAdminDenominations = () => {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDenomination, setNewDenomination] = useState({
    name: '',
    contactEmail: '',
    logo: ''
  });

  // Redirect non-super-admin users
  if (user?.role !== 'super_admin') {
    return (
      <div className="p-6 page-background">
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have Super Admin permissions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock data
  const denominations = [
    {
      id: 1,
      name: "Baptist Union",
      contactEmail: "admin@baptistunion.org",
      logo: null,
      status: "active",
      churches: 45,
      totalMembers: 1250,
      createdDate: "2024-01-15"
    },
    {
      id: 2,
      name: "Methodist Conference", 
      contactEmail: "contact@methodist.org",
      logo: null,
      status: "active",
      churches: 38,
      totalMembers: 980,
      createdDate: "2024-02-20"
    },
    {
      id: 3,
      name: "Presbyterian Church",
      contactEmail: "info@presbyterian.org", 
      logo: null,
      status: "pending",
      churches: 22,
      totalMembers: 650,
      createdDate: "2024-06-10"
    }
  ];

  const createDenomination = () => {
    if (!newDenomination.name || !newDenomination.contactEmail) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // In real app, this would create in Supabase
    toast({
      title: "Success",
      description: "Denomination created successfully",
    });
    
    setIsCreateDialogOpen(false);
    setNewDenomination({ name: '', contactEmail: '', logo: '' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 page-background space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            Denomination Management
          </h1>
          <p className="text-muted-foreground">Manage denominations and their church networks</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Denomination
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle>Create New Denomination</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Denomination Name *</Label>
                <Input
                  id="name"
                  value={newDenomination.name}
                  onChange={(e) => setNewDenomination(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter denomination name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newDenomination.contactEmail}
                  onChange={(e) => setNewDenomination(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="Enter contact email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL (Optional)</Label>
                <Input
                  id="logo"
                  value={newDenomination.logo}
                  onChange={(e) => setNewDenomination(prev => ({ ...prev, logo: e.target.value }))}
                  placeholder="Enter logo URL"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={createDenomination} className="flex-1">
                  Create Denomination
                </Button>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Denominations Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>All Denominations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Denomination</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Churches</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {denominations.map((denomination) => (
                <TableRow key={denomination.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{denomination.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{denomination.contactEmail}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(denomination.status)}>
                      {denomination.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {denomination.churches}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {denomination.totalMembers.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>{denomination.createdDate}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
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

export default SuperAdminDenominations;
