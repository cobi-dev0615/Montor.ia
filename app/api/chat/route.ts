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
    const { message, goalId: goalIdParam } = await request.json()
    let goalId = goalIdParam

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

    // Get goal and plan details - check all user goals if no goalId provided
    let currentGoal: string | undefined
    let planContext: any = null
    let currentAction: any = null
    let currentMilestone: any = null
    let userGoalsStatus: any = null
    let systemMessageOverride: string | null = null

    // If no goalId provided, check all user goals to understand their status
    if (!goalId) {
      const { data: allGoals } = await supabase
        .from('goals')
        .select('id, title, main_goal, status')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (allGoals && allGoals.length > 0) {
        // Check which goals have plans (milestones)
        const goalsWithPlans: any[] = []
        const goalsWithoutPlans: any[] = []

        for (const goal of allGoals) {
          const { data: milestones } = await supabase
            .from('milestones')
            .select('id')
            .eq('goal_id', goal.id)
            .eq('is_deleted', false)
            .limit(1)

          if (milestones && milestones.length > 0) {
            goalsWithPlans.push(goal)
          } else {
            goalsWithoutPlans.push(goal)
          }
        }

        userGoalsStatus = {
          totalGoals: allGoals.length,
          goalsWithPlans: goalsWithPlans.length,
          goalsWithoutPlans: goalsWithoutPlans.length,
          goalsWithoutPlansList: goalsWithoutPlans.map(g => ({ id: g.id, title: g.title, main_goal: g.main_goal })),
        }

        // If user has goals but no plans, prompt them to create a plan
        if (goalsWithoutPlans.length > 0 && goalsWithPlans.length === 0) {
          systemMessageOverride = `The user has ${goalsWithoutPlans.length} active goal(s) but hasn't created a plan yet.

IMPORTANT: Your response MUST:
1. Acknowledge their goal(s): ${goalsWithoutPlans.map(g => `"${g.title}" - ${g.main_goal}`).join(', ')}
2. Explain that to make progress, they need to create a structured plan
3. Direct them to the Goals page: "Please go to the Goals page and click 'Generate Plan with Mentor' for your goal(s). This will create a step-by-step plan to help you achieve your goal."
4. Be encouraging and supportive
5. Keep your response concise (3-4 sentences max)

DO NOT engage in general conversation. Focus ONLY on guiding them to create a plan.`
        } else if (goalsWithPlans.length > 0) {
          // User has plans - use the first goal with a plan
          const goalWithPlan = goalsWithPlans[0]
          goalId = goalWithPlan.id
        }
      } else {
        // User has no goals at all
        systemMessageOverride = `The user doesn't have any active goals yet.

IMPORTANT: Your response MUST:
1. Ask them what they'd like to achieve
2. Encourage them to create a goal on the Goals page
3. Explain that you'll help them create a plan once they set a goal
4. Be warm and motivating
5. Keep your response concise (3-4 sentences max)

DO NOT engage in general conversation. Focus on helping them get started with goal setting.`
      }
    }

    // If goalId is available (from parameter or from goalsWithPlans), fetch plan details
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

          // Calculate progress statistics
          const totalMilestones = milestones.length
          const completedMilestones = milestones.filter(m => m.status === 'completed').length
          
          // Get all actions for all milestones
          const allActionsPromises = milestones.map(async (m) => {
            const { count: total } = await supabase
              .from('actions')
              .select('*', { count: 'exact', head: true })
              .eq('milestone_id', m.id)
              .eq('is_deleted', false)
            
            const { count: completed } = await supabase
              .from('actions')
              .select('*', { count: 'exact', head: true })
              .eq('milestone_id', m.id)
              .eq('status', 'completed')
              .eq('is_deleted', false)
            
            return { total: total || 0, completed: completed || 0 }
          })
          
          const allActionsResults = await Promise.all(allActionsPromises)
          const totalActionsCount = allActionsResults.reduce((acc, r) => acc + r.total, 0)
          const completedActionsCount = allActionsResults.reduce((acc, r) => acc + r.completed, 0)

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
            progress: {
              milestonesCompleted: completedMilestones,
              totalMilestones,
              actionsCompleted: completedActionsCount,
              totalActions: totalActionsCount,
            },
          }
        } else {
          // Goal exists but no plan yet
          systemMessageOverride = `The user has a goal "${goal.title}" (${goal.main_goal}) but hasn't created a plan yet.

IMPORTANT: Your response MUST:
1. Acknowledge their goal: "${goal.title}" - ${goal.main_goal}
2. Explain that to make progress, they need to create a structured plan
3. Direct them: "Please go to the Goals page, select your goal '${goal.title}', and click 'Generate Plan with Mentor'. This will create a step-by-step plan to help you achieve your goal."
4. Be encouraging and supportive
5. Keep your response concise (3-4 sentences max)

DO NOT engage in general conversation. Focus ONLY on guiding them to create a plan.`
        }
      }
    }

    // Detect keyword before processing
    const keyword = detectKeyword(message)
    let progressLogResult: any = null

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

