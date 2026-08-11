
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MapPin, 
  Users, 
  Heart, 
  MessageSquare, 
  Calendar,
  Filter,
  Menu,
  X
} from 'lucide-react';
import LeafletMap from '@/components/map/LeafletMap';
import { useSidebar } from "@/components/ui/sidebar";

const MapView = () => {
  const { user } = useAuth();
  const { setOpen } = useSidebar();
  const [selectedSector, setSelectedSector] = useState('all');
  const [viewMode, setViewMode] = useState('heatmap');
  const [showControls, setShowControls] = useState(false);

  // Hide sidebar on mount, restore on unmount
  useEffect(() => {
    setOpen(false);
    return () => setOpen(true);
  }, [setOpen]);

  // Mock data
  const sectorData = [
    {
      id: 1,
      name: "North Sector",
      coordinates: { lat: 40.7589, lng: -73.9851 },
      soulsCount: 47,
      activeFollowUps: 12,
      lastActivity: "2 hours ago",
      teams: ["Alpha Team", "Beta Team"],
      color: "#3B82F6"
    },
    {
      id: 2,
      name: "South Sector",
      coordinates: { lat: 40.7489, lng: -73.9851 },
      soulsCount: 32,
      activeFollowUps: 8,
      lastActivity: "4 hours ago",
      teams: ["Gamma Team"],
      color: "#EF4444"
    },
    {
      id: 3,
      name: "East Sector",
      coordinates: { lat: 40.7589, lng: -73.9751 },
      soulsCount: 28,
      activeFollowUps: 6,
      lastActivity: "1 day ago",
      teams: ["Delta Team"],
      color: "#10B981"
    },
    {
      id: 4,
      name: "West Sector",
      coordinates: { lat: 40.7589, lng: -73.9951 },
      soulsCount: 19,
      activeFollowUps: 4,
      lastActivity: "6 hours ago",
      teams: ["Epsilon Team"],
      color: "#F59E0B"
    }
  ];

  const recentOutreach = [
    {
      id: 1,
      soulName: "Sarah Johnson",
      location: "North Sector",
      date: "Today, 2:30 PM",
      team: "Alpha Team",
      type: "Street Outreach"
    },
    {
      id: 2,
      soulName: "Mike Davis",
      location: "West Sector",
      date: "Today, 1:15 PM",
      team: "Epsilon Team",
      type: "Door to Door"
    },
    {
      id: 3,
      soulName: "Anna Williams",
      location: "South Sector",
      date: "Yesterday, 4:45 PM",
      team: "Gamma Team",
      type: "Community Event"
    }
  ];

  const totalSouls = sectorData.reduce((sum, sector) => sum + sector.soulsCount, 0);
  const totalFollowUps = sectorData.reduce((sum, sector) => sum + sector.activeFollowUps, 0);

  const filteredSectors = selectedSector === 'all' 
    ? sectorData 
    : sectorData.filter(sector => sector.id.toString() === selectedSector);

  return (
    <div className="fixed inset-0 w-full h-full">
      {/* Full-screen Map Background */}
      <div className="absolute inset-0 z-0">
        <LeafletMap data={filteredSectors} />
      </div>

      {/* Floating Header */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <Card className="backdrop-blur-md bg-white/90 border-white/20 shadow-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(true)}
                  className="lg:hidden"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold">Outreach Map</h1>
                  <p className="text-sm text-muted-foreground">Visual overview of soul outreach activities</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowControls(!showControls)}
              >
                {showControls ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Stats Cards */}
      <div className="absolute top-24 left-4 right-4 z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="backdrop-blur-md bg-white/90 border-white/20 shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Heart className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Souls</p>
                  <p className="text-lg font-bold">{totalSouls}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/90 border-white/20 shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Follow-ups</p>
                  <p className="text-lg font-bold">{totalFollowUps}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/90 border-white/20 shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sectors</p>
                  <p className="text-lg font-bold">{sectorData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/90 border-white/20 shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">This Week</p>
                  <p className="text-lg font-bold">+23</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Controls Panel */}
      {showControls && (
        <div className="absolute top-40 left-4 right-4 md:left-4 md:right-auto md:w-80 z-10 space-y-4">
          {/* Filter Controls */}
          <Card className="backdrop-blur-md bg-white/95 border-white/20 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">View Mode</label>
                <Select value={viewMode} onValueChange={setViewMode}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="heatmap">Heatmap View</SelectItem>
                    <SelectItem value="markers">Marker View</SelectItem>
                    <SelectItem value="clusters">Cluster View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Sector Filter</label>
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    {sectorData.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id.toString()}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sector Details */}
          <Card className="backdrop-blur-md bg-white/95 border-white/20 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sector Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-60 overflow-y-auto">
              {filteredSectors.map((sector) => (
                <div key={sector.id} className="p-2 border rounded-lg bg-white/50">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium">{sector.name}</h3>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: sector.color }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <div>Souls: <span className="font-medium">{sector.soulsCount}</span></div>
                    <div>Follow-ups: <span className="font-medium">{sector.activeFollowUps}</span></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Last: {sector.lastActivity}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {sector.teams.map((team, index) => (
                      <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                        {team}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Recent Activity */}
      <div className="absolute bottom-4 right-4 w-80 max-w-[calc(100vw-2rem)] z-10">
        <Card className="backdrop-blur-md bg-white/95 border-white/20 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Recent Outreach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {recentOutreach.map((activity) => (
              <div key={activity.id} className="p-2 bg-white/50 rounded-lg">
                <div className="font-medium text-sm">{activity.soulName}</div>
                <div className="text-xs text-muted-foreground">
                  {activity.location} • {activity.team}
                </div>
                <div className="text-xs text-muted-foreground">{activity.date}</div>
                <Badge variant="outline" className="text-xs mt-1">
                  {activity.type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MapView;
