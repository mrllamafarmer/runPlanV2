import { useState } from 'react';
import type { Event } from '../types';

interface PaceAdjustmentsProps {
  event: Event;
  onUpdate: (updates: Partial<Event>) => void;
}

export default function PaceAdjustments({ event, onUpdate }: PaceAdjustmentsProps) {
  const [elevGain, setElevGain] = useState(event.elevation_gain_adjustment_percent);
  const [elevLoss, setElevLoss] = useState(event.elevation_descent_adjustment_percent);
  const [fatigue, setFatigue] = useState(event.fatigue_slowdown_percent);

  const handleApply = () => {
    onUpdate({
      elevation_gain_adjustment_percent: elevGain,
      elevation_descent_adjustment_percent: elevLoss,
      fatigue_slowdown_percent: fatigue,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Pace Adjustments</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Elevation Gain Adjustment (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={elevGain}
            onChange={(e) => setElevGain(parseFloat(e.target.value) || 0)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-3 py-2 text-gray-900 bg-white"
          />
          <p className="mt-1 text-xs text-gray-500">
            Slow down by this % per meter of elevation gain
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Elevation Descent Adjustment (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={elevLoss}
            onChange={(e) => setElevLoss(parseFloat(e.target.value) || 0)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-3 py-2 text-gray-900 bg-white"
          />
          <p className="mt-1 text-xs text-gray-500">
            Speed up by this % per meter of elevation loss (usually negative)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fatigue Slowdown (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={fatigue}
            onChange={(e) => setFatigue(parseFloat(e.target.value) || 0)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-3 py-2 text-gray-900 bg-white"
          />
          <p className="mt-1 text-xs text-gray-500">
            Linear slowdown from start to finish
          </p>
        </div>

        <button
          onClick={handleApply}
          className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Apply Adjustments
        </button>
      </div>
    </div>
  );
}

