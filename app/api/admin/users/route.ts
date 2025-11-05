import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !userData.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Get request body
    const { userId, isAdmin } = await request.json()

    if (!userId || typeof isAdmin !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Update user admin status
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_admin: isAdmin, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating admin status:', updateError)
      return NextResponse.json({ error: 'Failed to update admin status' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Admin status updated' })
  } catch (error) {
    console.error('Admin API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

