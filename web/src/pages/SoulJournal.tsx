
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Heart, Phone, MessageSquare, Calendar, MapPin, Plus, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

const SoulJournal = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSoul, setSelectedSoul] = useState(null);
  const [newJournalEntry, setNewJournalEntry] = useState('');

  // Mock data - in real app this would come from Supabase
  const souls = [
    {
      id: 1,
      name: "Sarah Johnson",
      phone: "+1 234-567-8901",
      gender: "Female",
      ageRange: "26-35",
      address: "123 Main St, Downtown",
      dateAdded: new Date(2024, 5, 15),
      lastContact: new Date(2024, 5, 20),
      status: "Active Follow-up",
      sector: "North Sector",
      addedBy: "John Doe",
      notes: "Interested in attending Sunday service",
      journalEntries: [
        {
          id: 1,
          date: new Date(2024, 5, 20),
          type: "Call",
          content: "Called to follow up on invitation. Very interested in attending this Sunday.",
          author: "John Doe"
        },
        {
          id: 2,
          date: new Date(2024, 5, 18),
          type: "Visit",
          content: "Home visit completed. Family was very welcoming and asked great questions about our church.",
          author: "Jane Smith"
        }
      ]
    },
    {
      id: 2,
      name: "Mike Davis",
      phone: "+1 234-567-8902",
      gender: "Male",
      ageRange: "36-45",
      address: "456 Oak Ave, Westside",
      dateAdded: new Date(2024, 5, 10),
      lastContact: new Date(2024, 5, 19),
      status: "Needs Visit",
      sector: "West Sector",
      addedBy: "Mary Wilson",
      notes: "Father of 3, works construction",
      journalEntries: [
        {
          id: 3,
          date: new Date(2024, 5, 19),
          type: "Message",
          content: "Sent encouragement text. He appreciated the prayers for his job situation.",
          author: "Mary Wilson"
        }
      ]
    }
  ];

  const filteredSouls = souls.filter(soul =>
    soul.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    soul.phone.includes(searchTerm) ||
    soul.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "Active Follow-up":
        return "bg-green-100 text-green-800";
      case "Needs Visit":
        return "bg-yellow-100 text-yellow-800";
      case "Completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const addJournalEntry = () => {
    if (!newJournalEntry.trim() || !selectedSoul) return;
    
    // In real app, this would be a Supabase mutation
    console.log('Adding journal entry:', {
      soulId: selectedSoul.id,
      content: newJournalEntry,
      type: "Note",
      author: user?.name
    });
    
    setNewJournalEntry('');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Soul Journal</h1>
          <p className="text-muted-foreground">Track and manage your outreach contacts</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search souls by name, phone, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Souls Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Souls ({filteredSouls.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSouls.map((soul) => (
                <TableRow key={soul.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{soul.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {soul.gender} • {soul.ageRange}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {soul.phone}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {soul.address.split(',')[0]}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(soul.lastContact, 'MMM d, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(soul.status)}>
                      {soul.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{soul.sector}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedSoul(soul)}
                        >
                          View Journal
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Heart className="h-5 w-5 text-red-500" />
                            {soul.name} - Journal
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Soul Info */}
                          <Card>
                            <CardContent className="p-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">Phone:</span> {soul.phone}
                                </div>
                                <div>
                                  <span className="font-medium">Gender:</span> {soul.gender}
                                </div>
                                <div>
                                  <span className="font-medium">Age:</span> {soul.ageRange}
                                </div>
                                <div>
                                  <span className="font-medium">Sector:</span> {soul.sector}
                                </div>
                                <div className="col-span-2">
                                  <span className="font-medium">Address:</span> {soul.address}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Add New Entry */}
                          {user?.role !== 'guest' && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Add Journal Entry</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="entry">Entry</Label>
                                  <Textarea
                                    id="entry"
                                    placeholder="What happened during this interaction?"
                                    value={newJournalEntry}
                                    onChange={(e) => setNewJournalEntry(e.target.value)}
                                    className="min-h-[100px]"
                                  />
                                </div>
                                <Button onClick={addJournalEntry}>
                                  Add Entry
                                </Button>
                              </CardContent>
                            </Card>
                          )}

                          {/* Journal Entries */}
                          <div className="space-y-4">
                            <h3 className="font-semibold">Journal History</h3>
                            {soul.journalEntries.map((entry) => (
                              <Card key={entry.id}>
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">{entry.type}</Badge>
                                      <span className="text-sm font-medium">{entry.author}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      {format(entry.date, 'MMM d, yyyy')}
                                    </div>
                                  </div>
                                  <p className="text-sm">{entry.content}</p>
                                </CardContent>
                              </Card>
                            ))}
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
    </div>
  );
};

export default SoulJournal;
