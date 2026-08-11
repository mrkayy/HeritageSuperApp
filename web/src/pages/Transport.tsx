
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  MapPin, 
  Bus, 
  Clock, 
  Phone, 
  Plus,
  CheckCircle,
  AlertCircle,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

const Transport = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    soulName: '',
    pickupAddress: '',
    contactPhone: '',
    eventDate: '',
    specialNeeds: '',
    notes: ''
  });

  // Mock data - in real app this would come from Supabase
  const transportRequests = [
    {
      id: 1,
      soulName: "Sarah Johnson",
      contactPhone: "+1 234-567-8901",
      pickupAddress: "123 Main St, Downtown",
      eventDate: new Date(2024, 5, 25),
      eventTime: "09:30 AM",
      status: "Confirmed",
      busRoute: "Route A - Downtown",
      driver: "Michael Brown",
      specialNeeds: "Wheelchair accessible",
      requestedBy: "John Doe",
      requestDate: new Date(2024, 5, 20)
    },
    {
      id: 2,
      soulName: "Mike Davis Family",
      contactPhone: "+1 234-567-8902",
      pickupAddress: "456 Oak Ave, Westside",
      eventDate: new Date(2024, 5, 25),
      eventTime: "09:45 AM",
      status: "Pending",
      busRoute: "Route B - Westside",
      driver: "TBD",
      specialNeeds: "Family of 5 (3 children)",
      requestedBy: "Mary Wilson",
      requestDate: new Date(2024, 5, 21)
    },
    {
      id: 3,
      soulName: "Anna Williams",
      contactPhone: "+1 234-567-8903",
      pickupAddress: "789 Pine St, Northside",
      eventDate: new Date(2024, 5, 18),
      eventTime: "09:30 AM",
      status: "Completed",
      busRoute: "Route C - Northside",
      driver: "David Lee",
      specialNeeds: "None",
      requestedBy: "Self",
      requestDate: new Date(2024, 5, 15)
    }
  ];

  const busRoutes = [
    { id: 1, name: "Route A - Downtown", capacity: 25, driver: "Michael Brown" },
    { id: 2, name: "Route B - Westside", capacity: 30, driver: "Sarah Kim" },
    { id: 3, name: "Route C - Northside", capacity: 28, driver: "David Lee" },
    { id: 4, name: "Route D - Southside", capacity: 32, driver: "Maria Garcia" }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "Confirmed":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Completed":
        return "bg-blue-100 text-blue-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // In real app, this would be a Supabase mutation
    console.log('Creating transport request:', {
      ...formData,
      requestedBy: user?.name,
      requestDate: new Date(),
      status: 'Pending'
    });
    
    // Reset form
    setFormData({
      soulName: '',
      pickupAddress: '',
      contactPhone: '',
      eventDate: '',
      specialNeeds: '',
      notes: ''
    });
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pendingRequests = transportRequests.filter(req => req.status === 'Pending');
  const confirmedRequests = transportRequests.filter(req => req.status === 'Confirmed');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Church Transport</h1>
          <p className="text-muted-foreground">Coordinate transportation for souls to church events</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Transport Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="soulName">Soul Name *</Label>
                <Input
                  id="soulName"
                  placeholder="Enter name"
                  value={formData.soulName}
                  onChange={(e) => updateFormData('soulName', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone *</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.contactPhone}
                  onChange={(e) => updateFormData('contactPhone', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickupAddress">Pickup Address *</Label>
                <Textarea
                  id="pickupAddress"
                  placeholder="Enter full pickup address"
                  value={formData.pickupAddress}
                  onChange={(e) => updateFormData('pickupAddress', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventDate">Event Date *</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => updateFormData('eventDate', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialNeeds">Special Needs</Label>
                <Textarea
                  id="specialNeeds"
                  placeholder="Any special transportation needs?"
                  value={formData.specialNeeds}
                  onChange={(e) => updateFormData('specialNeeds', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information"
                  value={formData.notes}
                  onChange={(e) => updateFormData('notes', e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full">
                Submit Request
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
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
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold">{confirmedRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Routes</p>
                <p className="text-2xl font-bold">{busRoutes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Capacity</p>
                <p className="text-2xl font-bold">
                  {busRoutes.reduce((sum, route) => sum + route.capacity, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transport Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Transport Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Soul</TableHead>
                <TableHead>Pickup Details</TableHead>
                <TableHead>Event Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bus Route</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transportRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{request.soulName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {request.contactPhone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-1 text-muted-foreground" />
                      <div className="text-sm">{request.pickupAddress}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(request.eventDate, 'MMM d, yyyy')}
                      </div>
                      <div className="text-sm text-muted-foreground">{request.eventTime}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{request.busRoute}</div>
                      {request.driver !== 'TBD' && (
                        <div className="text-sm text-muted-foreground">Driver: {request.driver}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user?.role !== 'guest' && request.status === 'Pending' && (
                      <Button variant="outline" size="sm">
                        Assign Route
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bus Routes Overview */}
      {user?.role !== 'guest' && (
        <Card>
          <CardHeader>
            <CardTitle>Bus Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {busRoutes.map((route) => (
                <Card key={route.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bus className="h-4 w-4 text-blue-600" />
                      <h3 className="font-medium text-sm">{route.name}</h3>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Capacity: {route.capacity} people</p>
                      <p>Driver: {route.driver}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Transport;
