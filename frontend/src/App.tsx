import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EventsList from './pages/EventsList';
import EventDetail from './pages/EventDetail';
import SettingsPage from './pages/SettingsPage';
import DocumentsPage from './pages/DocumentsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/events" replace />} />
          <Route path="events" element={<EventsList />} />
          <Route path="events/:eventId" element={<EventDetail />} />
          <Route path="dashboard/:eventId" element={<Dashboard />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

