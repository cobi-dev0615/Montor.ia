'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ChatHeader } from './ChatHeader'
import { useSearchParams } from 'next/navigation'

export function ChatInterface() {
  const searchParams = useSearchParams()
  const goalId = searchParams.get('goalId')
  const [messages, setMessages] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // TODO: Fetch message history from Supabase
    // TODO: Set up real-time subscription
  }, [goalId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (content: string) => {
    // TODO: Send message via API
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm">
      <ChatHeader goalId={goalId || undefined} />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} />
    </div>
  )
}
