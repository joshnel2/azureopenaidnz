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
    
    // Generate a title from the first user message
    const firstUserMessage = messages.find(m => m.role === 'user');
    let title = 'New Chat';
    if (firstUserMessage) {
      title = firstUserMessage.content.slice(0, 50);
      if (firstUserMessage.content.length > 50) {
        title += '...';
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
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
          messages: updatedMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
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
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 && !streamingMessage && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-law-blue rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                How can I help you today?
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Ask me about legal matters, upload documents for analysis, or request document templates.
              </p>
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
              <div className="py-6">
                <div className="max-w-4xl mx-auto px-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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