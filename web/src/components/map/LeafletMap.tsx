
import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapData {
  id: number;
  name: string;
  coordinates: { lat: number; lng: number };
  soulsCount: number;
  color: string;
  activeFollowUps?: number;
  weeklyGrowth?: number;
}

interface LeafletMapProps {
  data: MapData[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}

  const polygonCoords: [number, number][] = [
    [6.6211, 3.3315],
    [6.6056, 3.3395],
    [6.6137, 3.3640],
    [6.6282, 3.3710],
    [6.6380, 3.3525],
    [6.6211, 3.3315],
  ];


const LeafletMap: React.FC<LeafletMapProps> = ({ 
  data, 
  center = [6.6211, 3.3315], 
  zoom = 12,
  className = "w-full h-full"
}) => {
  return (
    <div className={className} style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {data.map((sector) => (
          <CircleMarker
            key={sector.id}
            center={[sector.coordinates.lat, sector.coordinates.lng]}
            radius={Math.max(10, sector.soulsCount / 2)}
            pathOptions={{
              color: sector.color,
              fillColor: sector.color,
              fillOpacity: 0.45,
              weight: 0.7
            }}
          > 
          {/* <Polygon
            positions={polygonCoords}
            pathOptions={{ color: 'purple', fillOpacity: 0.1,weight:0.5 }}
          /> */}
            <Popup>
              <div className="text-sm">
                <div className="font-medium">{sector.name}</div>
                <div>{sector.soulsCount} souls reached</div>
                {sector.activeFollowUps && (
                  <div>{sector.activeFollowUps} active follow-ups</div>
                )}
                {sector.weeklyGrowth && <div>+{sector.weeklyGrowth} this week</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;
