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

    // Verify action ownership
    const { data: action } = await supabase
      .from('actions')
      .select('id, user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    // Update action
    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (completed_at !== undefined) updateData.completed_at = completed_at

    const { data: updatedAction, error } = await supabase
      .from('actions')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) {
      console.error('Error updating action:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ action: updatedAction })
  } catch (error) {
    console.error('Update action API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const { data: action, error } = await supabase
      .from('actions')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (error || !action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    return NextResponse.json({ action })
  } catch (error) {
    console.error('Get action API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

