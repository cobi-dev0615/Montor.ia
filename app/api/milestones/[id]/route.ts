import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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
    const { status, completed_at } = body

    // Verify milestone ownership through goal
    const { data: milestone } = await supabase
      .from('milestones')
      .select('goal_id, goals!inner(user_id)')
      .eq('id', params.id)
      .eq('is_deleted', false)
      .single()

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Update milestone
    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (completed_at !== undefined) updateData.completed_at = completed_at

    const { data: updatedMilestone, error } = await supabase
      .from('milestones')
      .update(updateData)
      .eq('id', params.id)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) {
      console.error('Error updating milestone:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ milestone: updatedMilestone })
  } catch (error) {
    console.error('Update milestone API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

