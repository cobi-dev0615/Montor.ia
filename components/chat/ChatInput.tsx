'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || disabled) return

    const content = message.trim()
    setMessage('')

    // onSend is handled asynchronously in the parent component
    onSend(content)
  }

  return (
    <div className="border-t border-gray-200 p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !disabled) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          placeholder="Type your message..."
          rows={2}
          disabled={disabled}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none custom-scrollbar disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <Button type="submit" disabled={!message.trim() || disabled}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
