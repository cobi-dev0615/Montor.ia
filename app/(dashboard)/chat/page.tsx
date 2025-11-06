'use client'

import { useEffect, useState } from 'react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'

export default function ChatPage() {
  const searchParams = useSearchParams()
  const goalId = searchParams.get('goalId')
  const [hasCheckedInitialMessage, setHasCheckedInitialMessage] = useState(false)
  const supabase = createSupabaseClient()

  useEffect(() => {
    // Check if we need to send initial message after plan generation
    const checkAndSendInitialMessage = async () => {
      if (!goalId || hasCheckedInitialMessage) return

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Check if there are any messages for this goal
        const { data: existingMessages } = await supabase
          .from('messages')
          .select('id')
          .eq('user_id', user.id)
          .eq('goal_id', goalId)
          .eq('is_deleted', false)
          .limit(1)

        // If no messages exist, check if plan exists and send initial message
        if (!existingMessages || existingMessages.length === 0) {
          // Check if milestones exist (plan was generated)
          const { data: milestones } = await supabase
            .from('milestones')
            .select('id')
            .eq('goal_id', goalId)
            .eq('is_deleted', false)
            .limit(1)

          if (milestones && milestones.length > 0) {
            // Send initial message from Mentor
            const response = await fetch(`/api/goals/${goalId}/initial-message`, {
              method: 'POST',
            })

            if (response.ok) {
              // Refresh page to show the message
              window.location.reload()
            }
          }
        }
      } catch (error) {
        console.error('Error checking initial message:', error)
      } finally {
        setHasCheckedInitialMessage(true)
      }
    }

    checkAndSendInitialMessage()
  }, [goalId, hasCheckedInitialMessage, supabase])

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-4xl h-full">
        <ChatInterface />
      </div>
    </div>
  )
}
