import { MessageItem } from './MessageItem'

interface MessageListProps {
  messages: Array<{
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    created_at: string
  }>
  userName?: string | null
}

export function MessageList({ messages, userName }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Bem-vindo ao Mentor.ai
          </h3>
          <p className="text-gray-600">
            Em que você gostaria de trabalhar hoje?
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} userName={userName} />
      ))}
    </div>
  )
}
