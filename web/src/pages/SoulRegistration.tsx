import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Heart, User, MapPin, Phone, Calendar, Search, Filter, Eye, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthStore } from '@/store/authStore';
import { soulService, Soul } from '@/services/soulService';

// type Soul = {
//   soul_id: string;
//   sector_id?: string;
//   added_by_user_id: string;
//   full_name: string;
//   phone: string;
//   gender: string;
//   age_range: string;
//   address?: string;
//   outreach_date: string;
//   latitude?: number;
//   longitude?: number;
//   location?: number;
//   is_active: boolean;
//   response_status: 'saved' | 'not_saved' | 'already_saved';
//   note?: string;
//   email_verified: boolean;
// }

const SoulRegistration = () => {
  const { user } = useAuthStore();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'saved' | 'already_saved' | 'not_saved'>('saved');
  const [souls, setSouls] = useState<Soul[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSoul, setSelectedSoul] = useState<Soul | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const initFormData = {
    full_name: '',
    phone: '',
    gender: '',
    age_range: '',
    address: '',
    response_status: 'saved' as 'saved' | 'not_saved' | 'already_saved',
    is_active: false,
    note: '',
    latitude: 0.0,
    longitude: 0.0,
    sector_id: user?.sector_id,
    team_id: user?.team_id,
    added_by_user_id: user?.user_id,
    outreach_date: new Date().toISOString()
  };

  // Form state for new soul registration
  const [soulForm, setSoulForm] = useState(initFormData);

  useEffect(() => {
    if (user) {
      fetchSouls();
    }
  }, [user, activeTab]);

  const fetchSouls = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await soulService.getAllSouls()
      // const { data } = await api.get(`/souls`, {
      //   params: {
      //     user_id: user.user_id,
      //     response_status: activeTab
      //   }
      // });

      setSouls(data || []);
    } catch (error) {
      console.error('Error fetching souls:', error);
      toast({
        title: "Error",
        description: "Failed to fetch souls",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!soulForm.full_name || !soulForm.phone || !soulForm.gender || !soulForm.age_range) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await soulService.createSoul(soulForm);

      toast({
        title: "Success",
        description: "Soul registered successfully",
      });

      // Reset form
      setSoulForm(initFormData);

      fetchSouls();
    } catch (error) {
      console.error('Error registering soul:', error);
      toast({
        title: "Error",
        description: "Failed to register soul",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSouls = souls.filter(soul =>
    soul.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    soul.phone.includes(searchTerm) ||
    soul.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    return status === 'saved'
      ? "bg-green-100 text-green-800"
      : "bg-yellow-100 text-yellow-800";
  };

  const handleViewSoul = (soul: Soul) => {
    setSelectedSoul(soul);
    setIsViewModalOpen(true);
  };

  const SoulCard = ({ soul }: { soul: Soul }) => (
    <Card className={`${soul.added_by_user_id === user?.user_id ? 'bg-blue-50 border-blue-200' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Heart className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <div className="font-semibold">{soul.full_name}</div>
              <div className="text-sm text-muted-foreground">{soul.phone}</div>
              <div className="text-xs text-muted-foreground">{soul.gender} • {soul.age_range}</div>
            </div>
          </div>
          <div className="text-right">
            <Badge className={getStatusColor(soul.response_status || '')}>
              {soul.response_status === 'saved' ? 'Saved' : 'Not Saved'}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(soul.outreach_date || '').toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewSoul(soul)}
            className="text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 md:hidden">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Soul Registration
        </h1>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Desktop Header */}
        <div className="hidden md:flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Heart className="h-5 w-5 md:h-6 md:w-6 text-red-500" />
              Soul Registration
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">Register and manage souls from your outreach</p>
          </div>
        </div>

        <Tabs defaultValue="register" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="register" className="text-xs md:text-sm">Register Soul</TabsTrigger>
            <TabsTrigger value="manage" className="text-xs md:text-sm">Manage Souls</TabsTrigger>
          </TabsList>

          {/* Register Soul Tab */}
          <TabsContent value="register">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Register New Soul</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={soulForm.full_name}
                        onChange={(e) => setSoulForm(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Enter full name"
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={soulForm.phone}
                        onChange={(e) => setSoulForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter phone number"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender *</Label>
                      <Select value={soulForm.gender} onValueChange={(value) => setSoulForm(prev => ({ ...prev, gender: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="age_range">Age Range *</Label>
                      <Select value={soulForm.age_range} onValueChange={(value) => setSoulForm(prev => ({ ...prev, age_range: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select age range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0-17">0-17</SelectItem>
                          <SelectItem value="18-25">18-25</SelectItem>
                          <SelectItem value="26-35">26-35</SelectItem>
                          <SelectItem value="36-45">36-45</SelectItem>
                          <SelectItem value="46-55">46-55</SelectItem>
                          <SelectItem value="56+">56+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={soulForm.address}
                      onChange={(e) => setSoulForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter address"
                      className="w-full"
                    />
                  </div>

                  {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> */}
                  {/* <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={soulForm.latitude}
                        onChange={(e) => setSoulForm(prev => ({ ...prev, latitude: e.target.value }))}
                        placeholder="0.000000"
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={soulForm.longitude}
                        onChange={(e) => setSoulForm(prev => ({ ...prev, longitude: e.target.value }))}
                        placeholder="0.000000"
                        className="w-full"
                      />
                    </div> */}

                  <div className="space-y-2">
                    <Label htmlFor="response_status">Status *</Label>
                    <Select value={soulForm.response_status} onValueChange={(value: 'saved' | 'not_saved' | 'already_saved') => setSoulForm(prev => ({ ...prev, response_status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saved">Saved</SelectItem>
                        <SelectItem value="not_saved">Not Saved</SelectItem>
                        <SelectItem value="already_saved">Already Saved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* </div> */}

                  <div className="space-y-2">
                    <Label htmlFor="note">Notes</Label>
                    <Textarea
                      id="note"
                      value={soulForm.note}
                      onChange={(e) => setSoulForm(prev => ({ ...prev, note: e.target.value }))}
                      placeholder="Add any additional notes..."
                      className="min-h-[100px] w-full"
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full md:w-auto">
                    {loading ? "Registering..." : "Register Soul"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Souls Tab */}
          <TabsContent value="manage">
            <div className="space-y-4 md:space-y-6">
              {/* Search and Filters */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search souls by name, phone, or address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                      />
                    </div>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Status Tabs */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'saved' | 'not_saved')}>
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="saved" className="text-xs md:text-sm">Souls Saved</TabsTrigger>
                  <TabsTrigger value="not_saved" className="text-xs md:text-sm">Not Saved</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                  {loading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <>
                      {/* Mobile View - Cards */}
                      <div className="md:hidden space-y-3">
                        {filteredSouls.length === 0 ? (
                          <Card>
                            <CardContent className="p-8 text-center">
                              <p className="text-muted-foreground">No souls found in this category.</p>
                            </CardContent>
                          </Card>
                        ) : (
                          filteredSouls.map((soul) => (
                            <SoulCard key={soul.soul_id} soul={soul} />
                          ))
                        )}
                      </div>

                      {/* Desktop View - Accordion */}
                      <div className="hidden md:block">
                        <Card className="glass-card">
                          <CardHeader>
                            <CardTitle className="text-lg md:text-xl">
                              {activeTab === 'saved' ? 'Souls Saved' : 'Not Saved'} ({filteredSouls.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {filteredSouls.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                No souls found in this category.
                              </div>
                            ) : (
                              <Accordion type="single" collapsible className="w-full">
                                {filteredSouls.map((soul) => (
                                  <AccordionItem key={soul.soul_id} value={soul.soul_id}>
                                    <AccordionTrigger className="hover:no-underline">
                                      <div className="flex items-center gap-4 w-full">
                                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                          <Heart className="h-5 w-5 text-red-500" />
                                        </div>
                                        <div className="flex-1 text-left">
                                          <div className="font-semibold">{soul.full_name}</div>
                                          <div className="text-sm text-muted-foreground">
                                            {soul.phone} • {soul.gender} • {soul.age_range}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <Badge className={getStatusColor(soul.response_status || '')}>
                                            {soul.response_status === 'saved' ? 'Saved' : 'Not Saved'}
                                          </Badge>
                                          <div className="text-xs text-muted-foreground mt-1">
                                            {new Date(soul.outreach_date || '').toLocaleDateString()}
                                          </div>
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="pt-4 pl-14">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                          <div><span className="font-medium">Address:</span> {soul.address}</div>
                                          {soul.latitude && soul.longitude && (
                                            <div><span className="font-medium">Coordinates:</span> {soul.latitude}, {soul.longitude}</div>
                                          )}
                                          {soul.note && (
                                            <div className="col-span-full"><span className="font-medium">Notes:</span> {soul.note}</div>
                                          )}
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                          <Button variant="outline" size="sm">
                                            <Edit className="h-4 w-4 mr-1" />
                                            Edit
                                          </Button>
                                          <Button variant="outline" size="sm">
                                            <MapPin className="h-4 w-4 mr-1" />
                                            View on Map
                                          </Button>
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>

        {/* View Soul Modal/Drawer */}
        {isMobile ? (
          <Drawer open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {selectedSoul?.full_name} - Details
                </DrawerTitle>
              </DrawerHeader>
              {selectedSoul && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Phone:</span>
                      <span>{selectedSoul.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Gender:</span>
                      <span>{selectedSoul.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Age Range:</span>
                      <span>{selectedSoul.age_range}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <Badge className={getStatusColor(selectedSoul.response_status || '')}>
                        {selectedSoul.response_status === 'saved' ? 'Saved' : 'Not Saved'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Address:</span>
                      <span className="text-right">{selectedSoul.address}</span>
                    </div>
                    {selectedSoul.note && (
                      <div>
                        <span className="font-medium">Notes:</span>
                        <p className="mt-1 text-muted-foreground">{selectedSoul.note}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {selectedSoul?.full_name} - Details
                </DialogTitle>
              </DialogHeader>
              {selectedSoul && (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Phone:</span> {selectedSoul.phone}
                        </div>
                        <div>
                          <span className="font-medium">Gender:</span> {selectedSoul.gender}
                        </div>
                        <div>
                          <span className="font-medium">Age Range:</span> {selectedSoul.age_range}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span>{' '}
                          <Badge className={getStatusColor(selectedSoul.response_status || '')}>
                            {selectedSoul.response_status === 'saved' ? 'Saved' : 'Not Saved'}
                          </Badge>
                        </div>
                        <div className="col-span-full">
                          <span className="font-medium">Address:</span> {selectedSoul.address}
                        </div>
                        {selectedSoul.latitude && selectedSoul.longitude && (
                          <div className="col-span-full">
                            <span className="font-medium">Coordinates:</span> {selectedSoul.latitude}, {selectedSoul.longitude}
                          </div>
                        )}
                        {selectedSoul.note && (
                          <div className="col-span-full">
                            <span className="font-medium">Notes:</span> {selectedSoul.note}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default SoulRegistration;
