import axios from 'axios';
import type { Event, Waypoint, CalculatedLeg, RouteData, Settings, Document, ChatMessage, ChatResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Events
export const eventsApi = {
  list: () => api.get<Event[]>('/api/events'),
  get: (id: string) => api.get<Event>(`/api/events/${id}`),
  create: (data: Partial<Event>) => api.post<Event>('/api/events', data),
  update: (id: string, data: Partial<Event>) => api.put<Event>(`/api/events/${id}`, data),
  delete: (id: string) => api.delete(`/api/events/${id}`),
  uploadGPX: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/events/${id}/upload-gpx`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadActual: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/events/${id}/upload-actual`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getRoute: (id: string) => api.get<RouteData>(`/api/events/${id}/route`),
  getWaypoints: (id: string) => api.get<Waypoint[]>(`/api/events/${id}/waypoints`),
};

// Waypoints
export const waypointsApi = {
  create: (data: Partial<Waypoint>) => api.post<Waypoint>('/api/waypoints', data),
  get: (id: string) => api.get<Waypoint>(`/api/waypoints/${id}`),
  update: (id: string, data: Partial<Waypoint>) => api.put<Waypoint>(`/api/waypoints/${id}`, data),
  delete: (id: string) => api.delete(`/api/waypoints/${id}`),
};

// Calculations
export const calculationsApi = {
  calculate: (eventId: string) => api.post(`/api/calculations/events/${eventId}/calculate`),
  getLegs: (eventId: string) => api.get<CalculatedLeg[]>(`/api/calculations/events/${eventId}/legs`),
  getComparison: (eventId: string) => api.get(`/api/calculations/events/${eventId}/comparison`),
};

// Documents
export const documentsApi = {
  list: () => api.get<Document[]>('/api/documents'),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Document>('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  get: (id: string) => api.get<Document>(`/api/documents/${id}`),
  delete: (id: string) => api.delete(`/api/documents/${id}`),
};

// Settings
export const settingsApi = {
  get: () => api.get<Settings>('/api/settings'),
  update: (data: Partial<Settings>) => api.put<Settings>('/api/settings', data),
};

// Chat
export const chatApi = {
  send: (message: ChatMessage) => api.post<ChatResponse>('/api/chat', message),
  getHistory: () => api.get('/api/chat/history'),
};

export default api;

