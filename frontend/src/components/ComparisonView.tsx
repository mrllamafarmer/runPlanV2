import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Clock, MapPin } from 'lucide-react';
import { calculationsApi } from '../services/api';

interface ComparisonViewProps {
  eventId: string;
}

export default function ComparisonView({ eventId }: ComparisonViewProps) {
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComparison();
  }, [eventId]);

  const loadComparison = async () => {
    try {
      const response = await calculationsApi.getComparison(eventId);
      setComparison(response.data);
    } catch (error) {
      console.error('Error loading comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const metersToMiles = (meters: number) => (meters / 1609.34).toFixed(2);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">Loading comparison...</div>
      </div>
    );
  }

  if (!comparison || !comparison.actual_route) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Actual vs Planned Comparison
        </h2>
        <div className="text-center py-8 text-gray-500">
          <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>No actual race data uploaded yet.</p>
          <p className="text-sm mt-2">
            Upload your actual GPX/TCX file to see performance comparison.
          </p>
        </div>
      </div>
    );
  }

  const plannedDistance = comparison.comparison_summary.planned_distance;
  const actualDistance = comparison.comparison_summary.actual_distance;
  const distanceDiff = actualDistance - plannedDistance;
  const distanceDiffPercent = ((distanceDiff / plannedDistance) * 100).toFixed(1);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Actual vs Planned Comparison
        </h2>
      </div>

      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-900">
                  Planned Distance
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {metersToMiles(plannedDistance)} mi
                </div>
              </div>
              <MapPin className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-900">
                  Actual Distance
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {metersToMiles(actualDistance)} mi
                </div>
              </div>
              <MapPin className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div
            className={`${
              distanceDiff > 0 ? 'bg-orange-50' : 'bg-emerald-50'
            } rounded-lg p-4`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div
                  className={`text-sm font-medium ${
                    distanceDiff > 0 ? 'text-orange-900' : 'text-emerald-900'
                  }`}
                >
                  Difference
                </div>
                <div
                  className={`text-2xl font-bold ${
                    distanceDiff > 0 ? 'text-orange-600' : 'text-emerald-600'
                  }`}
                >
                  {distanceDiff > 0 ? '+' : ''}
                  {metersToMiles(distanceDiff)} mi
                </div>
                <div className="text-xs text-gray-600">
                  {distanceDiff > 0 ? '+' : ''}
                  {distanceDiffPercent}%
                </div>
              </div>
              {distanceDiff > 0 ? (
                <TrendingUp className="h-8 w-8 text-orange-400" />
              ) : (
                <TrendingDown className="h-8 w-8 text-emerald-400" />
              )}
            </div>
          </div>
        </div>

        {/* Map Comparison */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Route Comparison
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">
              Map overlay comparison will be displayed here showing planned
              route (blue) vs actual route (red)
            </p>
          </div>
        </div>

        {/* Leg Comparison Table */}
        {comparison.planned_legs && comparison.planned_legs.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Leg-by-Leg Comparison
            </h3>
            <div className="text-sm text-gray-600">
              Detailed leg comparison coming soon...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

