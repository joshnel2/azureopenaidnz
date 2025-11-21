import ChatWindow from '@/components/ChatWindow';

export default function Home() {
  return (
    <main className="h-screen bg-white flex flex-col">
      {/* Minimal Top Bar - ChatGPT Style */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-law-blue to-law-blue-dark rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DNZ</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Dorf Nelson & Zauderer Confidential AI Assistant</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <a 
                href="https://dnzlarge-f3fwhzf5fpfhbygb.canadacentral-01.azurewebsites.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-law-blue hover:bg-law-blue-dark text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <span>Upload Larger Documents →</span>
              </a>
              <a 
                href="https://dnzlarge-f3fwhzf5fpfhbygb.canadacentral-01.azurewebsites.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <span>⚡ For Faster Responses →</span>
              </a>
              <a 
                href="https://redlineai-fpb4c6b7f2dwcxh5.canadacentral-01.azurewebsites.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <span>Redline Documents</span>
              </a>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Chat - ChatGPT Style */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow />
      </div>
    </main>
  );
}