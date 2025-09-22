import ChatWindow from '@/components/ChatWindow';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Professional Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-law-blue to-law-blue-dark rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">DNZ</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dorf Nelson & Zauderer</h1>
                <p className="text-sm text-gray-600 font-medium">Legal Assistant • Corporate • Litigation • Real Estate</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Available 24/7</span>
              </div>
              <div className="text-law-blue font-medium">AI-Powered Legal Guidance</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="max-w-[90vw] xl:max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden backdrop-blur-sm">
          <ChatWindow />
        </div>
      </div>

      {/* Professional Footer */}
      <div className="mt-8 text-center text-sm text-gray-500 pb-6">
        <p>© 2024 Dorf Nelson & Zauderer. This AI assistant provides general legal information only.</p>
        <p className="mt-1">Always consult with a qualified attorney for personalized legal advice.</p>
      </div>
    </main>
  );
}