YOUR RESPONSE:
1. Celebrate their achievement warmly and genuinely: "That's fantastic! You did it!"
2. Acknowledge their progress: "You're making great progress toward your goal"
3. If there's a next action, introduce it naturally: "Great work! Now, for your next step: [next action]"
4. Be encouraging and supportive
5. Keep it conversational (3-4 sentences)

IMPORTANT: 
- Be genuinely celebratory - this is a moment of achievement
- Don't rush to the next action - let them feel the accomplishment
- If introducing next action, do it naturally: "When you're ready, your next step is..."
- End with encouragement, not a command`
    } else if (keyword === 'couldnt' && goalId) {
      // Update action status to reflect postponement
      if (currentAction) {
        // We could mark it as skipped or leave it pending for later
        // For now, we'll leave it pending but log the attempt
        try {
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
        } catch (err) {
          console.error('Error logging action attempt:', err)
        }
      }

      // Set system message override for couldn't do it
      systemMessageOverride = `The user couldn't complete the action: "${currentAction?.title || 'the action'}".

YOUR RESPONSE:
1. Respond with empathy and understanding: "That's okay, let's figure out what happened"
2. Ask gently: "What made it difficult for you?" or "What obstacles did you face?"
3. Listen and understand - don't judge
4. After understanding, suggest a simpler approach or alternative naturally
5. Be encouraging: "Let's try a different approach that works better for you"
6. Keep it supportive and conversational (4-5 sentences)

IMPORTANT:
- Be compassionate and non-judgmental
- Focus on understanding, not blaming
- Help them find a way forward that works for them
- Propose alternatives naturally, not as commands
- End with encouragement and a gentle suggestion, not a directive`
    } else if (keyword === 'adjust' && goalId) {
      // Set system message override for adjust
      systemMessageOverride = `The user wants to adjust the action: "${currentAction?.title || 'the action'}".

YOUR RESPONSE:
1. Acknowledge their request: "Of course, let's adjust it to work better for you"
2. Ask 1-2 clarifying questions naturally:
   - "What specifically needs to change? (time, difficulty, schedule)"
   - "What would work better for your situation?"
3. Listen to their response, then propose an adjusted action that:
   - Stays aligned with their goal: "${currentGoal}"
   - Fits their current situation
   - Is still achievable
4. Present it conversationally: "How about we try this instead: [adjusted action]"
5. Ask for their input: "Does this work better for you?" or "What do you think?"

IMPORTANT:
- Be collaborative, not directive
- Work WITH them to find the right adjustment
- Present the adjusted action as a suggestion, not a command
- Keep it conversational and supportive (4-5 sentences)
- Make sure they feel heard and involved in the process`
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
      const progressPercent = planContext.progress.totalActions > 0 
        ? Math.round((planContext.progress.actionsCompleted / planContext.progress.totalActions) * 100)
        : 0
      
      planContextString = `\n\nCurrent Plan Context:
- Goal: "${currentGoal}"
- Progress: ${planContext.progress.milestonesCompleted}/${planContext.progress.totalMilestones} milestones completed, ${planContext.progress.actionsCompleted}/${planContext.progress.totalActions} actions completed (${progressPercent}%)
- Current Milestone: "${planContext.currentMilestone?.title}"
- Today's Action: "${planContext.currentAction.title}"
${planContext.currentAction.description ? `- Action Description: ${planContext.currentAction.description}` : ''}
- Conversation turns: ${userMessageCount}

