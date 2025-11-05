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

    const { title, description } = await request.json()

    // Verify action ownership
    const { data: existingAction, error: fetchError } = await supabase
      .from('actions')
      .select('id, user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !existingAction) {
      return NextResponse.json({ error: 'Action not found or unauthorized' }, { status: 404 })
    }

    // Update action content
    const updateData: any = {}
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description

    const { data: updatedAction, error: updateError } = await supabase
      .from('actions')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating action:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ action: updatedAction })
  } catch (error) {
    console.error('Update action content API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

