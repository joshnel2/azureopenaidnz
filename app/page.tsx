import ChatWindow from '@/components/ChatWindow';

export default function Home() {
  return (
    <main className="h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col">
      {/* Modern Top Bar with Enhanced Design */}
      <div className="flex-shrink-0 backdrop-blur-xl bg-white/80 border-b border-gray-200/50 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Brand Section */}
            <div className="flex items-center space-x-4 min-w-fit">
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-white">
                  <span className="text-white font-bold text-base">DNZ</span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">DNZ Legal AI</h1>
                <p className="text-xs text-gray-500 font-medium">Confidential Assistant</p>
              </div>
            </div>

            {/* Action Buttons - Modern Card Style */}
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <a 
                href="https://dnzlarge-f3fwhzf5fpfhbygb.canadacentral-01.azurewebsites.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Upload Large Files</span>
                <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </a>
              
              <a 
                href="https://dnzlarge-f3fwhzf5fpfhbygb.canadacentral-01.azurewebsites.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-sm font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <span>Faster Responses</span>
                <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </a>
              
              <a 
                href="https://redlineai-fpb4c6b7f2dwcxh5.canadacentral-01.azurewebsites.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative px-4 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-sm font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Redline Docs</span>
                <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </a>
              
              <a 
                href="https://coworkdnz-akhcdhfkdtffhnhb.canadacentral-01.azurewebsites.net/plain-language"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <span>More Tools</span>
                <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Chat */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow />
      </div>
    </main>
  );
}