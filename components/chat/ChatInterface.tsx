'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ChatHeader } from './ChatHeader'
import { ProgressUpdateToast } from './ProgressUpdateToast'
import { useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export function ChatInterface() {
  const searchParams = useSearchParams()
  const goalId = searchParams.get('goalId')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressUpdate, setProgressUpdate] = useState<any>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createSupabaseClient()

  // Listen for progress updates
  useEffect(() => {
    const handleProgressUpdate = (event: CustomEvent) => {
      setProgressUpdate(event.detail)
    }

    window.addEventListener('progressUpdate', handleProgressUpdate as EventListener)
    return () => {
      window.removeEventListener('progressUpdate', handleProgressUpdate as EventListener)
    }
  }, [])

  // Fetch user name and message history on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch user name
        const { data: userData } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single()

        if (userData?.full_name) {
          setUserName(userData.full_name)
        } else {
          setUserName(user.email?.split('@')[0] || 'Usuário')
        }

        // Fetch messages
        const query = supabase
          .from('messages')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_deleted', false)  // Only fetch non-deleted messages
          .order('created_at', { ascending: true })

        if (goalId) {
          query.eq('goal_id', goalId)
        }

        const { data, error: fetchError } = await query

        if (fetchError) {
          console.error('Error fetching messages:', fetchError)
          return
        }

        if (data) {
          setMessages(data as Message[])
        }
      } catch (err) {
        console.error('Error fetching messages:', err)
      }
    }

    fetchUserData()
  }, [goalId, supabase])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (content: string) => {
    if (!content.trim() || loading) return

    setLoading(true)
    setError(null)

    // Optimistically add user message
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      // Send message to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          goalId: goalId || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao enviar mensagem')
      }

      const data = await response.json()

      // Add assistant response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Handle progress update if keyword was detected
      if (data.progressUpdate) {
        setProgressUpdate(data.progressUpdate)
        // Trigger progress update event for parent components
        window.dispatchEvent(new CustomEvent('progressUpdate', {
          detail: data.progressUpdate
        }))
      }

      // Refresh messages from database to get actual IDs
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Ensure userName is set if not already
        if (!userName) {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', user.id)
            .single()

          if (userData?.full_name) {
            setUserName(userData.full_name)
          } else {
            setUserName(user.email?.split('@')[0] || 'Usuário')
          }
        }

        const query = supabase
          .from('messages')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_deleted', false)  // Only fetch non-deleted messages
          .order('created_at', { ascending: true })

        if (goalId) {
          query.eq('goal_id', goalId)
        }

        const { data: updatedMessages } = await query
        if (updatedMessages) {
          setMessages(updatedMessages as Message[])
        }
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Falha ao enviar mensagem')
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full glass-card rounded-lg border border-[rgba(0,212,255,0.3)] shadow-[0_0_30px_rgba(0,212,255,0.2)]">
      <ChatHeader goalId={goalId || undefined} />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Inicie uma conversa com seu mentor de IA...</p>
          </div>
        )}
        <MessageList messages={messages} userName={userName} />
        {loading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm mt-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
            <span>Mentor está pensando...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={loading} />
      
      {/* Progress Update Toast */}
      {progressUpdate && (
        <ProgressUpdateToast
          progressUpdate={progressUpdate}
          onClose={() => setProgressUpdate(null)}
        />
      )}
    </div>
  )
}
