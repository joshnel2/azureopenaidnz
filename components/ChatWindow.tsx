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

// Rough token estimation: ~4 characters per token for English text
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Trim conversation history to fit within token budget while preserving recent context.
// This keeps as many recent messages as possible within the budget, and prepends a
// brief summary note if older messages had to be dropped.
function trimMessagesForAPI(
  messages: { role: string; content: string }[],
  maxTokenBudget: number = 12000 // conservative budget leaving room for system prompt + response
): { role: string; content: string }[] {
  if (messages.length === 0) return messages;

  // Always include the latest user message
  const latestMessage = messages[messages.length - 1];
  const latestTokens = estimateTokens(latestMessage.content);

  // If even the latest message exceeds budget, truncate its content
  if (latestTokens > maxTokenBudget) {
    const maxChars = maxTokenBudget * 4;
    return [{
      ...latestMessage,
      content: latestMessage.content.slice(0, maxChars) + '\n\n[Content truncated due to length]'
    }];
  }

  let totalTokens = latestTokens;
  const trimmedMessages: { role: string; content: string }[] = [];

  // Walk backwards from second-to-last message, adding messages while within budget
  for (let i = messages.length - 2; i >= 0; i--) {
    const msg = messages[i];
    const msgTokens = estimateTokens(msg.content);

    if (totalTokens + msgTokens > maxTokenBudget) {
      // No more room -- stop adding older messages
      break;
    }

    totalTokens += msgTokens;
    trimmedMessages.unshift(msg);
  }

  // If we had to drop some messages, add a brief context note
  const droppedCount = messages.length - 1 - trimmedMessages.length;
  if (droppedCount > 0) {
    trimmedMessages.unshift({
      role: 'system',
      content: `[Note: This is a long conversation. The ${droppedCount} earliest message(s) have been omitted to stay within context limits. The most recent messages are preserved below.]`
    });
  }

  trimmedMessages.push(latestMessage);
  return trimmedMessages;
}

