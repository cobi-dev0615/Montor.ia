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

    // Fetch actions for this milestone
    const { data: actions, error } = await supabase
      .from('actions')
      .select('*')
      .eq('milestone_id', params.id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching actions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ actions: actions || [] })
  } catch (error) {
    console.error('Get actions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

