import { useState, useEffect } from 'react';
import { Send, Bot, History, Plus, Trash2, X } from 'lucide-react';

interface ChatAssistantProps {
  eventId?: string;
  autoSendMessage?: string;
  onMessageSent?: () => void;
}

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface ChatSession {
  id: string;
  event_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function ChatAssistant({ eventId, autoSendMessage, onMessageSent }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Load sessions for the event and restore active session
  useEffect(() => {
    loadSessions();
    
    // Restore the last active session from localStorage
    if (eventId) {
      const savedSessionId = localStorage.getItem(`chat_session_${eventId}`);
      if (savedSessionId) {
        loadSession(savedSessionId);
      }
    }
  }, [eventId]);

  // Handle auto-send message (e.g., from AI Analysis button)
  useEffect(() => {
    if (autoSendMessage && autoSendMessage.trim()) {
      console.log('Auto-sending AI analysis message:', autoSendMessage.substring(0, 100) + '...');
      // Directly send the message
      handleSendWithMessage(autoSendMessage);
    }
  }, [autoSendMessage]);

  const loadSessions = async () => {
    if (!eventId) return;
    
    setLoadingSessions(true);
    try {
      const url = new URL('http://localhost:8000/api/chat/sessions');
      url.searchParams.append('event_id', eventId);
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSession = async (sessionId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/chat/sessions/${sessionId}`);
      if (response.ok) {
        const session = await response.json();
        console.log('Loaded session:', session);
        console.log('Messages in session:', session.messages);
        
        if (session.messages && Array.isArray(session.messages)) {
          setMessages(session.messages);
        } else {
          console.warn('No messages found in session or invalid format');
          setMessages([]);
        }
        
        setCurrentSessionId(sessionId);
        setShowHistory(false);
        
        // Save to localStorage so it persists across refreshes
        if (eventId) {
          localStorage.setItem(`chat_session_${eventId}`, sessionId);
        }
      } else {
        console.error('Failed to load session:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      alert('Failed to load chat session. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setShowHistory(false);
    
    // Clear saved session from localStorage
    if (eventId) {
      localStorage.removeItem(`chat_session_${eventId}`);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this chat session?')) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          startNewChat();
        }
        
        // Clear from localStorage if it's the saved session
        if (eventId) {
          const savedSessionId = localStorage.getItem(`chat_session_${eventId}`);
          if (savedSessionId === sessionId) {
            localStorage.removeItem(`chat_session_${eventId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleSendWithMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage = message;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // Add placeholder for assistant response
    const assistantMessageIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const url = new URL('http://localhost:8000/api/chat');
      const payload = {
        message: userMessage,
        event_id: eventId || null,
        session_id: currentSessionId,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let accumulatedContent = '';
      let sessionId = currentSessionId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.session_id && !sessionId) {
                // Store session ID from first message
                sessionId = data.session_id;
                setCurrentSessionId(sessionId);
                
                // Save to localStorage so it persists across refreshes
                if (eventId) {
                  localStorage.setItem(`chat_session_${eventId}`, sessionId);
                }
              } else if (data.chunk) {
                accumulatedContent += data.chunk;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMessageIndex] = {
                    role: 'assistant',
                    content: accumulatedContent,
                  };
                  return updated;
                });
              } else if (data.search) {
                // Show web search indicator
                if (data.search.status === 'in_progress' || !data.search.status) {
                  const searchPrefix = '🔍 Searching the web...\n\n';
                  if (!accumulatedContent.startsWith(searchPrefix)) {
                    accumulatedContent = searchPrefix + accumulatedContent;
                  }
                } else if (data.search.status === 'completed') {
                  accumulatedContent = accumulatedContent.replace('🔍 Searching the web...\n\n', '');
                }
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMessageIndex] = {
                    role: 'assistant',
                    content: accumulatedContent,
                  };
                  return updated;
                });
              } else if (data.done) {
                setLoading(false);
                // Reload sessions to show the new/updated one
                loadSessions();
                // Call callback if provided
                if (onMessageSent) {
                  onMessageSent();
                }
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantMessageIndex] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    await handleSendWithMessage(input);
  };

  return (
    <div className="bg-white rounded-lg shadow relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <Bot className="h-5 w-5 text-primary-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
          <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
            Beta
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={startNewChat}
            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-md"
            title="New chat"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-md"
            title="Chat history"
          >
            <History className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Chat History</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="py-2">
            {loadingSessions ? (
              <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
            ) : sessions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">No chat history yet</div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 flex items-start justify-between group ${
                    currentSessionId === session.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {session.title || 'Untitled Chat'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(session.updated_at).toLocaleDateString()} at{' '}
                      {new Date(session.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteSession(session.id, e)}
                    className="ml-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Messages */}
        <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Bot className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">Ask me about training, nutrition, pacing strategies, or anything related to ultra running!</p>
              {sessions.length > 0 && (
                <p className="text-xs mt-2 text-gray-400">
                  Click <History className="h-3 w-3 inline" /> to view past conversations
                </p>
              )}
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-3/4 rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && messages.length > 0 && messages[messages.length - 1].content === '' && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <p className="text-sm text-gray-600">Thinking...</p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base px-3 py-2 text-gray-900 bg-white"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
