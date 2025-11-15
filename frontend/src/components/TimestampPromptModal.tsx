import { Clock, X } from 'lucide-react';

interface TimestampPromptModalProps {
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
  durationMinutes: number;
  firstTimestamp: string;
  lastTimestamp: string;
}

export default function TimestampPromptModal({
  onAccept,
  onDecline,
  onClose,
  durationMinutes,
  firstTimestamp,
  lastTimestamp,
}: TimestampPromptModalProps) {
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Clock className="h-6 w-6 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Timestamps Detected</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            This GPX file contains timestamps. Would you like to use the timing data from the file,
            or set your own target duration?
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-900 mb-2">File Timing Data:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div>
                <span className="font-medium">Duration:</span> {formatDuration(durationMinutes)}
              </div>
              <div>
                <span className="font-medium">Start:</span> {formatTimestamp(firstTimestamp)}
              </div>
              <div>
                <span className="font-medium">End:</span> {formatTimestamp(lastTimestamp)}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onAccept}
              className="w-full px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Use File Timestamps ({formatDuration(durationMinutes)})
            </button>
            <button
              onClick={onDecline}
              className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Set My Own Target Duration
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-500 text-center">
            You can adjust paces and timing after making this choice
          </p>
        </div>
      </div>
    </div>
  );
}

