'use client';

import React, { useState, KeyboardEvent, useRef } from 'react';

interface InputBoxProps {
  onSendMessage: (aiMessage: string, displayMessage?: string) => void;
  disabled?: boolean;
}

interface FileWithContent {
  file: File;
  content: string;
}

export default function InputBox({ onSendMessage, disabled = false }: InputBoxProps) {
  const [message, setMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<FileWithContent[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if ((message.trim() || uploadedFiles.length > 0) && !disabled) {
      let userDisplayMessage = message.trim();
      let aiAnalysisMessage = message.trim();
      
      // For display: just show file names
      if (uploadedFiles.length > 0) {
        const fileNames = uploadedFiles.map(f => f.file.name).join(', ');
        userDisplayMessage += `\n\n📎 Uploaded files: ${fileNames}`;
      }
      
      // For AI: include full file content for analysis
      if (uploadedFiles.length > 0) {
        aiAnalysisMessage += '\n\n--- UPLOADED FILES FOR ANALYSIS ---\n\n';
        uploadedFiles.forEach((fileWithContent, index) => {
          aiAnalysisMessage += `File ${index + 1}: ${fileWithContent.file.name}\n`;
          aiAnalysisMessage += `Content:\n${fileWithContent.content}\n\n`;
        });
        aiAnalysisMessage += '--- END FILES ---\n\n';
        aiAnalysisMessage += 'Please analyze the uploaded files and provide your legal analysis or advice based on the content above.';
      }
      
      // Send the analysis message to AI but display the clean version to user
      onSendMessage(aiAnalysisMessage, userDisplayMessage);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Read file contents
    const filesWithContent = await Promise.all(
      files.map(async (file) => {
        const content = await readFileContent(file);
        return { file, content };
      })
    );
    
    setUploadedFiles(prev => [...prev, ...filesWithContent]);
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDocumentRequest = () => {
    const docMessage = "I need help creating a legal document. Please provide me with a template or help me draft one.";
    onSendMessage(docMessage);
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto p-4">
      {/* File Upload Area */}
      {uploadedFiles.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Uploaded Files:</span>
          </div>
          <div className="space-y-2">
            {uploadedFiles.map((fileWithContent, index) => (
              <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded border">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-gray-700">{fileWithContent.file.name}</span>
                  <span className="text-xs text-gray-500">({Math.round(fileWithContent.file.size / 1024)}KB)</span>
                  <span className="text-xs text-green-600">✓ Content loaded</span>
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
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-law-blue hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50 border border-transparent hover:border-blue-200"
              title="Upload documents for analysis"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="font-medium">Upload Files</span>
            </button>

            {/* Document Generation Button */}
            <button
              onClick={handleDocumentRequest}
              disabled={disabled}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-law-blue hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50 border border-transparent hover:border-blue-200"
              title="Request document templates or generation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium">Create Document</span>
            </button>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={disabled || (!message.trim() && uploadedFiles.length === 0)}
            className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-law-blue to-law-blue-dark text-white rounded-lg hover:from-law-blue-dark hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-law-blue focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
          >
            <span className="text-sm font-semibold">Send</span>
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
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            This AI provides general legal information only. Always consult with a qualified attorney for personalized legal advice.
          </p>
        </div>
      </div>
    </div>
  );
}