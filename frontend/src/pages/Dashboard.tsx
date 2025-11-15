import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, Download, Play, FileText, Printer, ArrowLeft } from 'lucide-react';
import { eventsApi, waypointsApi, calculationsApi } from '../services/api';
import type { Event, Waypoint, CalculatedLeg, RouteData } from '../types';
import MapView from '../components/MapView';
import LegsTable from '../components/LegsTable';
import EventSummary from '../components/EventSummary';
import PaceAdjustments from '../components/PaceAdjustments';
import ChatAssistant from '../components/ChatAssistant';
import ComparisonView from '../components/ComparisonView';
import ElevationProfile from '../components/ElevationProfile';
import PrintView from '../components/PrintView';
import TimestampPromptModal from '../components/TimestampPromptModal';
import { exportToCSV } from '../utils/exportUtils';

export default function Dashboard() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [legs, setLegs] = useState<CalculatedLeg[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [needsRecalculation, setNeedsRecalculation] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showTimestampPrompt, setShowTimestampPrompt] = useState(false);
  const [timestampData, setTimestampData] = useState<{
    durationMinutes: number;
    firstTimestamp: string;
    lastTimestamp: string;
  } | null>(null);
  const [aiAnalysisMessage, setAiAnalysisMessage] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      const [eventRes, waypointsRes] = await Promise.all([
        eventsApi.get(eventId),
        eventsApi.getWaypoints(eventId),
      ]);

      setEvent(eventRes.data);
      setWaypoints(waypointsRes.data);

      // Try to load route data
      try {
        const routeRes = await eventsApi.getRoute(eventId);
        setRouteData(routeRes.data);
      } catch (err) {
        console.log('No route data available');
      }

      // Try to load calculated legs
      try {
        const legsRes = await calculationsApi.getLegs(eventId);
        setLegs(legsRes.data);
      } catch (err) {
        console.log('No calculated legs available');
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGPXUpload = async (file: File) => {
    if (!eventId) return;
    
    try {
      const response = await eventsApi.uploadGPX(eventId, file);
      await loadEventData();
      
      // Check if the GPX file has timestamps
      if (response.data.metadata?.has_timestamps && 
          response.data.metadata?.timestamp_duration_minutes) {
        setTimestampData({
          durationMinutes: response.data.metadata.timestamp_duration_minutes,
          firstTimestamp: response.data.metadata.first_timestamp,
          lastTimestamp: response.data.metadata.last_timestamp,
        });
        setShowTimestampPrompt(true);
      } else {
        alert(response.data.message || 'GPX file uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading GPX:', error);
      alert('Error uploading GPX file');
    }
  };

  const handleActualUpload = async (file: File) => {
    if (!eventId) return;
    
    try {
      const response = await eventsApi.uploadActual(eventId, file);
      await loadEventData();
      setShowComparison(true);
      
      // Display message about timestamps if present
      alert(response.data.message || 'Actual race data uploaded successfully!');
    } catch (error) {
      console.error('Error uploading actual data:', error);
      alert('Error uploading actual race data');
    }
  };

  const handleExportCSV = () => {
    if (event) {
      exportToCSV(legs, waypoints, event);
    }
  };

  const handlePrint = () => {
    setShowPrintView(true);
  };

  const handleAcceptTimestamps = async () => {
    if (!eventId || !timestampData) return;
    
    try {
      // Update event with the duration from timestamps
      await eventsApi.update(eventId, {
        target_duration_minutes: Math.round(timestampData.durationMinutes),
      });
      
      setShowTimestampPrompt(false);
      setTimestampData(null);
      await loadEventData();
      setNeedsRecalculation(true);
      
      alert('Target duration set from GPX timestamps! You can now adjust paces and waypoints.');
    } catch (error) {
      console.error('Error updating event duration:', error);
      alert('Error setting target duration');
    }
  };

  const handleDeclineTimestamps = () => {
    setShowTimestampPrompt(false);
    setTimestampData(null);
    alert('GPX file uploaded successfully! You can set your own target duration in the event settings.');
  };

  const handleRequestAIAnalysis = (analysisPrompt: string) => {
    setAiAnalysisMessage(analysisPrompt);
    // Scroll to chat after a short delay
    setTimeout(() => {
      chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleAIMessageSent = () => {
    // Clear the auto-send message after it's been sent
    setAiAnalysisMessage(null);
  };

  const handleWaypointCreate = async (waypoint: Partial<Waypoint>) => {
    if (!eventId) return;
    
    try {
      await waypointsApi.create({ ...waypoint, event_id: eventId });
      await loadEventData();
      setNeedsRecalculation(true);
    } catch (error) {
      console.error('Error creating waypoint:', error);
    }
  };

  const handleWaypointUpdate = async (id: string, updates: Partial<Waypoint>) => {
    try {
      await waypointsApi.update(id, updates);
      await loadEventData();
      // Mark that recalculation is needed
      setNeedsRecalculation(true);
    } catch (error) {
      console.error('Error updating waypoint:', error);
    }
  };

  const handleWaypointDelete = async (id: string) => {
    try {
      await waypointsApi.delete(id);
      await loadEventData();
      setNeedsRecalculation(true);
    } catch (error) {
      console.error('Error deleting waypoint:', error);
    }
  };

  const handleCalculate = async () => {
    if (!eventId) return;
    
    setCalculating(true);
    try {
      await calculationsApi.calculate(eventId);
      await loadEventData();
      setNeedsRecalculation(false);
      alert('Calculations completed!');
    } catch (error) {
      console.error('Error calculating:', error);
      alert('Error performing calculations');
    } finally {
      setCalculating(false);
    }
  };

  const handleEventUpdate = async (updates: Partial<Event>) => {
    if (!eventId || !event) return;
    
    try {
      await eventsApi.update(eventId, updates);
      setEvent({ ...event, ...updates });
      
      // If target duration was changed, trigger recalculation indicator
      if (updates.target_duration_minutes !== undefined) {
        setNeedsRecalculation(true);
      }
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Event not found</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/events')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              title="Back to Events"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
              <p className="text-sm text-gray-600">
                {new Date(event.planned_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Upload GPX
              <input
                type="file"
                accept=".gpx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleGPXUpload(file);
                }}
              />
            </label>
            <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Upload Actual
              <input
                type="file"
                accept=".gpx,.tcx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleActualUpload(file);
                }}
              />
            </label>
            {legs.length > 0 && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </button>
              </>
            )}
            <button
              onClick={handleCalculate}
              disabled={calculating || waypoints.length === 0}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                needsRecalculation 
                  ? 'bg-orange-600 hover:bg-orange-700 animate-pulse' 
                  : 'bg-primary-600 hover:bg-primary-700'
              } disabled:bg-gray-400`}
            >
              <Play className="h-4 w-4 mr-2" />
              {calculating ? 'Calculating...' : needsRecalculation ? 'Recalculate Now!' : 'Calculate'}
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="flex-1 overflow-auto p-6">
        {/* Recalculation Notice */}
        {needsRecalculation && (
          <div className="mb-6 bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-700">
                  <strong>Changes Detected:</strong> You've updated waypoint information. Click the <strong>"Recalculate Now!"</strong> button above to update arrival times, exit times, and cumulative totals.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map & Elevation - Large tiles */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '500px' }}>
              <MapView
                routeData={routeData}
                waypoints={waypoints}
                onWaypointCreate={handleWaypointCreate}
                onWaypointUpdate={handleWaypointUpdate}
                onWaypointDelete={handleWaypointDelete}
              />
            </div>
            <ElevationProfile routeData={routeData} waypoints={waypoints} />
          </div>

          {/* Event Summary & Adjustments */}
          <div className="space-y-6">
            <EventSummary event={event} routeData={routeData} onUpdate={handleEventUpdate} />
            <PaceAdjustments event={event} onUpdate={handleEventUpdate} />
          </div>

          {/* Legs Table */}
          <div className="lg:col-span-3">
            <LegsTable 
              legs={legs} 
              waypoints={waypoints}
              routeData={routeData}
              onWaypointUpdate={handleWaypointUpdate}
              onWaypointDelete={handleWaypointDelete}
              onWaypointCreate={handleWaypointCreate}
            />
          </div>

          {/* Comparison View */}
          {showComparison && (
            <div className="lg:col-span-3">
              <ComparisonView 
                eventId={eventId!} 
                onRequestAIAnalysis={handleRequestAIAnalysis}
              />
            </div>
          )}

          {/* Chat Assistant */}
          <div ref={chatRef} className="lg:col-span-3">
            <ChatAssistant 
              eventId={eventId} 
              autoSendMessage={aiAnalysisMessage || undefined}
              onMessageSent={handleAIMessageSent}
            />
          </div>
        </div>
      </div>

      {/* Print View Modal */}
      {showPrintView && event && (
        <PrintView
          event={event}
          routeData={routeData}
          waypoints={waypoints}
          legs={legs}
          onClose={() => setShowPrintView(false)}
        />
      )}

      {/* Timestamp Prompt Modal */}
      {showTimestampPrompt && timestampData && (
        <TimestampPromptModal
          durationMinutes={timestampData.durationMinutes}
          firstTimestamp={timestampData.firstTimestamp}
          lastTimestamp={timestampData.lastTimestamp}
          onAccept={handleAcceptTimestamps}
          onDecline={handleDeclineTimestamps}
          onClose={handleDeclineTimestamps}
        />
      )}
    </div>
  );
}

