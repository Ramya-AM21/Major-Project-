import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix standard Leaflet default marker icons resolving mismatch in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Curated custom markers using distinct SVGs for high UX clarity (Role shapes, colors)
const createCustomIcon = (color: string) => {
  return new L.DivIcon({
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.4);"></div>`,
    className: 'custom-leaflet-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const providerIcon = createCustomIcon('#3ba96e'); // brand green
const zoneIcon = createCustomIcon('#256c44'); // dark forest green for receiving shelter
const volunteerIcon = createCustomIcon('#3b82f6'); // blue for volunteer commute
const currentPositionIcon = createCustomIcon('#ef4444'); // red indicator

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  role?: 'PROVIDER' | 'VOLUNTEER' | 'ZONE' | 'CURRENT';
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  polylinePoints?: [number, number][]; // drawing path
  onLocationSelect?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

// Controller to auto-fit bounds when coordinates shift
const MapBoundsAdjuster: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
};

// Map click listener to register coordinates selection
const ClickHandler: React.FC<{ onSelect?: (lat: number, lng: number) => void }> = ({ onSelect }) => {
  useMapEvents({
    click(e: any) {
      if (onSelect) {
        onSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

export const MapView: React.FC<MapViewProps> = ({
  center = [12.9716, 77.5946], // Bangalore center
  zoom = 12,
  markers = [],
  polylinePoints = [],
  onLocationSelect,
  interactive = true,
}) => {
  
  const getMarkerIcon = (role?: string) => {
    switch (role) {
      case 'PROVIDER': return providerIcon;
      case 'ZONE': return zoneIcon;
      case 'VOLUNTEER': return volunteerIcon;
      case 'CURRENT': return currentPositionIcon;
      default: return new L.Icon.Default();
    }
  };

  // Compile all points to map bounds
  const fitPoints: [number, number][] = [
    ...markers.map(m => [m.latitude, m.longitude] as [number, number]),
    ...polylinePoints
  ];

  return (
    <div className="w-full h-full relative border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* @ts-ignore */}
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '105%', height: '100%' }}
      >
        {/* @ts-ignore */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.map((marker) => (
          /* @ts-ignore */
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            icon={getMarkerIcon(marker.role)}
          >
            <Popup>
              <div className="p-1">
                <h5 className="font-semibold text-sm text-gray-901">{marker.title}</h5>
                {marker.description && <p className="text-xs text-gray-650 mt-1">{marker.description}</p>}
                <div className="text-[10px] text-gray-400 mt-1 bg-gray-50 p-1 rounded font-mono">
                  {marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {polylinePoints && polylinePoints.length > 1 && (
          /* @ts-ignore */
          <Polyline 
            positions={polylinePoints} 
            color="#3b82f6" 
            weight={4}
            opacity={0.8}
            dashArray="5, 10" 
          />
        )}

        {/* Fit the view bounds if markers or polyline exists */}
        {fitPoints.length > 0 && <MapBoundsAdjuster points={fitPoints} />}

        {/* Select coordinates on click */}
        {interactive && onLocationSelect && <ClickHandler onSelect={onLocationSelect} />}
      </MapContainer>
      
      {onLocationSelect && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-250 shadow-md text-xs font-medium text-gray-700 z-[1000] pointer-events-none">
          Click any spot on the map to capture coordinates
        </div>
      )}
    </div>
  );
};
