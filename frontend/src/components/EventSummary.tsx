import { useState } from 'react';
import { Calendar, MapPin, TrendingUp, TrendingDown, Edit2, Save, X } from 'lucide-react';
import type { Event, RouteData } from '../types';

interface EventSummaryProps {
  event: Event;
  routeData: RouteData | null;
  onUpdate?: (updates: Partial<Event>) => void;
}

export default function EventSummary({ event, routeData, onUpdate }: EventSummaryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDate, setEditedDate] = useState(event.planned_date);
  const [editedDuration, setEditedDuration] = useState(
    event.target_duration_minutes 
      ? minutesToHHMMSS(event.target_duration_minutes) 
      : '00:00:00'
  );

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'Not set';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Convert minutes to HH:MM:SS format
  function minutesToHHMMSS(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.floor((totalMinutes % 1) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // Convert HH:MM:SS format to minutes
  function hhmmssToMinutes(timeString: string): number {
    const parts = timeString.split(':');
    const hours = parseInt(parts[0] || '0', 10);
    const minutes = parseInt(parts[1] || '0', 10);
    const seconds = parseInt(parts[2] || '0', 10);
    return hours * 60 + minutes + seconds / 60;
  }

  const metersToMiles = (meters: number) => (meters / 1609.34).toFixed(2);
  const metersToFeet = (meters: number) => (meters * 3.28084).toFixed(0);

  const handleSave = () => {
    if (onUpdate) {
      const updates: Partial<Event> = {
        planned_date: editedDate,
        target_duration_minutes: hhmmssToMinutes(editedDuration)
      };
      onUpdate(updates);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedDate(event.planned_date);
    setEditedDuration(
      event.target_duration_minutes 
        ? minutesToHHMMSS(event.target_duration_minutes) 
        : '00:00:00'
    );
    setIsEditing(false);
  };

  // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatForInput = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Event Summary</h2>
        {onUpdate && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-md"
            title="Edit date/time"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}
        {isEditing && (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded-md"
              title="Save"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start">
          <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 mb-1">Date & Time</div>
            {isEditing ? (
              <input
                type="datetime-local"
                value={formatForInput(editedDate)}
                onChange={(e) => setEditedDate(new Date(e.target.value).toISOString())}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm px-3 py-2 text-gray-900 bg-white"
              />
            ) : (
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
            )}
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
          {isEditing ? (
            <input
              type="text"
              value={editedDuration}
              onChange={(e) => setEditedDuration(e.target.value)}
              placeholder="HH:MM:SS"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm px-3 py-2 text-gray-900 bg-white font-mono"
            />
          ) : (
            <div className="text-sm text-gray-600">
              {formatDuration(event.target_duration_minutes)}
            </div>
          )}
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

