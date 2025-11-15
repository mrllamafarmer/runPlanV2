import { useState } from 'react';
import { Edit2, Save, X, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { CalculatedLeg, Waypoint, RouteData } from '../types';

interface LegsTableProps {
  legs: CalculatedLeg[];
  waypoints: Waypoint[];
  routeData: RouteData | null;
  onWaypointUpdate: (id: string, updates: Partial<Waypoint>) => void;
  onWaypointDelete: (id: string) => void;
  onWaypointCreate: (waypoint: Partial<Waypoint>) => void;
}

export default function LegsTable({ legs, waypoints, routeData, onWaypointUpdate, onWaypointDelete, onWaypointCreate }: LegsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editingWaypoint, setEditingWaypoint] = useState<string | null>(null);
  const [editStopTime, setEditStopTime] = useState<number>(0);
  const [editComments, setEditComments] = useState<string>('');
  const [editDistance, setEditDistance] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editType, setEditType] = useState<'checkpoint' | 'food' | 'water' | 'rest'>('checkpoint');
  const [showAddWaypointModal, setShowAddWaypointModal] = useState(false);
  const [newWaypointData, setNewWaypointData] = useState({
    distance: '',
    name: '',
    type: 'checkpoint' as 'checkpoint' | 'food' | 'water' | 'rest',
    stopTime: '0',
    comments: '',
  });

  const metersToMiles = (meters?: number) => {
    if (!meters) return '0.00';
    return (meters / 1609.34).toFixed(2);
  };

  const metersToFeet = (meters?: number) => {
    if (!meters) return '0';
    return Math.round(meters * 3.28084).toString();
  };

  const formatPace = (pace?: number) => {
    if (!pace) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return '--:--:--';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.round((minutes % 1) * 60);
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getWaypoint = (waypointId?: string) => {
    if (!waypointId) return null;
    return waypoints.find((w) => w.id === waypointId);
  };

  const getWaypointName = (waypointId?: string) => {
    if (!waypointId) return 'Start';
    const waypoint = getWaypoint(waypointId);
    return waypoint?.name || `Waypoint ${waypoint?.order_index || ''}`;
  };

  const handleEdit = (waypointId: string) => {
    const waypoint = waypoints.find(w => w.id === waypointId);
    if (waypoint) {
      setEditingWaypoint(waypointId);
      setEditName(waypoint.name || '');
      setEditType(waypoint.waypoint_type);
      setEditStopTime(waypoint.stop_time_minutes || 0);
      setEditComments(waypoint.comments || '');
      setEditDistance(((waypoint.distance_from_start || 0) / 1609.34).toFixed(2));
    }
  };

  const handleSave = (waypointId: string) => {
    const waypoint = waypoints.find(w => w.id === waypointId);
    if (!waypoint) return;

    const updates: Partial<Waypoint> = {
      name: editName,
      waypoint_type: editType,
      stop_time_minutes: editStopTime,
      comments: editComments,
    };

    // Check if distance has changed
    const newDistanceMiles = parseFloat(editDistance);
    const currentDistanceMiles = (waypoint.distance_from_start || 0) / 1609.34;
    
    if (!isNaN(newDistanceMiles) && Math.abs(newDistanceMiles - currentDistanceMiles) > 0.01) {
      // Distance changed - need to recalculate coordinates
      const distanceMeters = newDistanceMiles * 1609.34;
      const totalDistance = routeData?.metadata?.total_distance_meters || 0;

      if (distanceMeters < 0) {
        alert('Distance cannot be negative');
        return;
      }

      if (distanceMeters > totalDistance) {
        alert(`Distance cannot exceed route length (${(totalDistance / 1609.34).toFixed(2)} mi)`);
        return;
      }

      const coords = findCoordinatesAtDistance(distanceMeters);
      if (coords) {
        updates.latitude = coords.lat;
        updates.longitude = coords.lon;
        updates.elevation = coords.elevation;
        updates.distance_from_start = distanceMeters;
      } else {
        alert('Could not find coordinates at this distance');
        return;
      }
    }

    onWaypointUpdate(waypointId, updates);
    setEditingWaypoint(null);
  };

  const handleCancel = () => {
    setEditingWaypoint(null);
    setEditName('');
    setEditType('checkpoint');
    setEditStopTime(0);
    setEditComments('');
    setEditDistance('');
  };

  const handleDelete = (waypointId: string, waypointName: string) => {
    if (waypointName === 'START' || waypointName === 'FINISH') {
      alert('Cannot delete START or FINISH waypoints');
      return;
    }
    if (confirm(`Delete waypoint "${waypointName}"? This will require recalculating.`)) {
      onWaypointDelete(waypointId);
    }
  };

  const toggleRow = (legId: string) => {
    setExpandedRow(expandedRow === legId ? null : legId);
  };

  const findCoordinatesAtDistance = (targetDistanceMeters: number): { lat: number; lon: number; elevation: number } | null => {
    if (!routeData?.route?.coordinates) return null;

    const coords = routeData.route.coordinates;
    let cumulativeDistance = 0;

    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];

      // Calculate distance between consecutive points (Haversine formula)
      const lat1 = prev[0] * Math.PI / 180;
      const lat2 = curr[0] * Math.PI / 180;
      const dLat = (curr[0] - prev[0]) * Math.PI / 180;
      const dLon = (curr[1] - prev[1]) * Math.PI / 180;

      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const segmentDistance = 6371000 * c; // meters

      if (cumulativeDistance + segmentDistance >= targetDistanceMeters) {
        // Interpolate position within this segment
        const remainingDistance = targetDistanceMeters - cumulativeDistance;
        const ratio = remainingDistance / segmentDistance;

        return {
          lat: prev[0] + (curr[0] - prev[0]) * ratio,
          lon: prev[1] + (curr[1] - prev[1]) * ratio,
          elevation: prev[2] + (curr[2] - prev[2]) * ratio,
        };
      }

      cumulativeDistance += segmentDistance;
    }

    // If distance exceeds route, return last point
    const last = coords[coords.length - 1];
    return { lat: last[0], lon: last[1], elevation: last[2] };
  };

  const handleAddWaypoint = () => {
    const distanceMiles = parseFloat(newWaypointData.distance);
    if (isNaN(distanceMiles) || distanceMiles < 0) {
      alert('Please enter a valid distance');
      return;
    }

    const distanceMeters = distanceMiles * 1609.34;
    const totalDistance = routeData?.metadata?.total_distance_meters || 0;

    if (distanceMeters > totalDistance) {
      alert(`Distance cannot exceed route length (${(totalDistance / 1609.34).toFixed(2)} mi)`);
      return;
    }

    const coords = findCoordinatesAtDistance(distanceMeters);
    if (!coords) {
      alert('Could not find coordinates at this distance');
      return;
    }

    // Find the appropriate order_index
    const existingWaypoints = [...waypoints].sort((a, b) => 
      (a.distance_from_start || 0) - (b.distance_from_start || 0)
    );
    let orderIndex = 1;
    for (const wp of existingWaypoints) {
      if ((wp.distance_from_start || 0) < distanceMeters) {
        orderIndex = (wp.order_index || 0) + 1;
      }
    }

    onWaypointCreate({
      name: newWaypointData.name || `Waypoint at ${distanceMiles.toFixed(1)} mi`,
      waypoint_type: newWaypointData.type,
      latitude: coords.lat,
      longitude: coords.lon,
      elevation: coords.elevation,
      distance_from_start: distanceMeters,
      order_index: orderIndex,
      stop_time_minutes: parseInt(newWaypointData.stopTime) || 0,
      comments: newWaypointData.comments || '',
    });

    // Reset form
    setNewWaypointData({
      distance: '',
      name: '',
      type: 'checkpoint',
      stopTime: '0',
      comments: '',
    });
    setShowAddWaypointModal(false);
  };

  if (legs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leg-by-Leg Breakdown</h2>
        <div className="text-center py-8 text-gray-500">
          No calculations yet. Add waypoints and click Calculate to see leg-by-leg breakdown.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Leg-by-Leg Breakdown</h2>
            <p className="text-xs text-gray-500 mt-1">Click on a row to edit stop time and notes</p>
          </div>
          {routeData && (
            <button
              onClick={() => setShowAddWaypointModal(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Waypoint by Distance
            </button>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Leg
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Waypoint
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Distance
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Elev +/- (ft)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Adj. Pace
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Leg Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Arrival
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stop
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exit
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cumulative
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {legs.map((leg, index) => {
              const waypoint = getWaypoint(leg.end_waypoint_id);
              const isExpanded = expandedRow === leg.id;
              const isEditing = editingWaypoint === leg.end_waypoint_id;
              const isSystemWaypoint = waypoint?.name === 'START' || waypoint?.name === 'FINISH';

              return (
                <>
                  <tr 
                    key={leg.id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isExpanded ? 'border-b-0' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleRow(leg.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {leg.leg_number}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {getWaypointName(leg.end_waypoint_id)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {metersToMiles(leg.leg_distance)} mi
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      <span className="text-green-600">+{metersToFeet(leg.elevation_gain)} ft</span>
                      {' / '}
                      <span className="text-red-600">-{metersToFeet(leg.elevation_loss)} ft</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatPace(leg.adjusted_pace)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatTime(leg.leg_distance && leg.adjusted_pace ? (leg.leg_distance / 1609.34) * leg.adjusted_pace : 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(leg.expected_arrival_time)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {leg.stop_time_minutes || 0} min
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(leg.exit_time)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {metersToMiles(leg.cumulative_distance)} mi
                      {' / '}
                      <span className="font-medium">{formatTime(leg.cumulative_time_minutes)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {!isSystemWaypoint && leg.end_waypoint_id && (
                        <div className="flex space-x-2">
                          {!isEditing ? (
                            <>
                              <button
                                onClick={() => handleEdit(leg.end_waypoint_id!)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(leg.end_waypoint_id!, waypoint?.name || '')}
                                className="text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleSave(leg.end_waypoint_id!)}
                                className="text-green-600 hover:text-green-800"
                                title="Save"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="text-gray-600 hover:text-gray-800"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  
                  {/* Expanded Row for Details/Editing */}
                  {isExpanded && (
                    <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td colSpan={12} className="px-4 py-4 border-t border-gray-100">
                        <div className="max-w-4xl">
                          {isEditing && leg.end_waypoint_id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Waypoint Name
                                    {isSystemWaypoint && <span className="text-xs text-gray-500 ml-2">(read-only)</span>}
                                  </label>
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    disabled={isSystemWaypoint}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                                    placeholder="e.g., Aid Station 3"
                                  />
                                  {isSystemWaypoint && (
                                    <p className="mt-1 text-xs text-gray-500">
                                      START and FINISH waypoints cannot be renamed
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Waypoint Type
                                  </label>
                                  <select
                                    value={editType}
                                    onChange={(e) => setEditType(e.target.value as 'checkpoint' | 'food' | 'water' | 'rest')}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 bg-white"
                                  >
                                    <option value="checkpoint">Checkpoint</option>
                                    <option value="food">Food</option>
                                    <option value="water">Water</option>
                                    <option value="rest">Rest</option>
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cumulative Distance (miles)
                                    {isSystemWaypoint && <span className="text-xs text-gray-500 ml-2">(read-only)</span>}
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max={routeData ? (routeData.metadata?.total_distance_meters || 0) / 1609.34 : undefined}
                                    value={editDistance}
                                    onChange={(e) => setEditDistance(e.target.value)}
                                    disabled={isSystemWaypoint}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                                  />
                                  {routeData && !isSystemWaypoint && (
                                    <p className="mt-1 text-xs text-gray-500">
                                      Max: {((routeData.metadata?.total_distance_meters || 0) / 1609.34).toFixed(2)} mi
                                    </p>
                                  )}
                                  {isSystemWaypoint && (
                                    <p className="mt-1 text-xs text-gray-500">
                                      START and FINISH waypoints cannot be moved
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Stop Time (minutes)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={editStopTime}
                                    onChange={(e) => setEditStopTime(parseInt(e.target.value) || 0)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 bg-white"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Notes / Comments
                                </label>
                                <textarea
                                  value={editComments}
                                  onChange={(e) => setEditComments(e.target.value)}
                                  rows={3}
                                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 bg-white"
                                  placeholder="Add notes about this waypoint..."
                                />
                              </div>
                              <div className="flex justify-end space-x-3">
                                <button
                                  onClick={handleCancel}
                                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSave(leg.end_waypoint_id!)}
                                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                                >
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 text-sm">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="font-medium text-gray-700">Waypoint:</span>{' '}
                                  <span className="text-gray-900">{waypoint?.name || 'Unknown'}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Type:</span>{' '}
                                  <span className="capitalize text-gray-900">{waypoint?.waypoint_type}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Distance:</span>{' '}
                                  <span className="text-gray-900">
                                    {metersToMiles(waypoint?.distance_from_start)} mi
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Elevation:</span>{' '}
                                  <span className="text-gray-900">
                                    {waypoint?.elevation ? `${Math.round(waypoint.elevation * 3.28084)} ft` : 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Stop Time:</span>{' '}
                                  <span className="text-gray-900">{waypoint?.stop_time_minutes || 0} minutes</span>
                                </div>
                              </div>
                              {waypoint?.comments && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <span className="font-medium text-gray-700">Notes:</span>
                                  <p className="mt-1 text-gray-600 italic">{waypoint.comments}</p>
                                </div>
                              )}
                              {!isSystemWaypoint && !waypoint?.comments && (
                                <div className="mt-3 pt-3 border-t border-gray-200 text-gray-500 italic">
                                  No notes added yet. Click edit to add notes.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Waypoint by Distance Modal */}
      {showAddWaypointModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowAddWaypointModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add Waypoint by Distance</h3>
                  <button
                    onClick={() => setShowAddWaypointModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Distance from Start (miles) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={routeData ? (routeData.metadata?.total_distance_meters || 0) / 1609.34 : undefined}
                      value={newWaypointData.distance}
                      onChange={(e) => setNewWaypointData({ ...newWaypointData, distance: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm text-gray-900 bg-white"
                      placeholder="e.g., 25.5"
                    />
                    {routeData && (
                      <p className="mt-1 text-xs text-gray-500">
                        Total route distance: {((routeData.metadata?.total_distance_meters || 0) / 1609.34).toFixed(2)} mi
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Waypoint Name
                    </label>
                    <input
                      type="text"
                      value={newWaypointData.name}
                      onChange={(e) => setNewWaypointData({ ...newWaypointData, name: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm text-gray-900 bg-white"
                      placeholder="e.g., Aid Station 3"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave blank for auto-generated name
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Waypoint Type
                    </label>
                    <select
                      value={newWaypointData.type}
                      onChange={(e) => setNewWaypointData({ ...newWaypointData, type: e.target.value as any })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm text-gray-900 bg-white"
                    >
                      <option value="checkpoint">Checkpoint / Aid Station</option>
                      <option value="food">Food Stop</option>
                      <option value="water">Water Stop</option>
                      <option value="rest">Rest / Crew Access</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stop Time (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newWaypointData.stopTime}
                      onChange={(e) => setNewWaypointData({ ...newWaypointData, stopTime: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm text-gray-900 bg-white"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes / Comments
                    </label>
                    <textarea
                      value={newWaypointData.comments}
                      onChange={(e) => setNewWaypointData({ ...newWaypointData, comments: e.target.value })}
                      rows={3}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm text-gray-900 bg-white"
                      placeholder="Optional notes about this waypoint..."
                    />
                  </div>
                </div>

                <div className="mt-5 sm:mt-6 flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddWaypointModal(false)}
                    className="flex-1 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddWaypoint}
                    className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm"
                  >
                    Add Waypoint
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
