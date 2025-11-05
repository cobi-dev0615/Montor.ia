import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get goal
    const { data: goal } = await supabase
      .from('goals')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Get user's full name
    const { data: userData } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const userName = userData?.full_name || 'there'

    // Get milestones and first action
    const { data: milestones } = await supabase
      .from('milestones')
      .select('*')
      .eq('goal_id', goal.id)
      .eq('is_deleted', false)
      .order('order_index', { ascending: true })

    if (!milestones || milestones.length === 0) {
      return NextResponse.json({ error: 'No milestones found' }, { status: 404 })
    }

    // Get first action from first milestone
    const firstMilestone = milestones[0]
    const { data: firstActions } = await supabase
      .from('actions')
      .select('*')
      .eq('milestone_id', firstMilestone.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(1)

    const firstAction = firstActions && firstActions.length > 0 ? firstActions[0] : null

    // Create comprehensive initial message about goal and today's action
    let initialMessage = `Welcome, ${userName}! 🌱\n\n`
    
    initialMessage += `Your goal: **${goal.title}**\n`
    initialMessage += `Your one thing: "${goal.main_goal}"\n\n`
    
    initialMessage += `We've created a personalized plan with ${milestones.length} checkpoint${milestones.length > 1 ? 's' : ''} to help you achieve this goal.\n\n`
    
    if (firstAction) {
      initialMessage += `🎯 **Today's Action:**\n`
      initialMessage += `${firstAction.title}\n`
      if (firstAction.description) {
        initialMessage += `${firstAction.description}\n`
      }
      initialMessage += `\nThis is your first step toward "${firstMilestone.title}".\n\n`
      initialMessage += `Let's focus on completing this action today. How are you planning to approach it?`
    } else if (firstMilestone) {
      initialMessage += `🎯 **Your First Checkpoint:**\n`
      initialMessage += `${firstMilestone.title}\n`
      if (firstMilestone.description) {
        initialMessage += `${firstMilestone.description}\n`
      }
      initialMessage += `\nLet's discuss how you'll start working on this.`
    }

    // Save the initial message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        goal_id: goal.id,
        role: 'assistant',
        content: initialMessage,
        is_deleted: false,
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error saving initial message:', messageError)
      return NextResponse.json({ error: messageError.message }, { status: 500 })
    }

    return NextResponse.json({
      message,
      currentAction: firstAction,
      currentMilestone: firstMilestone,
    })
  } catch (error) {
    console.error('Initial message API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

