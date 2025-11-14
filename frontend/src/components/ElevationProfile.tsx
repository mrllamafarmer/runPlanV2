import { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { RouteData, Waypoint } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ElevationProfileProps {
  routeData: RouteData | null;
  waypoints: Waypoint[];
}

export default function ElevationProfile({ routeData, waypoints }: ElevationProfileProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  if (!routeData?.route?.coordinates || routeData.route.coordinates.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Elevation Profile</h3>
        <div className="text-center py-8 text-gray-500">
          Upload a GPX file to see the elevation profile
        </div>
      </div>
    );
  }

  const coords = routeData.route.coordinates;
  
  // Calculate distances and elevations
  const elevationData: { distance: number; elevation: number }[] = [];
  let cumulativeDistance = 0;
  
  coords.forEach((coord, index) => {
    if (index > 0) {
      const prev = coords[index - 1];
      const lat1 = prev[0] * Math.PI / 180;
      const lat2 = coord[0] * Math.PI / 180;
      const dLat = (coord[0] - prev[0]) * Math.PI / 180;
      const dLon = (coord[1] - prev[1]) * Math.PI / 180;
      
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = 6371000 * c; // meters
      
      cumulativeDistance += distance;
    }
    
    elevationData.push({
      distance: cumulativeDistance / 1609.34, // convert to miles
      elevation: coord[2] * 3.28084, // convert to feet
    });
  });

  // Sample the data for better performance (take every Nth point)
  const sampleRate = Math.ceil(elevationData.length / 500); // Max 500 points
  const sampledData = elevationData.filter((_, index) => index % sampleRate === 0);
  
  // Add waypoint markers
  const waypointMarkers = waypoints.map((wp) => {
    const distanceInMiles = (wp.distance_from_start || 0) / 1609.34;
    // Find closest elevation point
    const closestPoint = sampledData.reduce((closest, point) => {
      const currentDiff = Math.abs(point.distance - distanceInMiles);
      const closestDiff = Math.abs(closest.distance - distanceInMiles);
      return currentDiff < closestDiff ? point : closest;
    }, sampledData[0]);
    
    return {
      x: distanceInMiles,
      y: closestPoint?.elevation || (wp.elevation ? wp.elevation * 3.28084 : 0),
      label: wp.name || `WP${wp.order_index}`,
      type: wp.waypoint_type,
    };
  });

  // Calculate stats (needed for chart options)
  const minElevation = Math.min(...sampledData.map(d => d.elevation));
  const maxElevation = Math.max(...sampledData.map(d => d.elevation));
  const totalDistance = sampledData[sampledData.length - 1]?.distance || 0;
  const elevationGain = routeData.metadata?.elevation_gain_meters 
    ? (routeData.metadata.elevation_gain_meters * 3.28084).toFixed(0)
    : 'N/A';
  const elevationLoss = routeData.metadata?.elevation_loss_meters
    ? (routeData.metadata.elevation_loss_meters * 3.28084).toFixed(0)
    : 'N/A';

  const chartData = {
    datasets: [
      {
        label: 'Elevation',
        data: sampledData.map(d => ({ x: d.distance, y: d.elevation })),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Waypoints',
        data: waypointMarkers.map(wp => ({
          x: wp.x,
          y: wp.y,
        })),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: function(context: any) {
          const index = context.dataIndex;
          const marker = waypointMarkers[index];
          if (!marker) return 'rgb(239, 68, 68)';
          
          const colors: Record<string, string> = {
            checkpoint: 'rgb(59, 130, 246)',
            food: 'rgb(16, 185, 129)',
            water: 'rgb(6, 182, 212)',
            rest: 'rgb(139, 92, 246)',
          };
          return colors[marker.type] || 'rgb(107, 114, 128)';
        },
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false,
        pointStyle: 'circle',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const datasetLabel = context.dataset.label;
            const value = context.parsed.y;
            
            if (datasetLabel === 'Waypoints') {
              const waypointIndex = context.dataIndex;
              const waypoint = waypointMarkers[waypointIndex];
              if (waypoint) {
                return [
                  `${waypoint.label}`,
                  `Elevation: ${value.toFixed(0)} ft`,
                  `Distance: ${waypoint.x.toFixed(2)} mi`,
                ];
              }
            }
            
            return `Elevation: ${value.toFixed(0)} ft`;
          },
          title: function(context: any) {
            if (context[0].dataset.label === 'Waypoints') {
              return 'Waypoint';
            }
            return `Distance: ${context[0].parsed.x.toFixed(2)} mi`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        min: 0,
        max: totalDistance,
        title: {
          display: true,
          text: 'Distance (miles)',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        ticks: {
          callback: function(value: any) {
            return value.toFixed(0);
          },
          maxTicksLimit: 15,
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Elevation (feet)',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
        ticks: {
          callback: function(value: any) {
            return value.toFixed(0);
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Elevation Profile</h3>
          <div className="flex space-x-6 text-sm">
            <div>
              <span className="text-gray-600">Distance: </span>
              <span className="font-medium text-gray-900">{totalDistance.toFixed(2)} mi</span>
            </div>
            <div>
              <span className="text-gray-600">Min: </span>
              <span className="font-medium text-gray-900">{minElevation.toFixed(0)} ft</span>
            </div>
            <div>
              <span className="text-gray-600">Max: </span>
              <span className="font-medium text-gray-900">{maxElevation.toFixed(0)} ft</span>
            </div>
            <div>
              <span className="text-gray-600">Gain: </span>
              <span className="font-medium text-green-600">+{elevationGain} ft</span>
            </div>
            <div>
              <span className="text-gray-600">Loss: </span>
              <span className="font-medium text-red-600">-{elevationLoss} ft</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6" style={{ height: '300px' }}>
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      
      {waypoints.length > 0 && (
        <div className="px-6 pb-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 mt-3">
            {waypoints.map((wp) => {
              const colors: Record<string, string> = {
                checkpoint: 'bg-blue-100 text-blue-800',
                food: 'bg-green-100 text-green-800',
                water: 'bg-cyan-100 text-cyan-800',
                rest: 'bg-purple-100 text-purple-800',
              };
              const colorClass = colors[wp.waypoint_type] || 'bg-gray-100 text-gray-800';
              
              return (
                <div key={wp.id} className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
                  {wp.name || `WP${wp.order_index}`} - {((wp.distance_from_start || 0) / 1609.34).toFixed(2)} mi
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

