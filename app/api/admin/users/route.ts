import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function checkAdmin(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized', user: null }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (userError || !userData || !userData.is_admin) {
    return { error: 'Forbidden: Admin access required', user: null }
  }

  return { error: null, user }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Check if user is admin
    const { error: authError, user } = await checkAdmin(supabase)
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: authError?.includes('Forbidden') ? 403 : 401 })
    }

    // Get request body
    const { userId, isAdmin, fullName } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (typeof isAdmin === 'boolean') {
      updateData.is_admin = isAdmin
    }

    if (typeof fullName === 'string') {
      updateData.full_name = fullName
    }

    // Update user
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' })
  } catch (error) {
    console.error('Admin API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Check if user is admin
    const { error: authError, user } = await checkAdmin(supabase)
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: authError?.includes('Forbidden') ? 403 : 401 })
    }

    // Get userId from URL search params or request body
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId') || (await request.json()).userId

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Soft delete user (mark as deleted)
    const { error: deleteError } = await supabase
      .from('users')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    console.error('Admin DELETE API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

