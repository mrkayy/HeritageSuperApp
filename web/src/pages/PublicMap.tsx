
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MapPin,
  Heart,
  Calendar,
  TrendingUp,
  Users,
  Church,
  Eye,
  X,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import LeafletMap from '@/components/map/LeafletMap';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});


const PublicMap = () => {
  const [timeFilter, setTimeFilter] = useState('month');
  const [showInfo, setShowInfo] = useState(false);

  // Mock data
  const publicStats = {
    totalSouls: 426,
    thisWeek: 23,
    thisMonth: 89,
    activeSectors: 4,
    lastUpdated: "2 hours ago"
  };

  const polygonCoords: [number, number][] = [
    [6.6211, 3.3315],
    [6.6056, 3.3395],
    [6.6137, 3.3640],
    [6.6282, 3.3710],
    [6.6380, 3.3525],
    [6.6211, 3.3315],
  ];

  const sectorData = [
    {
      id: 1,
      name: "North Sector",
      coordinates: { lat: polygonCoords[0][0], lng: polygonCoords[0][1] },
      soulsCount: 125,
      weeklyGrowth: 8,
      color: "#3B82F6"
    },
    {
      id: 2,
      name: "South Sector",
      coordinates: { lat: polygonCoords[1][0], lng: polygonCoords[1][1] },
      soulsCount: 98,
      weeklyGrowth: 5,
      color: "#EF4444"
    },
    {
      id: 3,
      name: "East Sector",
      coordinates: { lat: polygonCoords[2][0], lng: polygonCoords[2][1] },
      soulsCount: 112,
      weeklyGrowth: 7,
      color: "#10B981"
    },
    {
      id: 4,
      name: "West Sector",
      coordinates: { lat: polygonCoords[3][0], lng: polygonCoords[3][1] },
      soulsCount: 91,
      weeklyGrowth: 3,
      color: "#F59E0B"
    }
  ];

  const recentActivity = [
    { date: "Today", count: 5, location: "North Sector" },
    { date: "Yesterday", count: 8, location: "Multiple Sectors" },
    { date: "June 21", count: 4, location: "South Sector" },
    { date: "June 20", count: 6, location: "East Sector" }
  ];

  return (
    <div className="fixed inset-0 w-full h-full page-background">
      {/* Full-screen Map Background */}
      <div className="absolute inset-0 z-0">
        <LeafletMap data={sectorData} />
        {/* <MapContainer
          center={[6.6211, 3.3415]}
          zoom={122}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <Polygon
            positions={polygonCoords}
            pathOptions={{ color: 'purple', fillOpacity: 0.2 }}
          />
        </MapContainer>
        */}
      </div> 

      {/* Floating Header */}
      {/* <div className="absolute top-0 left-0 right-0 z-10">
        <Card className="backdrop-blur-lg bg-white/95 border-white/20 shadow-xl rounded-none border-x-0 border-t-0 opacity-55">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center">
                  <img 
                    src="/lovable-uploads/60590913-3ee4-42d4-96aa-92a4316a4edc.png" 
                    alt="Soul Bank Logo" 
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Soul Bank</h1>
                  <p className="text-sm text-muted-foreground">Public Outreach Map</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInfo(!showInfo)}
                >
                  {showInfo ? <X className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                </Button>
                <Link to="/login">
                  <Button variant="outline" size="sm">Login</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-red-500 hover:bg-red-600">Join Us</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Floating Welcome Banner */}
      {/* <div className="absolute top-20 left-4 right-4 z-10">
        <Card className="backdrop-blur-md bg-white/90 border-white/20 shadow-xl">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Spreading Love, One Soul at a Time</h2>
            <p className="text-muted-foreground mb-4">
              See the real-time impact of our church outreach efforts across the community.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>Last updated: {publicStats.lastUpdated}</span>
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Floating Stats Cards */}
      <div className="absolute top-25 left-4 right-4 z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="backdrop-blur-md bg-white/90 border-white/20 shadow-lg text-center opacity-55">
            <CardContent className="p-4">
              <Heart className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{publicStats.totalSouls}</div>
              <div className="text-xs text-muted-foreground">Souls Reached</div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/90 border-white/20 shadow-lg text-center opacity-55">
            <CardContent className="p-4">
              <Calendar className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">+{publicStats.thisWeek}</div>
              <div className="text-xs text-muted-foreground">This Week</div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/90 border-white/20 shadow-lg text-center opacity-55">
            <CardContent className="p-4">
              <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">+{publicStats.thisMonth}</div>
              <div className="text-xs text-muted-foreground">This Month</div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/90 border-white/20 shadow-lg text-center opacity-55">
            <CardContent className="p-4">
              <MapPin className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{publicStats.activeSectors}</div>
              <div className="text-xs text-muted-foreground">Active Sectors</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Controls */}
      <div className="absolute top-80 left-4 z-10">
        <Card className="backdrop-blur-md bg-white/95 border-white/20 shadow-xl w-48">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Map Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Floating Info Panel */}
      {showInfo && (
        <div className="absolute top-20 right-4 w-80 max-w-[calc(100vw-2rem)] z-10 space-y-4">
          {/* Sector Breakdown */}
          <Card className="backdrop-blur-md bg-white/95 border-white/20 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sector Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-48 overflow-y-auto">
              {sectorData.map((sector) => (
                <div key={sector.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: sector.color }}
                    ></div>
                    <span className="text-sm font-medium">{sector.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{sector.soulsCount}</div>
                    <div className="text-xs text-green-600">+{sector.weeklyGrowth}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="backdrop-blur-md bg-white/95 border-white/20 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-48 overflow-y-auto">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{activity.date}</div>
                    <div className="text-xs text-muted-foreground">{activity.location}</div>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    +{activity.count} souls
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Call to Action */}
      <div className="absolute bottom-4 right-4 w-72 max-w-[calc(100vw-2rem)] z-10">
        <Card className="backdrop-blur-md bg-gradient-to-r from-blue-50/90 to-purple-50/90 border-blue-200/50 shadow-xl">
          <CardContent className="p-6 text-center">
            <Heart className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Join Our Mission</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Be part of spreading love and hope in our community.
            </p>
            <div className="space-y-2">
              <Link to="/register">
                <Button className="w-full" size="sm">Get Started</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="w-full" size="sm">
                  Already a Member?
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Church Info Badge */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="backdrop-blur-md bg-white/90 border-white/20 shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <Church className="h-4 w-4 text-red-500" />
              <span className="font-medium">Grace Community Church</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicMap;
