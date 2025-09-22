import ChatWindow from '@/components/ChatWindow';

export default function Home() {
  return (
    <main className="h-screen bg-gray-50">
      <div className="h-full max-w-4xl mx-auto bg-white shadow-lg">
        <ChatWindow />
      </div>
    </main>
  );
}