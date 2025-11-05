import { format } from 'date-fns'

interface MessageItemProps {
  message: {
    role: 'user' | 'assistant' | 'system'
    content: string
    created_at: string
  }
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-3 max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">🤖</span>
          </div>
        )}
        <div className="flex flex-col">
          <div
            className={`rounded-2xl px-4 py-2 ${
              isUser
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-100'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
        </div>
      </div>
    </div>
  )
}