Your role is to NATURALLY guide the user toward completing this action. Be supportive, helpful, and conversational. Only check completion status after having a meaningful conversation about the action.`

      // If no keyword detected but we have a plan, guide the conversation naturally
      if (!keyword && planContext.currentAction && !systemMessageOverride) {
        // Determine conversation stage based on message count
        const conversationStage = userMessageCount <= 1 ? 'initial' : 
                                 userMessageCount <= 4 ? 'guiding' : 
                                 userMessageCount <= 7 ? 'checking' : 'evaluating'
        
        if (conversationStage === 'initial') {
          systemMessageOverride = `You are a supportive, goal-oriented mentor helping the user work toward their goal: "${currentGoal}".

CURRENT SITUATION:
- User's progress: ${progressPercent}% complete (${planContext.progress.actionsCompleted}/${planContext.progress.totalActions} actions done)
- Current milestone: "${planContext.currentMilestone?.title}"
- Today's action: "${planContext.currentAction.title}"

YOUR APPROACH:
1. Start by warmly acknowledging their progress: "You're ${progressPercent}% of the way there - that's wonderful progress!"
2. Introduce today's action naturally: "Today, let's focus on: ${planContext.currentAction.title}"
3. Ask if they understand what this action involves or if they need clarification
4. Be conversational and supportive - this is the FIRST exchange about this action
5. Keep your response to 3-4 sentences
6. End with an open question like: "Does this action make sense to you?" or "What questions do you have about getting started?"

IMPORTANT: 
- DO NOT ask about completion status yet - we're just starting
- DO NOT rush to evaluation
- Focus on understanding and preparation
- Be warm, encouraging, and natural`
        } else if (conversationStage === 'guiding') {
          systemMessageOverride = `You are a supportive mentor guiding the user through their action: "${planContext.currentAction.title}".

CONTEXT:
- Goal: "${currentGoal}"
- Progress: ${progressPercent}% complete
- Current milestone: "${planContext.currentMilestone?.title}"
- Action: "${planContext.currentAction.title}"

YOUR ROLE:
1. Help the user understand HOW to do this action
2. If they seem confused or unfamiliar, explain the action step-by-step
3. Offer encouragement and address any concerns or obstacles
4. Suggest practical tips or strategies if relevant
5. Keep the conversation natural and flowing
6. Be patient and supportive

CONVERSATION STYLE:
- Ask questions to understand their situation: "What's your current situation?" or "What might make this challenging for you?"
- Provide guidance: "Here's how you can approach this..."
- Offer support: "Remember, every small step counts toward your goal"
- Address concerns: "If you're worried about X, we can adjust..."

IMPORTANT:
- DO NOT ask about completion yet - continue guiding and supporting
- Focus on helping them PREPARE and UNDERSTAND
- Only check status after they've had a chance to actually attempt the action (after 5+ exchanges)
- Be conversational, not evaluative`
        } else if (conversationStage === 'checking') {
          systemMessageOverride = `You are a supportive mentor checking in on the user's progress with: "${planContext.currentAction.title}".

CONTEXT:
- Goal: "${currentGoal}"
- Progress: ${progressPercent}% complete
- They've been discussing this action for several exchanges

YOUR APPROACH:
1. Check in naturally: "How's it going with [action]?" or "Have you had a chance to work on [action]?"
2. If they haven't started, help them get started: "Let's break it down into smaller steps..."
3. If they're struggling, offer support: "What's making it difficult? Let's work through it together."
4. Be understanding and non-judgmental
5. Keep responses conversational (3-4 sentences)

IMPORTANT:
- Still be supportive, not evaluative
- Help them overcome obstacles
- Only move to completion status if they indicate they've attempted it
- Guide naturally toward progress, not rush to evaluation`
        } else {
          // evaluating stage - only after 7+ exchanges
          systemMessageOverride = `You are a supportive mentor helping the user with their action: "${planContext.currentAction.title}".

CONTEXT:
- Goal: "${currentGoal}"
- Progress: ${progressPercent}% complete
- You've been discussing this action for a while

YOUR APPROACH:
1. Gently check completion status: "Have you had a chance to complete [action]? You can say 'Completed', 'Couldn't do it', or 'Adjust' if you need to modify it."
2. Be understanding if they haven't completed it
3. Offer to help adjust if needed
4. Keep it supportive, not pushy

IMPORTANT:
- Be gentle and understanding
- Allow them to say they couldn't do it without judgment
- Help them adjust if needed
- Continue being supportive`
        }
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

