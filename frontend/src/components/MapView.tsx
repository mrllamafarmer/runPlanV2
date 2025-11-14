import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { RouteData, Waypoint } from '../types';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Waypoint type colors
const waypointColors: Record<string, string> = {
  START: '#10b981',
  FINISH: '#ef4444',
  checkpoint: '#3b82f6',
  food: '#f59e0b', // Orange for food
  water: '#06b6d4',
  rest: '#8b5cf6',
};

interface MapViewProps {
  routeData: RouteData | null;
  waypoints: Waypoint[];
  onWaypointCreate: (waypoint: Partial<Waypoint>) => void;
  onWaypointUpdate: (id: string, updates: Partial<Waypoint>) => void;
  onWaypointDelete: (id: string) => void;
}

// Component to fit map bounds to route
function FitBounds({ routePath }: { routePath: [number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (routePath.length > 0) {
      const bounds = L.latLngBounds(routePath);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routePath, map]);
  
  return null;
}

export default function MapView({
  routeData,
  waypoints,
  onWaypointCreate,
  onWaypointUpdate,
  onWaypointDelete,
}: MapViewProps) {
  // Convert route coordinates for Polyline
  const routePath = routeData?.route?.coordinates
    ? routeData.route.coordinates.map((coord) => [coord[0], coord[1]] as [number, number])
    : [];

  const createCustomIcon = (type: string, name?: string) => {
    const color = waypointColors[type] || '#6b7280';
    
    // Special styling for START and FINISH
    if (name === 'START') {
      return L.divIcon({
        className: 'custom-waypoint-marker',
        html: `<div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 10px;">S</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
    }
    
    if (name === 'FINISH') {
      return L.divIcon({
        className: 'custom-waypoint-marker',
        html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 10px;">F</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
    }
    
    return L.divIcon({
      className: 'custom-waypoint-marker',
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  return (
    <div className="relative h-full w-full">
      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-4 min-w-[160px]">
        <div className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
          Waypoint Key
        </div>
        <div className="space-y-2">
          {/* System Waypoints */}
          <div className="flex items-center">
            <div
              className="w-5 h-5 rounded-full mr-3 flex items-center justify-center text-white font-bold border-2 border-white shadow-md flex-shrink-0"
              style={{ backgroundColor: '#10b981', fontSize: '10px' }}
            >
              S
            </div>
            <span className="text-xs font-medium text-gray-900">START (green)</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-5 h-5 rounded-full mr-3 flex items-center justify-center text-white font-bold border-2 border-white shadow-md flex-shrink-0"
              style={{ backgroundColor: '#ef4444', fontSize: '10px' }}
            >
              F
            </div>
            <span className="text-xs font-medium text-gray-900">FINISH (red)</span>
          </div>
          
          {/* Divider */}
          <div className="border-t border-gray-300 my-2"></div>
          
          {/* Custom Waypoints */}
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-3 border-2 border-white shadow-md flex-shrink-0"
              style={{ backgroundColor: '#3b82f6' }}
            />
            <span className="text-xs text-gray-900">Checkpoint (blue)</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-3 border-2 border-white shadow-md flex-shrink-0"
              style={{ backgroundColor: '#f59e0b' }}
            />
            <span className="text-xs text-gray-900">Food (orange)</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-3 border-2 border-white shadow-md flex-shrink-0"
              style={{ backgroundColor: '#06b6d4' }}
            />
            <span className="text-xs text-gray-900">Water (cyan)</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-3 border-2 border-white shadow-md flex-shrink-0"
              style={{ backgroundColor: '#8b5cf6' }}
            />
            <span className="text-xs text-gray-900">Rest (purple)</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={[37.7749, -122.4194]}
        zoom={10}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Auto-fit bounds to route */}
        {routePath.length > 0 && <FitBounds routePath={routePath} />}

        {/* Route */}
        {routePath.length > 0 && (
          <Polyline positions={routePath} color="#3b82f6" weight={4} opacity={0.7} />
        )}

        {/* Waypoints */}
        {waypoints.map((waypoint) => (
          <Marker
            key={waypoint.id}
            position={[waypoint.latitude, waypoint.longitude]}
            icon={createCustomIcon(waypoint.waypoint_type, waypoint.name)}
          >
            <Popup>
              <div className="p-2 min-w-[180px]">
                <div className="font-medium text-base mb-2">
                  {waypoint.name || `${waypoint.waypoint_type} ${waypoint.order_index || ''}`}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">
                    Type: <span className="capitalize">{waypoint.waypoint_type}</span>
                  </div>
                  {waypoint.stop_time_minutes > 0 && (
                    <div className="text-xs text-gray-600">
                      Stop: {waypoint.stop_time_minutes} min
                    </div>
                  )}
                  {waypoint.distance_from_start !== undefined && (
                    <div className="text-xs text-gray-600">
                      Distance: {(waypoint.distance_from_start / 1609.34).toFixed(2)} mi
                    </div>
                  )}
                  {waypoint.elevation && (
                    <div className="text-xs text-gray-600">
                      Elevation: {Math.round(waypoint.elevation * 3.28084)} ft
                    </div>
                  )}
                  {waypoint.comments && (
                    <div className="text-xs text-gray-600 mt-2 italic">
                      {waypoint.comments}
                    </div>
                  )}
                </div>
                {waypoint.name !== 'START' && waypoint.name !== 'FINISH' && (
                  <button
                    onClick={() => onWaypointDelete(waypoint.id)}
                    className="mt-3 w-full px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded"
                  >
                    Delete Waypoint
                  </button>
                )}
                {(waypoint.name === 'START' || waypoint.name === 'FINISH') && (
                  <div className="mt-2 text-xs text-gray-500 italic text-center">
                    System waypoint (cannot be deleted)
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

