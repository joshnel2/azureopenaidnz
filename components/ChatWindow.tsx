'use client';

import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import InputBox from './InputBox';
import ChatHistory from './ChatHistory';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [currentChatId, setCurrentChatId] = useState<string>('default');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage on component mount
  useEffect(() => {
    loadChat(currentChatId);
  }, [currentChatId]);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat-messages-${currentChatId}`, JSON.stringify(messages));
    }
  }, [messages, currentChatId]);

  const loadChat = (chatId: string) => {
    const savedMessages = localStorage.getItem(`chat-messages-${chatId}`);
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(parsedMessages);
      } catch (error) {
        console.error('Error loading messages from localStorage:', error);
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  };

  const createNewChat = () => {
    const newChatId = `chat-${Date.now()}`;
    setCurrentChatId(newChatId);
    setMessages([]);
  };

  const saveChatSession = (messages: Message[]) => {
    if (messages.length === 0) return;
    
    // Generate an intelligent title based on conversation content
    let title = 'New Chat';
    
    if (messages.length >= 2) {
      // Try to generate a smart summary
      const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
      const assistantMessages = messages.filter(m => m.role === 'assistant').map(m => m.content);
      
      // Look for key legal topics in the conversation
      const allContent = [...userMessages, ...assistantMessages].join(' ').toLowerCase();
      
      if (allContent.includes('contract') || allContent.includes('agreement')) {
        title = 'Contract & Agreement Discussion';
      } else if (allContent.includes('employment') || allContent.includes('workplace')) {
        title = 'Employment Law Consultation';
      } else if (allContent.includes('real estate') || allContent.includes('property') || allContent.includes('lease')) {
        title = 'Real Estate Legal Matter';
      } else if (allContent.includes('litigation') || allContent.includes('lawsuit') || allContent.includes('court')) {
        title = 'Litigation & Court Matters';
      } else if (allContent.includes('corporate') || allContent.includes('business') || allContent.includes('company')) {
        title = 'Corporate Law Consultation';
      } else if (allContent.includes('nda') || allContent.includes('non-disclosure') || allContent.includes('confidential')) {
        title = 'Confidentiality & NDA Discussion';
      } else if (allContent.includes('intellectual property') || allContent.includes('patent') || allContent.includes('trademark')) {
        title = 'Intellectual Property Matter';
      } else if (allContent.includes('uploaded files') || allContent.includes('📎')) {
        title = 'Document Analysis Session';
      } else if (allContent.includes('template') || allContent.includes('draft') || allContent.includes('document')) {
        title = 'Document Creation & Templates';
      } else {
        // Fallback: use first user message but make it more descriptive
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (firstUserMessage) {
          const content = firstUserMessage.content.replace(/📎.*$/m, '').trim(); // Remove file indicators
          title = content.slice(0, 45);
          if (content.length > 45) {
            title += '...';
          }
        }
      }
    } else {
      // Single message - use first user message
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        const content = firstUserMessage.content.replace(/📎.*$/m, '').trim();
        title = content.slice(0, 45);
        if (content.length > 45) {
          title += '...';
        }
      }
    }
    
    // Get existing sessions
    const savedSessions = localStorage.getItem('chat-sessions');
    let sessions = [];
    if (savedSessions) {
      try {
        sessions = JSON.parse(savedSessions);
      } catch (error) {
        console.error('Error parsing chat sessions:', error);
      }
    }
    
    // Check if current chat already exists in sessions
    const existingSessionIndex = sessions.findIndex((s: any) => s.id === currentChatId);
    
    const sessionData = {
      id: currentChatId,
      title,
      timestamp: new Date().toISOString(),
      messageCount: messages.length
    };
    
    if (existingSessionIndex >= 0) {
      // Update existing session
      sessions[existingSessionIndex] = sessionData;
    } else {
      // Add new session
      sessions.unshift(sessionData);
    }
    
    // Keep only last 50 sessions
    sessions = sessions.slice(0, 50);
    
    localStorage.setItem('chat-sessions', JSON.stringify(sessions));
    
    // Trigger refresh of chat history
    setRefreshTrigger(prev => prev + 1);
  };

  // Auto-scroll to bottom when new messages arrive (but not for empty chats)
  useEffect(() => {
    if (messages.length > 0 || streamingMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMessage]);

  // Scroll to top when loading new chat or starting fresh
  useEffect(() => {
    if (messages.length === 0) {
      setTimeout(() => {
        const messagesContainer = document.querySelector('.chat-messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = 0;
        }
      }, 100); // Small delay to ensure DOM is ready
    }
  }, [currentChatId]); // Only trigger when chat ID changes (new chat or loaded chat)

  const handleSendMessage = async (aiContent: string, displayContent?: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content: displayContent || aiContent, // Use display content for user message bubble
      role: 'user',
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setStreamingMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: aiContent // Send the full AI content with file data
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let assistantMessage = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.content) {
                assistantMessage += parsed.content;
                setStreamingMessage(assistantMessage);
              }
            } catch (e) {
              // Ignore parsing errors for malformed chunks
            }
          }
        }
      }

      if (assistantMessage) {
        const assistantMessageObj: Message = {
          id: (Date.now() + 1).toString(),
          content: assistantMessage,
          role: 'assistant',
          timestamp: new Date(),
        };
        const finalMessages = [...updatedMessages, assistantMessageObj];
        setMessages(finalMessages);
        
        // Save chat session to history
        saveChatSession(finalMessages);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, something went wrong. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };
      const errorMessages = [...updatedMessages, errorMessage];
      setMessages(errorMessages);
      saveChatSession(errorMessages);
    } finally {
      setIsLoading(false);
      setStreamingMessage('');
    }
  };

  const clearChat = () => {
    createNewChat();
  };

  return (
    <>
      <ChatHistory
        onLoadChat={(chatId) => setCurrentChatId(chatId)}
        onNewChat={createNewChat}
        currentChatId={currentChatId}
        refreshTrigger={refreshTrigger}
      />
      <div className="flex flex-col h-full bg-white">

      {/* Messages - ChatGPT Style */}
      <div className="flex-1 overflow-y-auto chat-messages-container">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 && !streamingMessage && (
            <div className="text-center py-16 px-4">
              <div className="max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-gradient-to-br from-law-blue to-law-blue-dark rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  How can I assist with your legal work today?
                </h2>
                <p className="text-lg text-gray-600 mb-12 leading-relaxed">
                  I'm here to support your legal practice with research, document analysis, template generation, and case preparation assistance.
                </p>
                
                {/* Professional Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Legal Research</h3>
                    <p className="text-sm text-gray-600">Get research assistance on corporate, litigation, and real estate matters</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Case Document Review</h3>
                    <p className="text-sm text-gray-600">Upload and analyze client contracts, agreements, and case files</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-xl border border-purple-100 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Template Generation</h3>
                    <p className="text-sm text-gray-600">Create professional legal templates and client documents</p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-500 bg-gray-50 inline-block px-4 py-2 rounded-full">
                    💼 Upload case files for analysis or ask about legal research and document drafting
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-0">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message.content}
                isUser={message.role === 'user'}
                timestamp={message.timestamp}
              />
            ))}

            {streamingMessage && (
              <MessageBubble
                message={streamingMessage}
                isUser={false}
                timestamp={new Date()}
              />
            )}

            {isLoading && !streamingMessage && (
              <div className="py-6 bg-white border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-law-blue rounded-full animate-spin"></div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-law-blue rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-law-blue rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-law-blue rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                          <span className="text-sm text-gray-600 font-medium">Legal Assistant is analyzing...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div ref={messagesEndRef} />
        </div>
      </div>

        {/* Input - ChatGPT Style */}
        <div className="flex-shrink-0">
          <InputBox onSendMessage={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </>
  );
}