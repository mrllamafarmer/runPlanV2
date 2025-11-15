import { useEffect, useRef } from 'react';
import type { Event, RouteData, Waypoint, CalculatedLeg } from '../types';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface PrintViewProps {
  event: Event;
  routeData: RouteData | null;
  waypoints: Waypoint[];
  legs: CalculatedLeg[];
  onClose: () => void;
}

export default function PrintView({ event, routeData, waypoints, legs, onClose }: PrintViewProps) {
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Draw elevation chart
    if (chartCanvasRef.current && routeData) {
      drawElevationChart(chartCanvasRef.current, routeData, waypoints);
    }

    // Auto-print after a short delay to let everything render
    const timer = setTimeout(() => {
      window.print();
      // Close after printing
      setTimeout(onClose, 500);
    }, 1000);

    return () => clearTimeout(timer);
  }, [routeData, waypoints, onClose]);

  const metersToMiles = (meters?: number) => {
    if (!meters) return '0.00';
    return (meters / 1609.34).toFixed(2);
  };

  const metersToFeet = (meters?: number) => {
    if (!meters) return '0';
    return (meters * 3.28084).toFixed(0);
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return '--:--:--';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.round((minutes % 1) * 60);
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (pace?: number) => {
    if (!pace) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getWaypoint = (waypointId?: string) => {
    return waypoints.find((w) => w.id === waypointId);
  };

  const drawElevationChart = (canvas: HTMLCanvasElement, data: RouteData, wpts: Waypoint[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Calculate bounds
    const coordinates = data.route.coordinates;
    let totalDistance = 0;
    const distances: number[] = [0];
    const elevations: number[] = [coordinates[0][2]];

    for (let i = 1; i < coordinates.length; i++) {
      const dist = getDistance(coordinates[i - 1], coordinates[i]);
      totalDistance += dist;
      distances.push(totalDistance / 1609.34); // Convert to miles
      elevations.push(coordinates[i][2] * 3.28084); // Convert to feet
    }

    const maxDist = totalDistance / 1609.34;
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);
    const elevRange = maxElev - minElev;

    // Draw axes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw elevation line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    distances.forEach((dist, i) => {
      const x = padding + (dist / maxDist) * (width - 2 * padding);
      const y = height - padding - ((elevations[i] - minElev) / elevRange) * (height - 2 * padding);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw waypoint markers
    wpts.forEach((wpt) => {
      if (wpt.distance_from_start !== undefined) {
        const dist = wpt.distance_from_start / 1609.34;
        const x = padding + (dist / maxDist) * (width - 2 * padding);
        const elev = (wpt.elevation || 0) * 3.28084;
        const y = height - padding - ((elev - minElev) / elevRange) * (height - 2 * padding);

        ctx.fillStyle = wpt.waypoint_type === 'checkpoint' ? '#10b981' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Draw labels
    ctx.fillStyle = '#000';
    ctx.font = '12px sans-serif';
    ctx.fillText('Distance (miles)', width / 2 - 40, height - 5);
    ctx.save();
    ctx.translate(10, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Elevation (feet)', 0, 0);
    ctx.restore();
  };

  const getDistance = (coord1: number[], coord2: number[]) => {
    const R = 6371e3;
    const φ1 = (coord1[1] * Math.PI) / 180;
    const φ2 = (coord2[1] * Math.PI) / 180;
    const Δφ = ((coord2[1] - coord1[1]) * Math.PI) / 180;
    const Δλ = ((coord2[0] - coord1[0]) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const createIcon = (type: string) => {
    const color = type === 'checkpoint' ? 'green' : type === 'food' ? 'orange' : type === 'water' ? 'blue' : 'red';
    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="24" height="24"><circle cx="12" cy="12" r="10"/></svg>`)}`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const routePath = routeData?.route.coordinates.map(
    (coord) => [coord[1], coord[0]] as [number, number]
  );

  const bounds = routeData?.metadata.bounding_box;

  return (
    <div className="print-view">
      {/* Print-only styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-view, .print-view * {
            visibility: visible;
          }
          .print-view {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .page-break {
            page-break-after: always;
          }
          .no-print {
            display: none !important;
          }
        }
        @media screen {
          .print-view {
            background: white;
            padding: 20px;
            max-width: 8.5in;
            margin: 0 auto;
          }
        }
      `}</style>

      {/* Page 1: Event Info, Map, and Elevation */}
      <div className="page-break">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Date:</strong> {new Date(event.planned_date).toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</p>
            <p><strong>Distance:</strong> {metersToMiles(routeData?.metadata.total_distance_meters)} miles</p>
            <p><strong>Target Duration:</strong> {formatTime(event.target_duration_minutes)}</p>
            <p><strong>Elevation Gain:</strong> {metersToFeet(routeData?.metadata.elevation_gain_meters)} ft</p>
            <p><strong>Elevation Loss:</strong> {metersToFeet(routeData?.metadata.elevation_loss_meters)} ft</p>
          </div>
        </div>

        {/* Map */}
        {routeData && bounds && (
          <div className="mb-6" style={{ height: '400px', border: '1px solid #ccc' }}>
            <MapContainer
              bounds={bounds}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
              dragging={false}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {routePath && <Polyline positions={routePath} color="blue" weight={3} />}
              {waypoints.map((waypoint) => (
                <Marker
                  key={waypoint.id}
                  position={[waypoint.latitude, waypoint.longitude]}
                  icon={createIcon(waypoint.waypoint_type)}
                />
              ))}
            </MapContainer>
          </div>
        )}

        {/* Elevation Chart */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Elevation Profile</h2>
          <canvas ref={chartCanvasRef} width={750} height={200} style={{ border: '1px solid #ccc' }} />
        </div>
      </div>

      {/* Pages 2+: Leg-by-leg breakdown */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Leg-by-Leg Breakdown</h2>
        
        {legs.map((leg, index) => {
          const waypoint = getWaypoint(leg.end_waypoint_id);
          const legDistance = leg.leg_distance ? leg.leg_distance / 1609.34 : 0;
          const legTime = legDistance * (leg.adjusted_pace || 0);

          return (
            <div key={leg.id} className="mb-6 border-b border-gray-300 pb-4" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Leg {leg.leg_number}: {waypoint?.name || 'Waypoint'}
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600"><strong>Waypoint Type:</strong> {waypoint?.waypoint_type}</p>
                  <p className="text-gray-600"><strong>Leg Distance:</strong> {metersToMiles(leg.leg_distance)} mi</p>
                  <p className="text-gray-600"><strong>Elevation Gain:</strong> {metersToFeet(leg.elevation_gain)} ft</p>
                  <p className="text-gray-600"><strong>Elevation Loss:</strong> {metersToFeet(leg.elevation_loss)} ft</p>
                  <p className="text-gray-600"><strong>Elevation:</strong> {metersToFeet(waypoint?.elevation)} ft</p>
                </div>
                
                <div>
                  <p className="text-gray-600"><strong>Base Pace:</strong> {formatPace(leg.base_pace)} min/mi</p>
                  <p className="text-gray-600"><strong>Adjusted Pace:</strong> {formatPace(leg.adjusted_pace)} min/mi</p>
                  <p className="text-gray-600"><strong>Leg Time:</strong> {formatTime(legTime)}</p>
                  <p className="text-gray-600"><strong>Arrival Time:</strong> {leg.expected_arrival_time ? new Date(leg.expected_arrival_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                  <p className="text-gray-600"><strong>Stop Time:</strong> {leg.stop_time_minutes || 0} min</p>
                  <p className="text-gray-600"><strong>Exit Time:</strong> {leg.exit_time ? new Date(leg.exit_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                </div>
              </div>

              <div className="mt-3 text-sm">
                <p className="text-gray-600"><strong>Cumulative Distance:</strong> {metersToMiles(leg.cumulative_distance)} mi</p>
                <p className="text-gray-600"><strong>Cumulative Time:</strong> {formatTime(leg.cumulative_time_minutes)}</p>
                {waypoint?.comments && (
                  <p className="text-gray-600 mt-2"><strong>Notes:</strong> {waypoint.comments}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Close button (visible on screen only) */}
      <div className="no-print fixed top-4 right-4">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Close Print Preview
        </button>
      </div>
    </div>
  );
}

