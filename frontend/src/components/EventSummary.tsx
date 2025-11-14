import { Calendar, MapPin, TrendingUp, TrendingDown } from 'lucide-react';
import type { Event, RouteData } from '../types';

interface EventSummaryProps {
  event: Event;
  routeData: RouteData | null;
}

export default function EventSummary({ event, routeData }: EventSummaryProps) {
  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'Not set';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const metersToMiles = (meters: number) => (meters / 1609.34).toFixed(2);
  const metersToFeet = (meters: number) => (meters * 3.28084).toFixed(0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Summary</h2>
      
      <div className="space-y-3">
        <div className="flex items-start">
          <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-gray-900">Date</div>
            <div className="text-sm text-gray-600">
              {new Date(event.planned_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>

        <div className="flex items-start">
          <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-gray-900">Distance</div>
            <div className="text-sm text-gray-600">
              {event.distance
                ? `${event.distance.toFixed(2)} miles`
                : routeData?.metadata
                ? `${metersToMiles(routeData.metadata.total_distance_meters)} miles`
                : 'No route uploaded'}
            </div>
          </div>
        </div>

        {routeData?.metadata && (
          <>
            <div className="flex items-start">
              <TrendingUp className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-gray-900">Elevation Gain</div>
                <div className="text-sm text-gray-600">
                  {metersToFeet(routeData.metadata.elevation_gain_meters)} feet
                </div>
              </div>
            </div>

            <div className="flex items-start">
              <TrendingDown className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-gray-900">Elevation Loss</div>
                <div className="text-sm text-gray-600">
                  {metersToFeet(routeData.metadata.elevation_loss_meters)} feet
                </div>
              </div>
            </div>
          </>
        )}

        <div className="pt-3 border-t border-gray-200">
          <div className="text-sm font-medium text-gray-900 mb-1">Target Duration</div>
          <div className="text-sm text-gray-600">
            {formatDuration(event.target_duration_minutes)}
          </div>
        </div>

        {event.target_duration_minutes && event.distance && (
          <div>
            <div className="text-sm font-medium text-gray-900 mb-1">Average Pace</div>
            <div className="text-sm text-gray-600">
              {(event.target_duration_minutes / event.distance).toFixed(2)} min/mile
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

