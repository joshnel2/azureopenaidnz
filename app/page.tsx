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
                <h1 className="text-lg font-semibold text-gray-900">Dorf Nelson & Zauderer Confidential Legal Assistant</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>Online</span>
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