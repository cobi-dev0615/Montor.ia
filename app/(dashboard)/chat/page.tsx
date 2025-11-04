import { ChatInterface } from '@/components/chat/ChatInterface'

export default function ChatPage() {
  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Chat with Mentor</h1>
        <p className="text-gray-600 mt-1">Get guidance and support from your AI mentor</p>
      </div>
      <div className="h-[calc(100vh-12rem)]">
        <ChatInterface />
      </div>
    </div>
  )
}
