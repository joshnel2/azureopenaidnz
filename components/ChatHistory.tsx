'use client';

import React, { useState, useEffect } from 'react';

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messageCount: number;
}

interface ChatHistoryProps {
  onLoadChat: (chatId: string) => void;
  onNewChat: () => void;
  currentChatId?: string;
}

export default function ChatHistory({ onLoadChat, onNewChat, currentChatId }: ChatHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = () => {
    const savedSessions = localStorage.getItem('chat-sessions');
    if (savedSessions) {
      try {
        const sessions = JSON.parse(savedSessions).map((session: any) => ({
          ...session,
          timestamp: new Date(session.timestamp)
        }));
        setChatSessions(sessions.sort((a: ChatSession, b: ChatSession) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        ));
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  };

  const saveChatSession = (title: string, messageCount: number) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title,
      timestamp: new Date(),
      messageCount
    };

    const updatedSessions = [newSession, ...chatSessions];
    setChatSessions(updatedSessions);
    localStorage.setItem('chat-sessions', JSON.stringify(updatedSessions));
    return newSession.id;
  };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedSessions = chatSessions.filter(session => session.id !== chatId);
    setChatSessions(updatedSessions);
    localStorage.setItem('chat-sessions', JSON.stringify(updatedSessions));
    
    // Also remove the actual chat messages
    localStorage.removeItem(`chat-messages-${chatId}`);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        title="Chat History"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-white border-r border-gray-200 shadow-lg transform transition-transform duration-300 z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => {
                onNewChat();
                setIsOpen(false);
              }}
              className="w-full mt-3 px-4 py-2 bg-law-blue text-white rounded-lg hover:bg-law-blue-dark transition-colors text-sm font-medium"
            >
              + New Chat
            </button>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {chatSessions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p className="text-sm">No chat history yet</p>
                <p className="text-xs mt-1">Start a conversation to see it here</p>
              </div>
            ) : (
              <div className="p-2">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => {
                      onLoadChat(session.id);
                      setIsOpen(false);
                    }}
                    className={`p-3 mb-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      currentChatId === session.id ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {session.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {session.messageCount} messages • {formatTime(session.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteChat(session.id, e)}
                        className="ml-2 p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700"
                        title="Delete chat"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
        />
      )}
    </>
  );
}