// Safe localStorage write that handles quota exceeded errors
function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
      console.warn('localStorage quota exceeded. Attempting cleanup...');
      // Try to free space by removing oldest chat message data
      try {
        const sessionsStr = localStorage.getItem('chat-sessions');
        if (sessionsStr) {
          const sessions = JSON.parse(sessionsStr);
          // Sort oldest first, remove the oldest 5 chat message stores
          const sorted = [...sessions].sort((a: any, b: any) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          const toRemove = sorted.slice(0, Math.min(5, sorted.length));
          for (const s of toRemove) {
            localStorage.removeItem(`chat-messages-${s.id}`);
          }
          // Update sessions list
          const remainingIds = new Set(sorted.slice(Math.min(5, sorted.length)).map((s: any) => s.id));
          const updatedSessions = sessions.filter((s: any) => remainingIds.has(s.id));
          localStorage.setItem('chat-sessions', JSON.stringify(updatedSessions));
        }
        // Retry the original write
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error('localStorage write failed even after cleanup:', retryError);
        return false;
      }
    }
    console.error('localStorage write error:', e);
    return false;
  }
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [currentChatId, setCurrentChatId] = useState<string>('default');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load messages from localStorage on component mount
  useEffect(() => {
    loadChat(currentChatId);
  }, [currentChatId]);

  // Save messages to localStorage whenever messages change (with quota handling)
  useEffect(() => {
    if (messages.length > 0) {
      const serialized = JSON.stringify(messages);
      safeLocalStorageSet(`chat-messages-${currentChatId}`, serialized);
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

  const handleCancelResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setStreamingMessage('');
  };

  const handleSendMessage = async (aiContent: string, displayContent?: string, enableWebSearch?: boolean) => {
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

    abortControllerRef.current = new AbortController();

    try {
      // Check if this message contains uploaded files
      const hasUploadedFiles = aiContent.includes('--- UPLOADED FILES FOR ANALYSIS ---');
      
      // Check if user is explicitly asking about previous documents/context
      const userText = displayContent?.toLowerCase() || aiContent.toLowerCase();
      const referencingPrevious = /\b(both|previous|earlier|first|compare|all|these|those|prior|last)\b/.test(userText) ||
                                  /\b(document|file|upload)s\b/.test(userText); // plural forms
      
      // Build the raw message list
      let rawMessages: { role: string; content: string }[];
      
      // If files are uploaded, only send current message (isolate document context)
      // UNLESS user explicitly references previous documents
      if (hasUploadedFiles && !referencingPrevious) {
        rawMessages = [{
          role: 'user' as const,
          content: aiContent
        }];
      } else {
        rawMessages = [
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          {
            role: 'user' as const,
            content: aiContent
          }
        ];
      }

      // Trim messages to fit within token limits (prevents API failures on long chats)
      const messagesToSend = trimMessagesForAPI(rawMessages);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
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
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        // Silently log -- the trimming should prevent most failures
        console.warn('Chat request issue, retrying silently is possible:', error?.message);
      }
    } finally {
      setIsLoading(false);
      setStreamingMessage('');
      abortControllerRef.current = null;
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
      <div className="flex flex-col h-full bg-transparent">

      {/* Messages - Modern Style */}
      <div className="flex-1 overflow-y-auto chat-messages-container chat-scrollbar">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 && !streamingMessage && (
            <div className="text-center py-20 px-4 animate-fade-in">
              <div className="max-w-3xl mx-auto">
                {/* Hero Icon with Animated Gradient */}
                <div className="relative inline-block mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/30 ring-4 ring-white/50 animate-pulse">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  {/* Decorative rings */}
                  <div className="absolute inset-0 w-24 h-24 mx-auto rounded-3xl border-4 border-purple-300/30 animate-ping" style={{ animationDuration: '2s' }}></div>
                </div>

                {/* Welcome Message */}
                <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 mb-4 tracking-tight">
                  How can I assist you today?
                </h2>
                <p className="text-lg text-gray-600 mb-16 leading-relaxed max-w-2xl mx-auto">
                  Your intelligent legal AI assistant ready to analyze documents, draft content, and provide expert guidance.
                </p>
                
                {/* Modern Feature Cards with Enhanced Design */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8 rounded-2xl border-2 border-blue-100/50 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 cursor-pointer transform hover:-translate-y-2">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-transparent rounded-bl-full transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500"></div>
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-3 text-lg">Analyze Content</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">Upload contracts, transcripts, agreements, or other legal documents for comprehensive analysis and actionable insights.</p>
                    </div>
                  </div>
                  
                  <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-green-50 p-8 rounded-2xl border-2 border-emerald-100/50 hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 cursor-pointer transform hover:-translate-y-2">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-transparent rounded-bl-full transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500"></div>
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-3 text-lg">Draft Documents</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">Create professional legal correspondence and generate template documents to accelerate your workflow with confidence.</p>
                    </div>
                  </div>
                  
                  <div className="group relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-violet-50 p-8 rounded-2xl border-2 border-purple-100/50 hover:border-purple-300 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 cursor-pointer transform hover:-translate-y-2">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-transparent rounded-bl-full transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500"></div>
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-3 text-lg">Review & Revise</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">Submit existing documents for thorough proofreading, detailed analysis, and informed suggestions for improvement.</p>
                    </div>
                  </div>
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
              <div className="py-8 bg-white/60 border-b border-gray-100/50 backdrop-blur-sm animate-fade-in">
                <div className="max-w-4xl mx-auto px-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-11 h-11 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center shadow-lg border-2 border-slate-200">
                      <div className="w-5 h-5 border-3 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl px-5 py-4 border-2 border-slate-100 shadow-md">
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1.5">
                            <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-bounce"></div>
                            <div className="w-2.5 h-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2.5 h-2.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm text-slate-700 font-bold">Analyzing your request...</span>
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
          <InputBox onSendMessage={handleSendMessage} onCancel={handleCancelResponse} isLoading={isLoading} />
        </div>
      </div>
    </>
  );
}