import { useState, useEffect } from 'react';
import { Save, Upload, FileText } from 'lucide-react';
import { settingsApi, documentsApi } from '../services/api';
import type { Settings, Document } from '../types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    loadDocuments();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsApi.get();
      setSettings(response.data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await documentsApi.list();
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      // Don't send masked API key back to server
      const settingsToUpdate = { ...settings };
      if (settingsToUpdate.openai_api_key?.startsWith('***')) {
        delete settingsToUpdate.openai_api_key;
      }
      
      await settingsApi.update(settingsToUpdate);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (file: File) => {
    try {
      await documentsApi.upload(file);
      await loadDocuments();
      alert('Document uploaded successfully!');
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error uploading document');
    }
  };

  const handleDocumentDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await documentsApi.delete(id);
        await loadDocuments();
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Error loading settings</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Configure your preferences and API keys</p>
      </div>

      <div className="space-y-6">
        {/* Units Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Units & Display</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distance Unit
              </label>
              <select
                value={settings.distance_unit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    distance_unit: e.target.value as 'miles' | 'kilometers',
                  })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-3 py-2 text-gray-900 bg-white"
              >
                <option value="miles">Miles</option>
                <option value="kilometers">Kilometers</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Elevation Unit
              </label>
              <select
                value={settings.elevation_unit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    elevation_unit: e.target.value as 'meters' | 'feet',
                  })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-3 py-2 text-gray-900 bg-white"
              >
                <option value="feet">Feet</option>
                <option value="meters">Meters</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pace Format
              </label>
              <input
                type="text"
                value={settings.pace_format}
                onChange={(e) =>
                  setSettings({ ...settings, pace_format: e.target.value })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-3 py-2 text-gray-900 bg-white font-mono"
                placeholder="mm:ss"
              />
            </div>
          </div>
        </div>

        {/* API Keys Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={settings.openai_api_key || ''}
                onChange={(e) =>
                  setSettings({ ...settings, openai_api_key: e.target.value })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-3 py-2 text-gray-900 bg-white"
                placeholder="sk-..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Required for AI assistant functionality (embeddings, web search)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Model
              </label>
              <input
                type="text"
                value={settings.ai_model}
                onChange={(e) =>
                  setSettings({ ...settings, ai_model: e.target.value })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-3 py-2 text-gray-900 bg-white font-mono"
                placeholder="gpt-5-nano-2025-08-07"
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be a reasoning/thinking model (e.g., gpt-5-nano-2025-08-07, o1, o3-mini)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reasoning Effort
              </label>
              <select
                value={settings.reasoning_effort}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reasoning_effort: e.target.value as 'minimal' | 'low' | 'medium' | 'high',
                  })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-3 py-2 text-gray-900 bg-white"
              >
                <option value="minimal">Minimal - Fastest, cheapest</option>
                <option value="low">Low - Fast responses</option>
                <option value="medium">Medium - Balanced</option>
                <option value="high">High - Most thorough</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Higher effort = better quality but slower and more expensive
              </p>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Training Documents
            </h2>
            <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
              <input
                type="file"
                accept=".txt,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleDocumentUpload(file);
                }}
              />
            </label>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">
                No documents uploaded. Upload training documents for the AI assistant to reference.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {doc.filename}
                      </div>
                      <div className="text-xs text-gray-500">
                        Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDocumentDelete(doc.id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

