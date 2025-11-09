import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch goals (automatically filtered by RLS to exclude deleted)
    const { data: goals, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)  // Explicitly filter deleted goals
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching goals:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate progress for each goal
    const goalsWithProgress = await Promise.all(
      (goals || []).map(async (goal) => {
        // Count completed milestones
        const { count: completedCount } = await supabase
          .from('milestones')
          .select('*', { count: 'exact', head: true })
          .eq('goal_id', goal.id)
          .eq('status', 'completed')
          .eq('is_deleted', false)

        const { count: totalCount } = await supabase
          .from('milestones')
          .select('*', { count: 'exact', head: true })
          .eq('goal_id', goal.id)
          .eq('is_deleted', false)

        const progress = totalCount && totalCount > 0
          ? Math.round((completedCount || 0) / totalCount * 100)
          : 0

        return {
          ...goal,
          progress,
          hasPlan: (totalCount || 0) > 0,
        }
      })
    )

    return NextResponse.json({ goals: goalsWithProgress })
  } catch (error) {
    console.error('Goals API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, main_goal } = await request.json()

    if (!title || !main_goal) {
      return NextResponse.json(
        { error: 'Title and main goal are required' },
        { status: 400 }
      )
    }

    // Create goal
    const { data: goal, error: insertError } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        main_goal,
        status: 'active',
        is_deleted: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating goal:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Don't auto-generate milestones - user will trigger it manually
    return NextResponse.json({ goal: { ...goal, progress: 0 } })
  } catch (error) {
    console.error('Create goal API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

