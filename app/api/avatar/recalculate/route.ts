import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { calculateAvatarStageFromPercentage } from '@/lib/avatar/calculateAvatarStage'
import { getUserGoalProgress } from '@/lib/avatar/getUserGoalProgress'

/**
 * Recalculates and updates the user's avatar stage based on current goal completion percentage
 * This endpoint can be called to sync the avatar with the current goal progress
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get avatar stages
    const { data: avatarStages } = await supabase
      .from('avatar_stages')
      .select('level, stage_name, min_progress_points')
      .order('level', { ascending: true })

    // Get average goal completion percentage
    const { averageProgress } = await getUserGoalProgress(supabase, user.id)

    // Calculate avatar stage based on goal completion percentage
    const { level: newAvatarLevel, stage: newAvatarStage } =
      calculateAvatarStageFromPercentage(averageProgress, avatarStages || [])

    // Update user's avatar stage
    const { error: updateError } = await supabase
      .from('users')
      .update({
        avatar_level: newAvatarLevel,
        avatar_stage: newAvatarStage,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating avatar:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      avatar: {
        level: newAvatarLevel,
        stage: newAvatarStage,
      },
      averageGoalProgress: averageProgress,
    })
  } catch (error) {
    console.error('Recalculate avatar API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

