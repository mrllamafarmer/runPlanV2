import { useState } from 'react';
import { X } from 'lucide-react';
import { eventsApi } from '../services/api';

interface CreateEventModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateEventModal({ onClose, onCreated }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    planned_date: '',
    target_duration: '',
    elevation_gain_adjustment_percent: '0',
    elevation_descent_adjustment_percent: '0',
    fatigue_slowdown_percent: '0',
  });

  const [loading, setLoading] = useState(false);
  const [durationError, setDurationError] = useState('');

  // Convert HH:MM:SS to minutes
  const timeToMinutes = (timeString: string): number | undefined => {
    if (!timeString) return undefined;
    
    const parts = timeString.split(':');
    if (parts.length !== 3) {
      setDurationError('Format must be HH:MM:SS (e.g., 24:00:00 for 24 hours)');
      return undefined;
    }

    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseInt(parts[2]);

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      setDurationError('Invalid time format');
      return undefined;
    }

    if (minutes >= 60 || seconds >= 60) {
      setDurationError('Minutes and seconds must be less than 60');
      return undefined;
    }

    setDurationError('');
    return hours * 60 + minutes + Math.round(seconds / 60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const targetMinutes = timeToMinutes(formData.target_duration);
      
      if (formData.target_duration && targetMinutes === undefined) {
        setLoading(false);
        return;
      }

      const data = {
        name: formData.name,
        planned_date: new Date(formData.planned_date).toISOString(),
        target_duration_minutes: targetMinutes,
        elevation_gain_adjustment_percent: parseFloat(formData.elevation_gain_adjustment_percent),
        elevation_descent_adjustment_percent: parseFloat(
          formData.elevation_descent_adjustment_percent
        ),
        fatigue_slowdown_percent: parseFloat(formData.fatigue_slowdown_percent),
      };

      await eventsApi.create(data);
      onCreated();
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error creating event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Create New Event</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Event Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 bg-white"
              placeholder="Western States 100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Planned Date *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.planned_date}
              onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 bg-white"
            />
            <p className="mt-1 text-xs text-gray-500">
              Distance will be calculated automatically when you upload a GPX file
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Target Duration (HH:MM:SS)
            </label>
            <input
              type="text"
              value={formData.target_duration}
              onChange={(e) => {
                setFormData({ ...formData, target_duration: e.target.value });
                setDurationError('');
              }}
              className={`mt-1 block w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 bg-white ${
                durationError ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="24:00:00 (24 hours)"
              pattern="[0-9]{1,3}:[0-5][0-9]:[0-5][0-9]"
            />
            {durationError && (
              <p className="mt-1 text-sm text-red-600">{durationError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Format: HH:MM:SS (e.g., 30:00:00 for 30 hours, 24:30:00 for 24.5 hours)
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

