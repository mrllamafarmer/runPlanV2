import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Clock, MapPin, Zap, Mountain, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions } from 'chart.js';
import { calculationsApi } from '../services/api';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ComparisonViewProps {
  eventId: string;
  onRequestAIAnalysis?: (comparisonData: any) => void;
}

interface LegComparison {
  leg_number: number;
  waypoint_name: string;
  planned_leg_time_minutes: number;
  estimated_actual_leg_time_minutes: number;
  leg_time_diff_minutes: number;
  cumulative_planned_time_minutes: number;
  cumulative_actual_time_minutes: number;
  cumulative_time_diff_minutes: number;
  planned_pace: string;
  distance_miles: number;
  cumulative_distance_miles: number;
}

export default function ComparisonView({ eventId, onRequestAIAnalysis }: ComparisonViewProps) {
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLegs, setExpandedLegs] = useState(true);

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
  const metersToFeet = (meters: number) => (meters * 3.28084).toFixed(0);
  const minutesToHHMMSS = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes % 1) * 60);
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAIAnalysis = () => {
    if (onRequestAIAnalysis && comparison) {
      const summary = comparison.comparison_summary;
      const legComps = comparison.leg_comparisons || [];
      
      const analysisPrompt = `Please analyze this race performance comparison:

**Overall Performance:**
- Planned Time: ${summary.planned_duration_minutes ? minutesToHHMMSS(summary.planned_duration_minutes) : 'N/A'}
- Actual Time: ${summary.actual_duration_minutes ? minutesToHHMMSS(summary.actual_duration_minutes) : 'N/A'}
- Time Difference: ${summary.time_diff_minutes ? (summary.time_diff_minutes > 0 ? '+' : '') + minutesToHHMMSS(Math.abs(summary.time_diff_minutes)) : 'N/A'}
- Planned Distance: ${metersToMiles(summary.planned_distance_meters)} miles
- Actual Distance: ${metersToMiles(summary.actual_distance_meters)} miles
- Planned Avg Pace: ${summary.planned_avg_pace ? summary.planned_avg_pace.toFixed(2) : 'N/A'} min/mile
- Actual Avg Pace: ${summary.actual_avg_pace ? summary.actual_avg_pace.toFixed(2) : 'N/A'} min/mile

**Leg-by-Leg Breakdown:**
${legComps.map((leg: LegComparison) => 
  `Leg ${leg.leg_number} (${leg.waypoint_name}):
  - Distance: ${leg.distance_miles} mi
  - Planned Time: ${minutesToHHMMSS(leg.planned_leg_time_minutes)}
  - Actual Time: ${minutesToHHMMSS(leg.estimated_actual_leg_time_minutes)}
  - Difference: ${leg.leg_time_diff_minutes > 0 ? '+' : ''}${minutesToHHMMSS(Math.abs(leg.leg_time_diff_minutes))}
  - Cumulative Difference: ${leg.cumulative_time_diff_minutes > 0 ? '+' : ''}${minutesToHHMMSS(Math.abs(leg.cumulative_time_diff_minutes))}`
).join('\n\n')}

Please provide:
1. Overall performance assessment
2. Key insights about pacing strategy
3. Specific leg analysis (where did I lose/gain time?)
4. Recommendations for future races
5. Notable strengths and areas for improvement`;

      onRequestAIAnalysis(analysisPrompt);
    }
  };

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

  const summary = comparison.comparison_summary;
  const legComparisons: LegComparison[] = comparison.leg_comparisons || [];
  const hasTimingData = summary.has_actual_timestamps && summary.actual_duration_minutes;

  // Prepare chart data
  const cumulativeChartData = {
    labels: legComparisons.map((leg) => leg.waypoint_name),
    datasets: [
      {
        label: 'Planned Time',
        data: legComparisons.map((leg) => leg.cumulative_planned_time_minutes),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Actual Time',
        data: legComparisons.map((leg) => leg.cumulative_actual_time_minutes),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
      },
    ],
  };

  const differenceChartData = {
    labels: legComparisons.map((leg) => leg.waypoint_name),
    datasets: [
      {
        label: 'Cumulative Time Difference (minutes)',
        data: legComparisons.map((leg) => leg.cumulative_time_diff_minutes),
        borderColor: legComparisons.map((leg) => 
          leg.cumulative_time_diff_minutes > 0 ? 'rgb(239, 68, 68)' : 'rgb(34, 197, 94)'
        ),
        backgroundColor: legComparisons.map((leg) => 
          leg.cumulative_time_diff_minutes > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'
        ),
        borderWidth: 2,
        tension: 0.3,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${minutesToHHMMSS(value)}`;
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => minutesToHHMMSS(Number(value)),
        },
      },
    },
  };

  const diffChartOptions: ChartOptions<'line'> = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `${value > 0 ? 'Behind' : 'Ahead'} by ${minutesToHHMMSS(Math.abs(value))}`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Actual vs Planned Comparison
        </h2>
        {hasTimingData && onRequestAIAnalysis && (
          <button
            onClick={handleAIAnalysis}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <Brain className="h-4 w-4 mr-2" />
            AI Performance Analysis
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Distance */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-blue-900">Distance</div>
              <MapPin className="h-5 w-5 text-blue-400" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-blue-700">Planned:</span>
                <span className="font-semibold text-blue-900">{metersToMiles(summary.planned_distance_meters)} mi</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-blue-700">Actual:</span>
                <span className="font-semibold text-blue-900">{metersToMiles(summary.actual_distance_meters)} mi</span>
              </div>
              <div className={`flex justify-between text-xs font-bold ${
                summary.distance_diff_meters > 0 ? 'text-orange-600' : 'text-emerald-600'
              }`}>
                <span>Diff:</span>
                <span>
                  {summary.distance_diff_meters > 0 ? '+' : ''}
                  {metersToMiles(summary.distance_diff_meters)} mi
                  ({summary.distance_diff_percent > 0 ? '+' : ''}{summary.distance_diff_percent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Time */}
          {hasTimingData && (
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-green-900">Time</div>
                <Clock className="h-5 w-5 text-green-400" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-green-700">Planned:</span>
                  <span className="font-semibold text-green-900">{minutesToHHMMSS(summary.planned_duration_minutes)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-green-700">Actual:</span>
                  <span className="font-semibold text-green-900">{minutesToHHMMSS(summary.actual_duration_minutes)}</span>
                </div>
                {summary.time_diff_minutes !== null && (
                  <div className={`flex justify-between text-xs font-bold ${
                    summary.time_diff_minutes > 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}>
                    <span>Diff:</span>
                    <span>
                      {summary.time_diff_minutes > 0 ? '+' : ''}
                      {minutesToHHMMSS(Math.abs(summary.time_diff_minutes))}
                      ({summary.time_diff_percent > 0 ? '+' : ''}{summary.time_diff_percent}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pace */}
          {hasTimingData && summary.planned_avg_pace && summary.actual_avg_pace && (
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-purple-900">Avg Pace</div>
                <Zap className="h-5 w-5 text-purple-400" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-purple-700">Planned:</span>
                  <span className="font-semibold text-purple-900">{summary.planned_avg_pace.toFixed(2)} min/mi</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-purple-700">Actual:</span>
                  <span className="font-semibold text-purple-900">{summary.actual_avg_pace.toFixed(2)} min/mi</span>
                </div>
                <div className={`flex justify-between text-xs font-bold ${
                  summary.actual_avg_pace > summary.planned_avg_pace ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  <span>Diff:</span>
                  <span>
                    {summary.actual_avg_pace > summary.planned_avg_pace ? '+' : ''}
                    {(summary.actual_avg_pace - summary.planned_avg_pace).toFixed(2)} min/mi
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Elevation */}
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-amber-900">Elevation Gain</div>
              <Mountain className="h-5 w-5 text-amber-400" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-amber-700">Planned:</span>
                <span className="font-semibold text-amber-900">{metersToFeet(summary.planned_elevation_gain_meters)} ft</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-amber-700">Actual:</span>
                <span className="font-semibold text-amber-900">{metersToFeet(summary.actual_elevation_gain_meters)} ft</span>
              </div>
              <div className={`flex justify-between text-xs font-bold ${
                summary.elevation_diff_meters > 0 ? 'text-orange-600' : 'text-emerald-600'
              }`}>
                <span>Diff:</span>
                <span>
                  {summary.elevation_diff_meters > 0 ? '+' : ''}
                  {metersToFeet(summary.elevation_diff_meters)} ft
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        {hasTimingData && legComparisons.length > 0 && (
          <div className="space-y-6">
            {/* Cumulative Time Chart */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Cumulative Time Progression</h3>
              <div style={{ height: '300px' }}>
                <Line data={cumulativeChartData} options={chartOptions} />
              </div>
            </div>

            {/* Time Difference Chart */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                Time Difference by Waypoint (Positive = Behind Schedule)
              </h3>
              <div style={{ height: '300px' }}>
                <Line data={differenceChartData} options={diffChartOptions} />
              </div>
            </div>
          </div>
        )}

        {/* Leg Comparison Table */}
        {hasTimingData && legComparisons.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedLegs(!expandedLegs)}
              className="w-full px-4 py-3 bg-gray-50 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <h3 className="text-sm font-medium text-gray-900">
                Leg-by-Leg Comparison ({legComparisons.length} legs)
              </h3>
              {expandedLegs ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {expandedLegs && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Leg
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Waypoint
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Distance
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Planned Time
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actual Time
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Leg Diff
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cumulative Diff
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {legComparisons.map((leg) => (
                      <tr key={leg.leg_number} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {leg.leg_number}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {leg.waypoint_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                          {leg.distance_miles} mi
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-blue-600">
                          {minutesToHHMMSS(leg.planned_leg_time_minutes)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600">
                          {minutesToHHMMSS(leg.estimated_actual_leg_time_minutes)}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${
                          leg.leg_time_diff_minutes > 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {leg.leg_time_diff_minutes > 0 ? '+' : ''}
                          {minutesToHHMMSS(Math.abs(leg.leg_time_diff_minutes))}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-bold ${
                          leg.cumulative_time_diff_minutes > 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {leg.cumulative_time_diff_minutes > 0 ? '+' : ''}
                          {minutesToHHMMSS(Math.abs(leg.cumulative_time_diff_minutes))}
                          {leg.cumulative_time_diff_minutes > 0 ? (
                            <TrendingDown className="inline-block h-4 w-4 ml-1" />
                          ) : (
                            <TrendingUp className="inline-block h-4 w-4 ml-1" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* No timing data message */}
        {!hasTimingData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <Clock className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Limited Comparison Available</p>
                <p>
                  The actual GPX file doesn't contain timestamp data. Only distance and elevation comparison is available.
                  Upload a GPX file with timestamps for full performance analysis.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
