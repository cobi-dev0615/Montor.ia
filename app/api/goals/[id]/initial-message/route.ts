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

    // Get action counts for each milestone
    const milestoneActionCounts: Record<string, number> = {}
    let totalActionsCount = 0
    
    for (const milestone of milestones) {
      const { count: actionCount } = await supabase
        .from('actions')
        .select('*', { count: 'exact', head: true })
        .eq('milestone_id', milestone.id)
        .eq('is_deleted', false)
      
      const count = actionCount || 0
      milestoneActionCounts[milestone.id] = count
      totalActionsCount += count
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
    
    initialMessage += `We've created a personalized plan with ${milestones.length} checkpoint${milestones.length > 1 ? 's' : ''} and ${totalActionsCount} action${totalActionsCount !== 1 ? 's' : ''} to help you achieve this goal.\n\n`
    
    // Add action counts per milestone
    if (Object.keys(milestoneActionCounts).length > 0) {
      initialMessage += `📋 **Action Breakdown:**\n`
      milestones.forEach((milestone, index) => {
        const actionCount = milestoneActionCounts[milestone.id] || 0
        initialMessage += `• ${milestone.title}: ${actionCount} action${actionCount !== 1 ? 's' : ''}\n`
      })
      initialMessage += `\n`
    }
    
    if (firstAction) {
      initialMessage += `🎯 **Sua Ação de Hoje:**\n\n`
      initialMessage += `**"${firstAction.title}"**\n`
      if (firstAction.description) {
        initialMessage += `${firstAction.description}\n\n`
      }
      initialMessage += `Este é o primeiro passo em direção ao marco: **"${firstMilestone.title}"**\n\n`
      initialMessage += `**O que você precisa fazer agora:**\n`
      initialMessage += `1. Entenda o que esta ação envolve\n`
      initialMessage += `2. Comece a trabalhar nela quando estiver pronto\n`
      initialMessage += `3. Me avise quando concluir dizendo "Concluído"\n`
      initialMessage += `4. Se tiver dificuldades, diga "Não consegui fazer" ou "Ajustar"\n\n`
      initialMessage += `Vamos focar em completar esta ação hoje. Como você planeja abordá-la?`
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

