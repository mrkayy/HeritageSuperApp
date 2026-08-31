import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Heart, Search, Filter, Eye, Edit, MapPin } from 'lucide-react';
import { Soul } from '@/services/soulService';

interface SoulsListProps {
  filteredSouls: Soul[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeTab: 'saved' | 'already_saved' | 'not_saved';
  setActiveTab: (tab: 'saved' | 'already_saved' | 'not_saved') => void;
  getStatusColor: (status: string) => string;
  handleViewSoul: (soul: Soul) => void;
  currentUserId?: string;
}

function SoulCard({
  soul,
  getStatusColor,
  handleViewSoul,
  currentUserId,
}: {
  soul: Soul;
  getStatusColor: (status: string) => string;
  handleViewSoul: (soul: Soul) => void;
  currentUserId?: string;
}) {
  return (
    <Card className={`${soul.added_by_user_id === currentUserId ? 'bg-blue-50 border-blue-200' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Heart className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <div className="font-semibold">{soul.full_name}</div>
              <div className="text-sm text-muted-foreground">{soul.phone}</div>
              <div className="text-xs text-muted-foreground">{soul.gender} - {soul.age_range}</div>
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
}

export function SoulsList({
  filteredSouls,
  loading,
  searchTerm,
  setSearchTerm,
  activeTab,
  setActiveTab,
  getStatusColor,
  handleViewSoul,
  currentUserId,
}: SoulsListProps) {
  return (
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
                    <SoulCard
                      key={soul.soul_id}
                      soul={soul}
                      getStatusColor={getStatusColor}
                      handleViewSoul={handleViewSoul}
                      currentUserId={currentUserId}
                    />
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
                          <AccordionItem key={soul.soul_id} value={soul.soul_id!}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-4 w-full">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                  <Heart className="h-5 w-5 text-red-500" />
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="font-semibold">{soul.full_name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {soul.phone} - {soul.gender} - {soul.age_range}
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
  );
}
