'use client';

import React, { useState, KeyboardEvent, useRef } from 'react';

interface InputBoxProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export default function InputBox({ onSendMessage, disabled = false }: InputBoxProps) {
  const [message, setMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      let finalMessage = message.trim();
      
      // Add file information if files are uploaded
      if (uploadedFiles.length > 0) {
        const fileList = uploadedFiles.map(f => f.name).join(', ');
        finalMessage += `\n\n[Files uploaded: ${fileList}]`;
      }
      
      onSendMessage(finalMessage);
      setMessage('');
      setUploadedFiles([]);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDocumentRequest = () => {
    const docMessage = "I need help creating a legal document. Please provide me with a template or help me draft one.";
    onSendMessage(docMessage);
  };

  return (
    <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 p-4">
      {/* File Upload Area */}
      {uploadedFiles.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Uploaded Files:</span>
          </div>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded border">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-500">({Math.round(file.size / 1024)}KB)</span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a legal question, request document analysis, or get help with legal matters..."
            disabled={disabled}
            rows={1}
            className="w-full px-0 py-2 border-none resize-none focus:outline-none text-gray-800 placeholder-gray-500"
            style={{ minHeight: '24px', maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl">
          <div className="flex items-center space-x-3">
            {/* File Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-law-blue hover:bg-blue-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
              title="Upload documents for analysis"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span>Upload Files</span>
            </button>

            {/* Document Generation Button */}
            <button
              onClick={handleDocumentRequest}
              disabled={disabled}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-law-blue hover:bg-blue-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
              title="Request document templates or generation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Create Document</span>
            </button>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={disabled || (!message.trim() && uploadedFiles.length === 0)}
            className="flex items-center space-x-2 px-6 py-2 bg-law-blue text-white rounded-lg hover:bg-law-blue-dark focus:outline-none focus:ring-2 focus:ring-law-blue focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
          >
            <span className="text-sm font-medium">Send</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.rtf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Professional Disclaimer */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-600 leading-relaxed">
          <span className="font-medium">Professional Legal Assistant</span> • This AI provides general legal information only
          <br />
          Always consult with a qualified attorney for personalized legal advice • Attorney-client privilege does not apply
        </p>
      </div>
    </div>
  );
}