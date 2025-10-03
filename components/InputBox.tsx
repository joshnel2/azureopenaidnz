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
        
        if (file.type === 'application/pdf') {
          // For PDFs, use dynamic import to avoid SSR issues
          try {
            // INPUT VALIDATION: Ensure we have a valid ArrayBuffer
            if (!result || !(result instanceof ArrayBuffer)) {
              throw new Error('PDF file did not load as ArrayBuffer - file may be corrupted');
            }
            
            const arrayBuffer = result as ArrayBuffer;
            
            // Validate ArrayBuffer is not empty
            if (arrayBuffer.byteLength === 0) {
              throw new Error('PDF file is empty (0 bytes)');
            }
            
            console.log(`PDF file size: ${arrayBuffer.byteLength} bytes`);
            
            // Check if we're in a browser environment
            if (typeof window === 'undefined') {
              throw new Error('PDF processing requires browser environment');
            }
            
            // Dynamic import for client-side only
            const pdfjsLib = await import('pdfjs-dist');
            
            // Configure worker with local fallback and multiple CDN options
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
              // Use local worker first (most reliable for production)
              pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
              console.log('Configured PDF.js worker: local file');
            }
            
            console.log('PDF.js version:', pdfjsLib.version);
            console.log('Worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc);
            
            // PROPER BUFFER HANDLING: Convert ArrayBuffer to Uint8Array
            // This ensures we pass the correct data type to PDF.js
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Validate the Uint8Array was created successfully
            if (!uint8Array || uint8Array.length === 0) {
              throw new Error('Failed to convert PDF to Uint8Array');
            }
            
            // Check PDF header signature (should start with %PDF-)
            const headerBytes = uint8Array.slice(0, 5);
            const headerString = String.fromCharCode.apply(null, Array.from(headerBytes));
            if (!headerString.startsWith('%PDF')) {
              console.warn('File does not appear to be a valid PDF (missing %PDF header)');
              throw new Error('File does not appear to be a valid PDF format');
            }
            
            console.log('PDF header validated:', headerString);
            
            // ROBUST ERROR HANDLING: Wrap getDocument in try-catch
            let loadingTask;
            try {
              // Pass data as Uint8Array with proper configuration
              loadingTask = pdfjsLib.getDocument({
                data: uint8Array,
                // Add configuration to handle edge cases
                useSystemFonts: true,
                verbosity: 0, // Reduce console noise
                disableFontFace: false,
                // Handle password-protected PDFs gracefully
                password: ''
              });
            } catch (loadError) {
              console.error('Error creating PDF loading task:', loadError);
              throw new Error(`Failed to initialize PDF parser: ${loadError instanceof Error ? loadError.message : 'Unknown error'}`);
            }
            
            // Validate loadingTask is a proper object
            if (typeof loadingTask !== 'object' || loadingTask === null) {
              throw new Error('PDF loader returned invalid object - library may be misconfigured');
            }
            
            // Load PDF document with timeout
            const pdf = await Promise.race([
              loadingTask.promise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('PDF loading timeout (30s)')), 30000)
              )
            ]) as any;
            
            // Validate PDF object
            if (typeof pdf !== 'object' || pdf === null) {
              throw new Error('PDF document loaded but returned invalid object');
            }
            
            if (!pdf.numPages || pdf.numPages < 1) {
              throw new Error('PDF has no pages or invalid page count');
            }
            
            let fullText = '';
            
            console.log(`Processing PDF: ${pdf.numPages} total pages - processing ALL pages`);
            
            // Process ALL pages - no limit
            for (let i = 1; i <= pdf.numPages; i++) {
              console.log(`Processing page ${i} of ${pdf.numPages}`);
              try {
                const page = await pdf.getPage(i);
                
                // Validate page object
                if (typeof page !== 'object' || page === null) {
                  throw new Error(`Page ${i} returned invalid object`);
                }
                
                const textContent = await page.getTextContent();
                
                // Validate textContent object
                if (typeof textContent !== 'object' || textContent === null || !Array.isArray(textContent.items)) {
                  console.warn(`Page ${i} has invalid text content structure`);
                  fullText += `\n--- Page ${i} ---\n[Unable to extract text - invalid content structure]\n`;
                  continue;
                }
                
                const pageText = textContent.items
                  .map((item: any) => {
                    // Defensive check: ensure item has str property
                    if (item && typeof item === 'object' && typeof item.str === 'string') {
                      return item.str;
                    }
                    return '';
                  })
                  .join(' ')
                  .trim();
                
                if (pageText) {
                  fullText += `\n--- Page ${i} ---\n${pageText}\n`;
                } else {
                  fullText += `\n--- Page ${i} ---\n[No readable text found on this page - may be image-based]\n`;
                }
              } catch (pageError) {
                console.error(`Error processing page ${i}:`, pageError);
                const errorMessage = pageError instanceof Error ? pageError.message : 'Unknown error';
                fullText += `\n--- Page ${i} ---\n[Error reading page: ${errorMessage}]\n`;
              }
            }
            
            console.log(`PDF processing complete. Extracted ${fullText.length} characters from ${pdf.numPages} pages.`);
            console.log('Sample extracted text:', fullText.substring(0, 200) + '...');
            
            // FALLBACK HANDLING: Provide helpful guidance based on extraction results
            if (fullText.trim().length < 100) {
              console.warn('PDF has very little text content - might be image-based or scanned');
              resolve(`[PDF FILE: ${file.name}]\n\n⚠️ This PDF appears to contain mostly images or has very little readable text.\n\nPossible reasons:\n• Scanned document (requires OCR)\n• Image-based PDF without text layer\n• Encrypted or protected content\n• Corrupted text encoding\n\nWorkarounds:\n1. Open the PDF in Adobe Acrobat and export as Word or plain text\n2. Use OCR software (Adobe Acrobat, ABBYY FineReader) if it's a scanned document\n3. Copy and paste the text content directly into the chat\n4. Save the PDF from its source application to ensure proper text encoding\n\nExtracted text preview: "${fullText.trim().substring(0, 200) || '[No text found]'}"`);
            } else {
              resolve(`[PDF FILE: ${file.name}]\n\nSuccessfully extracted content from PDF (${pdf.numPages} pages):\n${fullText}`);
            }
          } catch (error) {
            console.error('PDF processing error:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            // DETAILED ERROR REPORTING: Provide specific guidance based on error type
            let errorDetails = '';
            let suggestions = '';
            
            if (errorMessage.toLowerCase().includes('worker')) {
              errorDetails = ' This appears to be a PDF.js worker loading issue.';
              suggestions = '\n\nTry refreshing the page or clearing your browser cache.';
            } else if (errorMessage.toLowerCase().includes('invalid pdf') || errorMessage.toLowerCase().includes('pdf header')) {
              errorDetails = ' The file does not appear to be a valid PDF format.';
              suggestions = '\n\nPlease verify:\n• The file is actually a PDF (not renamed from another format)\n• The file is not corrupted\n• The file was properly downloaded/transferred';
            } else if (errorMessage.toLowerCase().includes('password') || errorMessage.toLowerCase().includes('encrypted')) {
              errorDetails = ' The PDF appears to be password-protected or encrypted.';
              suggestions = '\n\nPlease:\n• Remove password protection in Adobe Acrobat or another PDF editor\n• Or copy and paste the text content directly';
            } else if (errorMessage.toLowerCase().includes('timeout')) {
              errorDetails = ' The PDF took too long to process (may be too large or complex).';
              suggestions = '\n\nTry:\n• Using a smaller or simpler PDF\n• Splitting the PDF into smaller sections\n• Copying and pasting the text directly';
            } else if (errorMessage.toLowerCase().includes('object') || errorMessage.toLowerCase().includes('defineproperty')) {
              errorDetails = ' The PDF has an incompatible internal structure that our parser cannot handle.';
              suggestions = '\n\nRecommended solutions:\n1. Open the PDF in Adobe Acrobat and export as Word (.docx)\n2. Open the PDF and use "Save As" to create a new copy\n3. Copy the text and paste it directly into the chat\n4. Use an online PDF-to-text converter';
            }
            
            resolve(`[PDF FILE: ${file.name}]\n\n❌ PDF text extraction failed\n\nError: ${errorMessage}${errorDetails}${suggestions}\n\n📋 Alternative options:\n• Upload the document as Word (.docx) format if possible\n• Copy and paste the PDF text directly into the chat\n• I can still provide general guidance about PDF document analysis\n\nNote: Word documents (.docx) work more reliably because they use a structured XML format, while PDFs are designed for visual layout and can have complex encoding, embedded fonts, or image-based content that makes text extraction difficult.`);
          }
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   file.type === 'application/msword' ||
                   file.name.toLowerCase().endsWith('.docx') ||
                   file.name.toLowerCase().endsWith('.doc')) {
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
      
      // Read as ArrayBuffer for PDFs and Word docs, text for others
      if (file.type === 'application/pdf' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'application/msword' ||
          file.name.toLowerCase().endsWith('.docx') ||
          file.name.toLowerCase().endsWith('.doc')) {
        reader.readAsArrayBuffer(file); // We'll handle this in onload
      } else {
        reader.readAsText(file);
      }
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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
            onChange={(e) => {
              setMessage(e.target.value);
              // Firefox-compatible auto-resize
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
            onKeyPress={handleKeyPress}
            onKeyDown={handleKeyDown}
            placeholder="Ask a legal question, request document analysis, or get help with legal matters..."
            disabled={disabled}
            rows={1}
            className="w-full px-0 py-2 border-none resize-none focus:outline-none text-gray-800 placeholder-gray-500"
            style={{ minHeight: '24px', maxHeight: '120px' }}
          />
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl">
          <div className="flex items-center space-x-3">
            {/* File Upload Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={disabled}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-law-blue hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50 border border-transparent hover:border-blue-200"
              title="Upload documents for analysis"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="font-medium">Upload Files</span>
            </button>
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }}
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

        {/* Internal Use Notice */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            Internal Assistant • For Dorf Nelson & Zauderer staff use only • Confidential work product
          </p>
        </div>
      </div>
    </div>
  );
}