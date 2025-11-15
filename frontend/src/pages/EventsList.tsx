import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, MapPin, Trash2, Edit, Copy, X } from 'lucide-react';
import { eventsApi } from '../services/api';
import type { Event } from '../types';
import CreateEventModal from '../components/CreateEventModal';

export default function EventsList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await eventsApi.list();
      setEvents(response.data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsApi.delete(id);
        loadEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  const handleDuplicate = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation
    try {
      await eventsApi.duplicate(id);
      loadEvents();
      alert('Event duplicated successfully!');
    } catch (error) {
      console.error('Error duplicating event:', error);
      alert('Error duplicating event');
    }
  };

  const handleStartEdit = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    setEditingId(event.id);
    setEditingName(event.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) {
      alert('Event name cannot be empty');
      return;
    }

    try {
      const response = await eventsApi.update(id, { name: editingName });
      
      // Immediately update local state with the response
      setEvents(events.map(e => e.id === id ? response.data : e));
      
      // Clear edit mode
      setEditingId(null);
      setEditingName('');
    } catch (error) {
      console.error('Error updating event name:', error);
      alert('Error updating event name');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return 'N/A';
    const miles = meters / 1609.34;
    return `${miles.toFixed(2)} miles`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="mt-2 text-gray-600">Plan and analyze your ultra running events</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Event
        </button>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No events</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new event.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Event
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  {editingId === event.id ? (
                    <div className="flex-1 flex items-center space-x-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(event.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="flex-1 text-lg font-medium text-gray-900 border border-primary-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(event.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Save"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-gray-600 hover:text-gray-900"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium text-gray-900 truncate flex-1">
                        {event.name}
                      </h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => handleStartEdit(event, e)}
                          className="text-gray-600 hover:text-primary-600"
                          title="Edit name"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleDuplicate(event.id, e)}
                          className="text-gray-600 hover:text-primary-600"
                          title="Duplicate event"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete event"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(event.planned_date)}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {event.distance ? `${event.distance.toFixed(2)} miles` : 'No route'}
                  </div>
                  {event.target_duration_minutes && (
                    <div className="text-gray-500">
                      Target: {Math.floor(event.target_duration_minutes / 60)}h{' '}
                      {event.target_duration_minutes % 60}m
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <Link
                    to={`/dashboard/${event.id}`}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Open Dashboard
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreated={loadEvents}
        />
      )}
    </div>
  );
}

