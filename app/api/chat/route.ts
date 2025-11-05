import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getChatCompletion } from '@/lib/openai/client'

// Helper function to detect keywords in user message
function detectKeyword(message: string): 'completed' | 'couldnt' | 'adjust' | null {
  const lowerMessage = message.toLowerCase().trim()
  
  // Check for "completed" variants
  if (
    lowerMessage === 'completed' ||
    lowerMessage === 'complete' ||
    lowerMessage === 'done' ||
    lowerMessage === 'finished' ||
    lowerMessage.startsWith('i completed') ||
    lowerMessage.startsWith('i finished') ||
    lowerMessage.startsWith('i did it')
  ) {
    return 'completed'
  }

  // Check for "couldn't do it" variants
  if (
    lowerMessage === "couldn't do it" ||
    lowerMessage === "couldn't" ||
    lowerMessage === "could not" ||
    lowerMessage === "can't" ||
    lowerMessage === "cant" ||
    lowerMessage.startsWith("i couldn't") ||
    lowerMessage.startsWith("i can't") ||
    lowerMessage.startsWith("i didn't") ||
    lowerMessage.startsWith("i failed") ||
    lowerMessage.includes("couldn't do")
  ) {
    return 'couldnt'
  }

  // Check for "adjust" variants
  if (
    lowerMessage === 'adjust' ||
    lowerMessage === 'change' ||
    lowerMessage === 'modify' ||
    lowerMessage.startsWith('i need to adjust') ||
    lowerMessage.startsWith('can you adjust') ||
    lowerMessage.startsWith('please adjust') ||
    lowerMessage.includes('adjust the')
  ) {
    return 'adjust'
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const { message, goalId } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get Supabase client
    const supabase = await createSupabaseServerClient()

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user context (progress, streak, name)
    const { data: userData } = await supabase
      .from('users')
      .select('total_progress, consistency_streak, full_name')
      .eq('id', user.id)
      .single()

    const userName = userData?.full_name || 'there'

    // Get goal and plan details if goalId is provided
    let currentGoal: string | undefined
    let planContext: any = null
    let currentAction: any = null
    let currentMilestone: any = null

    if (goalId) {
      const { data: goal } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .single()

      if (goal) {
        currentGoal = goal.main_goal

        // Get milestones
        const { data: milestones } = await supabase
          .from('milestones')
          .select('*')
          .eq('goal_id', goal.id)
          .eq('is_deleted', false)
          .order('order_index', { ascending: true })

        // Get pending actions (prioritize first pending action)
        if (milestones && milestones.length > 0) {
          for (const milestone of milestones) {
            const { data: actions } = await supabase
              .from('actions')
              .select('*')
              .eq('milestone_id', milestone.id)
              .eq('status', 'pending')
              .eq('is_deleted', false)
              .order('created_at', { ascending: true })
              .limit(1)

            if (actions && actions.length > 0) {
              currentAction = actions[0]
              currentMilestone = milestone
              break
            }
          }

          planContext = {
            milestones: milestones.map(m => ({
              title: m.title,
              description: m.description,
              status: m.status,
              order: m.order_index,
            })),
            currentMilestone: currentMilestone ? {
              title: currentMilestone.title,
              description: currentMilestone.description,
            } : null,
            currentAction: currentAction ? {
              title: currentAction.title,
              description: currentAction.description,
            } : null,
          }
        }
      }
    }

    // Detect keyword before processing
    const keyword = detectKeyword(message)
    let progressLogResult: any = null
    let systemMessageOverride: string | null = null

    // Handle keyword-based actions BEFORE saving message
    if (keyword === 'completed' && goalId && currentAction) {
      // Log progress (internal API call)
      try {
        const progressRequest = new NextRequest(new URL('/api/progress', request.url), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action_id: currentAction.id,
            milestone_id: currentMilestone?.id,
            goal_id: goalId,
            progress_type: 'action',
            points_earned: 5,
          }),
        })

        // Import and call progress route handler
        const { POST: progressHandler } = await import('@/app/api/progress/route')
        const progressResponse = await progressHandler(progressRequest)
        
        if (progressResponse.ok) {
          progressLogResult = await progressResponse.json()
        }
      } catch (progressError) {
        console.error('Error logging progress:', progressError)
        // Continue even if progress logging fails
      }

      // Set system message override for completion
      systemMessageOverride = `The user has just completed today's action successfully: "${currentAction.title}".

Acknowledge their effort warmly, reinforce discipline, and suggest the next micro-action from the plan.

IMPORTANT: Always end your response with a clear practical action in this format:
"Practical action — [specific action] and [additional instruction]."

The action should be the NEXT pending action from the plan, or if all actions in current milestone are done, move to the next milestone.`
    } else if (keyword === 'couldnt' && goalId) {
      // Update action status to reflect postponement
      if (currentAction) {
        // We could mark it as skipped or leave it pending for later
        // For now, we'll leave it pending but log the attempt
        await supabase
          .from('progress_logs')
          .insert({
            user_id: user.id,
            action_id: currentAction.id,
            milestone_id: currentMilestone?.id || null,
            goal_id: goalId,
            progress_type: 'action',
            points_earned: 0, // No points for couldn't do it
            is_deleted: false,
          })
          .catch(err => console.error('Error logging action attempt:', err))
      }

      // Set system message override for couldn't do it
      systemMessageOverride = `The user could not complete the assigned action: "${currentAction?.title || 'the action'}".

Respond with empathy and understanding. Ask with compassion why they couldn't do it, analyze possible obstacles, and propose an easier or alternative action that keeps momentum.

Be gentle but encouraging. Never judge. Focus on understanding and adapting.

After discussing obstacles, propose ONE simpler alternative action.

IMPORTANT: Always end your response with a clear practical action in this format:
"Practical action — [easier/alternative action] and [reflection instruction]."

The new action should be simpler than the original.`
    } else if (keyword === 'adjust' && goalId) {
      // Set system message override for adjust
      systemMessageOverride = `The user requested to adjust the current micro-action: "${currentAction?.title || 'the action'}".

Ask 1-2 clarifying questions about:
- What specifically needs to change? (time, difficulty, context)
- What would work better for them?

Then propose ONE updated micro-action that:
- Remains aligned with the main goal: "${currentGoal}"
- Fits within the current milestone: "${currentMilestone?.title}"
- Is still achievable and specific

IMPORTANT: 
1. Keep it brief - ask questions, then propose the adjusted action
2. Always end with: "Practical action — [adjusted action]. Does this work for you?"
3. When proposing the adjustment, format it clearly so the system can extract it

After proposing the adjustment, ask the user to confirm.`
    }

    // Save user message to database
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        goal_id: goalId || null,
        role: 'user',
        content: message,
        is_deleted: false,
      })

    if (messageError) {
      console.error('Error saving user message:', messageError)
      // Continue even if message save fails
    }

    // Get recent message history (last 10 messages for context)
    // RLS policy automatically filters out deleted messages (is_deleted = FALSE)
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('user_id', user.id)
      .eq('goal_id', goalId || null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10)

    // Count conversation turns (user messages) to detect when to refocus
    const userMessageCount = (recentMessages || []).filter(m => m.role === 'user').length

    // Reverse to get chronological order
    const messageHistory = (recentMessages || [])
      .reverse()
      .map((m) => ({ 
        role: m.role as 'user' | 'assistant' | 'system', 
        content: m.content 
      }))

    // Build plan context string for OpenAI
    let planContextString = ''
    if (planContext && planContext.currentAction) {
      const shouldAskForStatus = userMessageCount >= 3 && !keyword
      
      planContextString = `\n\nCurrent Plan Context:
- Goal: "${currentGoal}"
- Current Milestone: "${planContext.currentMilestone?.title}"
- Today's Action: "${planContext.currentAction.title}"
${planContext.currentAction.description ? `- Action Description: ${planContext.currentAction.description}` : ''}
- Conversation turns: ${userMessageCount}

${shouldAskForStatus ? '⚠️ URGENT: You MUST ask about action completion status NOW. The user has sent ' + userMessageCount + ' messages. Ask: "Have you completed today\'s action? Respond with \'Completed\', \'Couldn\'t do it\', or \'Adjust\'."' : 'IMPORTANT: Guide the conversation toward completing this action. Keep it focused and goal-oriented.'}

Regularly check in on progress and reference the plan.`

      // If no keyword detected but we have a plan, guide the conversation strictly
      if (!keyword && planContext.currentAction) {
        systemMessageOverride = `You are a goal-oriented mentor helping the user complete their action: "${planContext.currentAction.title}".

CRITICAL RULES:
1. Keep the conversation focused ONLY on this action and the user's goal
2. After 2-3 exchanges, you MUST ask: "Have you completed today's action? Respond with 'Completed', 'Couldn't do it', or 'Adjust'."
3. Do NOT engage in general conversation - redirect any off-topic messages back to the action
4. If the user tries to discuss unrelated topics, politely redirect: "Let's focus on your action: [action title]. How can we help you complete it?"
5. Keep responses concise (2-3 sentences max)
6. Always end with a question about the action's progress

CONVERSATION FLOW:
- Exchange 1-2: Discuss approach, obstacles, motivation for the action
- Exchange 3+: Ask directly about completion status
- Never continue beyond 5 exchanges without checking action status

IMPORTANT: If the conversation has been going for more than 3 exchanges, you MUST ask:
"Before we continue, let's check on your action: Have you completed '${planContext.currentAction.title}'? You can say 'Completed', 'Couldn't do it', or 'Adjust'."`
      }
    }

    // Get AI response from OpenAI with plan context
    const aiResponse = await getChatCompletion(
      messageHistory,
      {
        currentGoal,
        progressPoints: userData?.total_progress || 0,
        consistencyStreak: userData?.consistency_streak || 0,
        planContext: planContextString,
        systemMessageOverride,
        userName,
      }
    )

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: 500 }
      )
    }

    // Save AI response to database
    const { error: aiMessageError } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        goal_id: goalId || null,
        role: 'assistant',
        content: aiResponse,
      })

    if (aiMessageError) {
      console.error('Error saving AI message:', aiMessageError)
      // Continue even if message save fails
    }

    return NextResponse.json({ 
      response: aiResponse,
      success: true,
      progressUpdate: progressLogResult ? {
        total_progress: progressLogResult.userProgress?.total_progress,
        consistency_streak: progressLogResult.userProgress?.consistency_streak,
        avatar_level: progressLogResult.userProgress?.avatar_level,
        avatar_stage: progressLogResult.userProgress?.avatar_stage,
        avatarEvolved: progressLogResult.avatarEvolved,
        pointsEarned: 5,
      } : null,
      keywordDetected: keyword,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    
    // Handle OpenAI API errors
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

