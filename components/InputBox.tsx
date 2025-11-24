'use client';

import React, { useState, KeyboardEvent, useRef } from 'react';

interface InputBoxProps {
  onSendMessage: (aiMessage: string, displayMessage?: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface FileWithContent {
  file: File;
  content: string;
}

export default function InputBox({ onSendMessage, onCancel, isLoading = false }: InputBoxProps) {
  const [message, setMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<FileWithContent[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if ((message.trim() || uploadedFiles.length > 0) && !isLoading) {
      let userDisplayMessage = message.trim();
      let aiAnalysisMessage = message.trim();
      
      // For display: just show file names with clean formatting
      if (uploadedFiles.length > 0) {
        const fileNames = uploadedFiles.map(f => f.file.name).join(', ');
        if (userDisplayMessage) {
          userDisplayMessage += `\n\n📎 Uploaded files: ${fileNames}`;
        } else {
          userDisplayMessage = `📎 Uploaded files: ${fileNames}`;
        }
      }
      
      // For AI: include full file content for analysis (invisible to user)
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

  // Firefox-compatible key handler
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log('Files selected:', files.length);
    
    // Read file contents
    const filesWithContent = await Promise.all(
      files.map(async (file) => {
        console.log('Reading file:', file.name, 'Type:', file.type, 'Size:', file.size);
        try {
          const content = await readFileContent(file);
          console.log('File content length:', content.length);
          return { file, content };
        } catch (error) {
          console.error('Error reading file:', file.name, error);
          return { file, content: `Error reading file: ${file.name}` };
        }
      })
    );
    
    console.log('Files with content:', filesWithContent.length);
    setUploadedFiles(prev => [...prev, ...filesWithContent]);
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const result = e.target?.result;
        
        if (file.type.startsWith('image/')) {
          resolve(`[IMAGE FILE: ${file.name}]\n\nThis appears to be an image file. For best results with legal documents, please:\n1. Convert the image to PDF format, or\n2. Use OCR software to extract the text first, or\n3. Describe what you see in the image and I can provide guidance.\n\nI can still help analyze and draft documents based on your description of the image content.`);
        } else if (file.type === 'application/pdf') {
          const arrayBuffer = result as ArrayBuffer;
          const pdfjsLib = await import('pdfjs-dist');
          
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
          
          const uint8Array = new Uint8Array(arrayBuffer);
          const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
          
          let fullText = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += `\n--- Page ${i} ---\n${pageText}\n`;
          }
          
          resolve(`[PDF FILE: ${file.name}]\n\nExtracted content from PDF (${pdf.numPages} pages):\n${fullText}`);
        } else if (file.type === 'application/msword' || file.name.toLowerCase().endsWith('.doc')) {
          // For old .doc format, extract text from binary
          const arrayBuffer = result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          let text = '';
          for (let i = 0; i < bytes.length; i++) {
            if (bytes[i] >= 32 && bytes[i] <= 126) {
              text += String.fromCharCode(bytes[i]);
            } else if (bytes[i] === 10 || bytes[i] === 13) {
              text += '\n';
            }
          }
          const cleaned = text.replace(/\n{3,}/g, '\n\n').trim();
          resolve(`[WORD DOCUMENT: ${file.name}]\n\nExtracted content from Word document:\n${cleaned}`);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                   file.type === 'application/vnd.ms-excel' ||
                   file.name.toLowerCase().endsWith('.xlsx') ||
                   file.name.toLowerCase().endsWith('.xls')) {
          // For Excel files, parse using xlsx library
          try {
            const arrayBuffer = result as ArrayBuffer;
            const xlsx = await import('xlsx');
            const workbook = xlsx.read(arrayBuffer, { type: 'array' });
            
            let excelContent = '';
            workbook.SheetNames.forEach((sheetName) => {
              const sheet = workbook.Sheets[sheetName];
              const csvData = xlsx.utils.sheet_to_csv(sheet);
              excelContent += `\n--- Sheet: ${sheetName} ---\n${csvData}\n`;
            });
            
            resolve(`[EXCEL FILE: ${file.name}]\n\nExtracted content from Excel spreadsheet (${workbook.SheetNames.length} sheet(s)):\n${excelContent}`);
          } catch (error) {
            console.error('Excel file processing error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            resolve(`[EXCEL FILE: ${file.name}]\n\nExcel file uploaded but parsing failed. Error: ${errorMessage}. Please provide guidance about this file.`);
          }
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   file.name.toLowerCase().endsWith('.docx')) {
          // For Word documents, use mammoth to extract text
          try {
            const arrayBuffer = result as ArrayBuffer;
            
            // Check if we're in a browser environment
            if (typeof window === 'undefined') {
              throw new Error('Word document processing requires browser environment');
            }
            
            // Dynamic import for client-side only
            const mammoth = await import('mammoth');
            
            console.log('Processing Word document:', file.name);
            const mammothResult = await mammoth.extractRawText({ arrayBuffer });
            
            if (mammothResult.value && mammothResult.value.trim().length > 0) {
              console.log(`Word document processing complete. Extracted ${mammothResult.value.length} characters.`);
              resolve(`[WORD DOCUMENT: ${file.name}]\n\nExtracted content from Word document:\n${mammothResult.value}`);
            } else {
              console.warn('Word document has no readable text content');
              resolve(`[WORD DOCUMENT: ${file.name}]\n\nThis Word document appears to contain no readable text or may be corrupted. Please copy and paste the content directly for analysis.`);
            }
          } catch (error) {
            console.error('Word document processing error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            resolve(`[WORD DOCUMENT: ${file.name}]\n\nWord document uploaded but text extraction failed. Error: ${errorMessage}. Please copy and paste the content directly for analysis.`);
          }
        } else {
          // For text files, read as text
          const content = result as string;
          resolve(content || `[FILE: ${file.name}]\n\nFile uploaded but content could not be read. Please provide general guidance about this type of file.`);
        }
      };
      
      reader.onerror = () => {
        resolve(`[FILE: ${file.name}]\n\nFile uploaded but could not be processed. Please provide general guidance about this type of file.`);
      };
      
      // Read as ArrayBuffer for PDFs, Excel files, and Word docs, text for others (including CSV)
      if (file.type === 'application/pdf' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel' ||
          file.type === 'application/msword' ||
          file.name.toLowerCase().endsWith('.docx') ||
          file.name.toLowerCase().endsWith('.doc') ||
          file.name.toLowerCase().endsWith('.xlsx') ||
          file.name.toLowerCase().endsWith('.xls')) {
        reader.readAsArrayBuffer(file);
      } else {
        // Read as text for CSV, TXT, and other text-based files
        reader.readAsText(file);
      }
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur-xl shadow-2xl">
      <div className="max-w-4xl mx-auto p-4">
      {/* Modern File Upload Area */}
      {uploadedFiles.length > 0 && (
        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200/50 rounded-2xl shadow-lg animate-slide-in-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </div>
              <span className="text-sm font-bold text-blue-900">Uploaded Files</span>
            </div>
          </div>
          <div className="space-y-2">
            {uploadedFiles.map((fileWithContent, index) => (
              <div key={index} className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border-2 border-blue-100 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{fileWithContent.file.name}</span>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-xs text-gray-500">({Math.round(fileWithContent.file.size / 1024)}KB)</span>
                      <span className="text-xs text-green-600 font-medium flex items-center">
                        <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Loaded
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all duration-200"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modern Input Area with Gradient Border */}
      <div className="relative bg-white rounded-2xl border-2 border-slate-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none"></div>
        <div className="relative p-4">
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              // Firefox-compatible auto-resize
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
            onKeyPress={handleKeyPress}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question, analyze documents, or get help with drafting..."
            disabled={false}
            rows={1}
            className="w-full px-0 py-2 border-none resize-none focus:outline-none text-gray-800 placeholder-gray-400 bg-transparent"
            style={{ minHeight: '24px', maxHeight: '120px' }}
          />
        </div>

        {/* Modern Action Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/30 border-t-2 border-slate-100 rounded-b-2xl">
          <div className="flex items-center space-x-2">
            {/* Modern File Upload Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={false}
              className="flex items-center space-x-2 px-4 py-2.5 text-sm text-slate-700 hover:text-blue-700 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all duration-300 disabled:opacity-50 border-2 border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 font-semibold"
              title="Upload documents for analysis"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span>Attach</span>
            </button>

          </div>

          {/* Enhanced Send or Cancel Button */}
          {isLoading ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancel?.();
              }}
              className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-bold"
            >
              <span className="text-sm">Stop</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit();
              }}
              disabled={!message.trim() && uploadedFiles.length === 0}
              className="relative flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-700 hover:via-blue-700 hover:to-cyan-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-blue-500/40 hover:shadow-xl hover:shadow-blue-500/50 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:shadow-none font-bold overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity"></div>
              <span className="text-sm relative z-10">Send</span>
              <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.rtf,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp"
        onChange={handleFileUpload}
        className="hidden"
      />

        {/* Modern Internal Use Notice */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500 font-medium">
            🔒 Internal Assistant • For DNZ LLP staff use only • Confidential work product
          </p>
        </div>
      </div>
    </div>
  );
}