import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard view
    if (eventId) {
      navigate(`/dashboard/${eventId}`, { replace: true });
    }
  }, [eventId, navigate]);

  return null;
}

