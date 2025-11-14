import type { CalculatedLeg, Waypoint, Event } from '../types';

export const exportToCSV = (
  legs: CalculatedLeg[],
  waypoints: Waypoint[],
  event: Event
) => {
  const metersToMiles = (meters?: number) => {
    if (!meters) return '0.00';
    return (meters / 1609.34).toFixed(2);
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
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getWaypointName = (waypointId?: string) => {
    if (!waypointId) return 'Start';
    const waypoint = waypoints.find((w) => w.id === waypointId);
    return waypoint?.name || `Waypoint ${waypoint?.order_index || ''}`;
  };

  // CSV Header
  const headers = [
    'Leg',
    'Waypoint',
    'Distance (mi)',
    'Elevation Gain (m)',
    'Elevation Loss (m)',
    'Base Pace',
    'Adjusted Pace',
    'Leg Time',
    'Arrival Time',
    'Stop Time (min)',
    'Exit Time',
    'Cumulative Distance (mi)',
    'Cumulative Time',
  ];

  // CSV Rows
  const rows = legs.map((leg) => [
    leg.leg_number,
    getWaypointName(leg.end_waypoint_id),
    metersToMiles(leg.leg_distance),
    leg.elevation_gain?.toFixed(0) || '0',
    leg.elevation_loss?.toFixed(0) || '0',
    formatPace(leg.base_pace),
    formatPace(leg.adjusted_pace),
    formatTime(
      leg.leg_distance && leg.adjusted_pace
        ? (leg.leg_distance / 1609.34) * leg.adjusted_pace
        : 0
    ),
    formatDateTime(leg.expected_arrival_time),
    leg.stop_time_minutes || 0,
    formatDateTime(leg.exit_time),
    metersToMiles(leg.cumulative_distance),
    formatTime(leg.cumulative_time_minutes),
  ]);

  // Create CSV content
  const csvContent = [
    `Event: ${event.name}`,
    `Date: ${new Date(event.planned_date).toLocaleDateString()}`,
    `Target Duration: ${Math.floor((event.target_duration_minutes || 0) / 60)}h ${
      (event.target_duration_minutes || 0) % 60
    }m`,
    '',
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${event.name.replace(/\s+/g, '_')}_plan.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printPlan = () => {
  window.print();
};

export const exportToPDF = async (
  legs: CalculatedLeg[],
  waypoints: Waypoint[],
  event: Event
) => {
  // For now, use browser's print to PDF functionality
  // In the future, could use jsPDF or similar library
  alert(
    'Use your browser\'s Print function and select "Save as PDF" to export to PDF.\n\nPress Ctrl/Cmd+P or use the Print button.'
  );
  window.print();
};

