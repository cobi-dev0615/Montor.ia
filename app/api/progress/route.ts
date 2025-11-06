import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { calculateAvatarStageFromPercentage } from '@/lib/avatar/calculateAvatarStage'
import { getUserGoalProgress } from '@/lib/avatar/getUserGoalProgress'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action_id, milestone_id, goal_id, progress_type, points_earned = 1 } = await request.json()

    if (!goal_id || !progress_type) {
      return NextResponse.json(
        { error: 'goal_id and progress_type are required' },
        { status: 400 }
      )
    }

    // Create progress log
    const { data: progressLog, error: insertError } = await supabase
      .from('progress_logs')
      .insert({
        user_id: user.id,
        action_id: action_id || null,
        milestone_id: milestone_id || null,
        goal_id,
        progress_type,
        points_earned,
        is_deleted: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating progress log:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Get current user data
    const { data: userData } = await supabase
      .from('users')
      .select('total_progress, consistency_streak, last_activity_date, avatar_level')
      .eq('id', user.id)
      .single()

    const today = new Date().toISOString().split('T')[0]
    const lastActivity = userData?.last_activity_date
      ? new Date(userData.last_activity_date).toISOString().split('T')[0]
      : null

    let newStreak = userData?.consistency_streak || 0
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    if (lastActivity === today) {
      // Already logged today, no streak change
    } else if (lastActivity === yesterday) {
      // Continuing streak
      newStreak += 1
    } else if (lastActivity && lastActivity !== yesterday) {
      // Streak broken, reset to 1
      newStreak = 1
    } else {
      // First activity
      newStreak = 1
    }

    // Calculate new progress
    const newProgress = (userData?.total_progress || 0) + points_earned

    // Calculate avatar level based on goal completion percentage
    // Note: avatar_stages table doesn't have is_deleted field
    const { data: avatarStages } = await supabase
      .from('avatar_stages')
      .select('level, stage_name, min_progress_points')
      .order('level', { ascending: true })

    // Get average goal completion percentage
    const { averageProgress } = await getUserGoalProgress(supabase, user.id)

    // Calculate avatar stage based on goal completion percentage
    const { level: newAvatarLevel, stage: newAvatarStage } =
      calculateAvatarStageFromPercentage(averageProgress, avatarStages || [])

    // Update user progress, streak, and avatar
    const { error: updateError } = await supabase
      .from('users')
      .update({
        total_progress: newProgress,
        consistency_streak: newStreak,
        last_activity_date: today,
        avatar_level: newAvatarLevel,
        avatar_stage: newAvatarStage,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user progress:', updateError)
      // Don't fail the request if update fails
    }

    // Update action status if action_id provided
    if (action_id && progress_type === 'action') {
      await supabase
        .from('actions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', action_id)
        .eq('user_id', user.id)
    }

    // Check if milestone should be completed (all actions done)
    if (milestone_id && progress_type === 'action') {
      const { count: totalActions } = await supabase
        .from('actions')
        .select('*', { count: 'exact', head: true })
        .eq('milestone_id', milestone_id)
        .eq('is_deleted', false)

      const { count: completedActions } = await supabase
        .from('actions')
        .select('*', { count: 'exact', head: true })
        .eq('milestone_id', milestone_id)
        .eq('status', 'completed')
        .eq('is_deleted', false)

      // If all actions are completed, mark milestone as completed
      if (totalActions && completedActions && totalActions > 0 && completedActions === totalActions) {
        await supabase
          .from('milestones')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', milestone_id)
      } else if (completedActions && completedActions > 0) {
        // Mark milestone as in_progress if at least one action is completed
        await supabase
          .from('milestones')
          .update({
            status: 'in_progress',
          })
          .eq('id', milestone_id)
          .eq('status', 'pending')
      }
    }

    return NextResponse.json({
      progress: progressLog,
      userProgress: {
        total_progress: newProgress,
        consistency_streak: newStreak,
        avatar_level: newAvatarLevel,
        avatar_stage: newAvatarStage,
      },
      avatarEvolved: newAvatarLevel > (userData?.avatar_level || 1),
    })
  } catch (error) {
    console.error('Progress API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: progressLogs, error } = await supabase
      .from('progress_logs')
      .select('*, goals(*), milestones(*), actions(*)')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching progress logs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ progress: progressLogs || [] })
  } catch (error) {
    console.error('Get progress API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

