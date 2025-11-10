import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      userId?: string
      updates?: { is_deleted?: boolean }
    }

    if (body.userId && body.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isDeletedValue =
      typeof body.updates?.is_deleted === 'boolean'
        ? body.updates.is_deleted
        : true

    const { error: updateError } = await supabase
      .from('messages')
      .update({
        is_deleted: isDeletedValue,
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error clearing chat history:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Falha ao limpar histórico' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error clearing chat history:', error)
    return NextResponse.json(
      { error: 'Erro inesperado ao limpar histórico' },
      { status: 500 }
    )
  }
}

