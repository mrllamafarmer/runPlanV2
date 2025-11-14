export interface Event {
  id: string;
  name: string;
  planned_date: string;
  distance?: number;
  target_duration_minutes?: number;
  elevation_gain_adjustment_percent: number;
  elevation_descent_adjustment_percent: number;
  fatigue_slowdown_percent: number;
  gpx_metadata?: GPXMetadata;
  created_at: string;
  updated_at?: string;
}

export interface GPXMetadata {
  total_distance_meters: number;
  elevation_gain_meters: number;
  elevation_loss_meters: number;
  min_elevation: number;
  max_elevation: number;
  bounding_box: [[number, number], [number, number]];
  original_points: number;
  simplified_points: number;
}

export interface Waypoint {
  id: string;
  event_id: string;
  name?: string;
  waypoint_type: 'checkpoint' | 'food' | 'water' | 'rest';
  latitude: number;
  longitude: number;
  elevation?: number;
  stop_time_minutes: number;
  comments?: string;
  order_index?: number;
  distance_from_start?: number;
  created_at: string;
}

export interface CalculatedLeg {
  id: string;
  event_id: string;
  leg_number: number;
  start_waypoint_id?: string;
  end_waypoint_id?: string;
  leg_distance?: number;
  elevation_gain?: number;
  elevation_loss?: number;
  base_pace?: number;
  adjusted_pace?: number;
  expected_arrival_time?: string;
  stop_time_minutes?: number;
  exit_time?: string;
  cumulative_distance?: number;
  cumulative_time_minutes?: number;
  created_at: string;
}

export interface RouteData {
  route: {
    coordinates: [number, number, number][];
  };
  metadata: GPXMetadata;
}

export interface Settings {
  id: string;
  distance_unit: 'miles' | 'kilometers';
  pace_format: string;
  elevation_unit: 'meters' | 'feet';
  openai_api_key?: string;
  openrouter_api_key?: string;
  style_preferences?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface Document {
  id: string;
  filename: string;
  file_type: string;
  summary?: string;
  uploaded_at: string;
}

export interface ChatMessage {
  message: string;
  event_id?: string;
}

export interface ChatResponse {
  response: string;
  sources?: any[];
}

