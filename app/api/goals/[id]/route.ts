import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: goal, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (error || !goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Calculate progress based on actions
    // Get all milestones for this goal to find their actions
    const { data: milestones } = await supabase
      .from('milestones')
      .select('id')
      .eq('goal_id', goal.id)
      .eq('is_deleted', false)

    let progress = 0
    
    if (milestones && milestones.length > 0) {
      // Count completed actions
      const { count: completedActions } = await supabase
        .from('actions')
        .select('*', { count: 'exact', head: true })
        .in('milestone_id', milestones.map(m => m.id))
        .eq('status', 'completed')
        .eq('is_deleted', false)

      // Count total actions
      const { count: totalActions } = await supabase
        .from('actions')
        .select('*', { count: 'exact', head: true })
        .in('milestone_id', milestones.map(m => m.id))
        .eq('is_deleted', false)

      progress = totalActions && totalActions > 0
        ? Math.round(((completedActions || 0) / totalActions) * 100)
        : 0
    }

    return NextResponse.json({ goal: { ...goal, progress } })
  } catch (error) {
    console.error('Get goal API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, main_goal, status, is_deleted } = body

    // Verify goal ownership
    const { data: existingGoal } = await supabase
      .from('goals')
      .select('user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!existingGoal || existingGoal.user_id !== user.id) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Update goal
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (main_goal !== undefined) updateData.main_goal = main_goal
    if (status !== undefined) updateData.status = status
    if (is_deleted !== undefined) updateData.is_deleted = is_deleted
    updateData.updated_at = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating goal:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update goal API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify goal ownership
    const { data: existingGoal } = await supabase
      .from('goals')
      .select('user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Soft delete goal
    const { error } = await supabase
      .from('goals')
      .update({ 
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting goal:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete goal API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

