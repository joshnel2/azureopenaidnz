'use client';

import React from 'react';

interface MessageBubbleProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
}

export default function MessageBubble({ message, isUser, timestamp }: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
            isUser ? 'bg-law-blue' : 'bg-gray-600'
          }`}>
            {isUser ? 'U' : 'AI'}
          </div>
        </div>
        
        {/* Message content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-3 rounded-2xl ${
            isUser 
              ? 'bg-law-blue text-white rounded-br-md' 
              : 'bg-gray-100 text-gray-800 rounded-bl-md'
          }`}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
          </div>
          <span className="text-xs text-gray-500 mt-1 px-1">
            {formatTime(timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}