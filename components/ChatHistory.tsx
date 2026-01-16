'use client';

import React, { useState, useEffect, useRef } from 'react';

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
  refreshTrigger?: number;
}

// 30 days in milliseconds
const RETENTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export default function ChatHistory({ onLoadChat, onNewChat, currentChatId, refreshTrigger }: ChatHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, [refreshTrigger]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  const loadChatHistory = () => {
    const savedSessions = localStorage.getItem('chat-sessions');
    if (savedSessions) {
      try {
        const now = new Date().getTime();
        const sessions = JSON.parse(savedSessions)
          .map((session: any) => ({
            ...session,
            timestamp: new Date(session.timestamp)
          }))
          // Filter out sessions older than 30 days
          .filter((session: ChatSession) => {
            const sessionAge = now - session.timestamp.getTime();
            return sessionAge < RETENTION_PERIOD_MS;
          });
        
        // Sort by timestamp (newest first)
        const sortedSessions = sessions.sort((a: ChatSession, b: ChatSession) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        );
        
        setChatSessions(sortedSessions);
        
        // Update localStorage to remove expired sessions
        localStorage.setItem('chat-sessions', JSON.stringify(sortedSessions));
        
        // Clean up orphaned chat messages for expired sessions
        cleanupExpiredMessages(sortedSessions);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  };

  const cleanupExpiredMessages = (validSessions: ChatSession[]) => {
    const validIds = new Set(validSessions.map(s => s.id));
    
    // Find and remove orphaned chat messages from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('chat-messages-')) {
        const chatId = key.replace('chat-messages-', '');
        if (!validIds.has(chatId) && chatId !== 'default') {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
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
    
    // Cancel editing if we're deleting the chat being edited
    if (editingChatId === chatId) {
      setEditingChatId(null);
      setEditingTitle('');
    }
  };

  const startRenaming = (chatId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  };

  const saveRename = (chatId: string) => {
    const trimmedTitle = editingTitle.trim();
    if (trimmedTitle && trimmedTitle.length > 0) {
      const updatedSessions = chatSessions.map(session => 
        session.id === chatId 
          ? { ...session, title: trimmedTitle }
          : session
      );
      setChatSessions(updatedSessions);
      localStorage.setItem('chat-sessions', JSON.stringify(updatedSessions));
    }
    setEditingChatId(null);
    setEditingTitle('');
  };

  const cancelRenaming = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRename(chatId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRenaming();
    }
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
      {/* Modern Toggle Button - Hidden when sidebar is open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-5 left-5 z-50 flex items-center space-x-2 px-4 py-2.5 bg-white/90 backdrop-blur-md border-2 border-slate-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white hover:border-blue-300 transform hover:scale-105 active:scale-95 group"
          title="Chat History"
        >
        <svg className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">History</span>
        </button>
      )}

      {/* Modern Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-gradient-to-b from-white to-slate-50 border-r-2 border-slate-200 shadow-2xl transform transition-all duration-300 z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Modern Header */}
          <div className="p-5 border-b-2 border-slate-200 bg-gradient-to-r from-white to-slate-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Chat History</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all duration-200 hover:scale-110"
              >
                <svg className="w-5 h-5 text-slate-500 hover:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => {
                onNewChat();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl transition-all duration-300 text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Chat</span>
            </button>
          </div>

          {/* Modern Chat List */}
          <div className="flex-1 overflow-y-auto chat-scrollbar p-3">
            {chatSessions.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700">No chat history yet</p>
                <p className="text-xs text-slate-500 mt-1">Start a conversation to see it here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => {
                      if (editingChatId !== session.id) {
                        onLoadChat(session.id);
                        setIsOpen(false);
                      }
                    }}
                    className={`group p-4 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-102 hover:shadow-md ${
                      currentChatId === session.id 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-lg' 
                        : 'bg-white hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 border-2 border-slate-100 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 flex items-start space-x-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
                          currentChatId === session.id 
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                            : 'bg-gradient-to-br from-slate-200 to-slate-300 group-hover:from-blue-400 group-hover:to-indigo-500'
                        } transition-all duration-300`}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingChatId === session.id ? (
                            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => handleRenameKeyDown(e, session.id)}
                                onBlur={() => saveRename(session.id)}
                                className="flex-1 text-sm font-bold bg-white border-2 border-blue-400 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                maxLength={100}
                              />
                            </div>
                          ) : (
                            <h3 className={`text-sm font-bold truncate ${
                              currentChatId === session.id ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {session.title}
                            </h3>
                          )}
                          <p className="text-xs text-slate-500 mt-1.5 flex items-center space-x-2">
                            <span className="flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                              </svg>
                              {session.messageCount}
                            </span>
                            <span>•</span>
                            <span>{formatTime(session.timestamp)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        {editingChatId !== session.id && (
                          <button
                            onClick={(e) => startRenaming(session.id, session.title, e)}
                            className="p-2 hover:bg-blue-100 rounded-lg text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110"
                            title="Rename chat"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => deleteChat(session.id, e)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110"
                          title="Delete chat"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Overlay with Blur */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-all duration-300"
        />
      )}
    </>
  );
}