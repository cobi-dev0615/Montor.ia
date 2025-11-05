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

    // Verify milestone ownership through goal and get goal_id
    const { data: milestone } = await supabase
      .from('milestones')
      .select('goal_id, goals!inner(user_id)')
      .eq('id', params.id)
      .eq('is_deleted', false)
      .single()

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    const goalId = milestone.goal_id

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

    // If milestone is being marked as completed, complete all its actions
    if (status === 'completed') {
      // Get all pending/in_progress actions for this milestone
      const { data: actions } = await supabase
        .from('actions')
        .select('id')
        .eq('milestone_id', params.id)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .in('status', ['pending', 'in_progress'])

      if (actions && actions.length > 0) {
        // Mark all actions as completed
        const { error: actionsError } = await supabase
          .from('actions')
          .update({
            status: 'completed',
            completed_at: completed_at || new Date().toISOString(),
          })
          .in('id', actions.map(a => a.id))

        if (actionsError) {
          console.error('Error completing actions:', actionsError)
          // Continue even if action completion fails
        }
      }

      // Log progress for milestone completion
      try {
        await supabase
          .from('progress_logs')
          .insert({
            user_id: user.id,
            milestone_id: params.id,
            goal_id: goalId,
            progress_type: 'milestone',
            points_earned: 10, // Milestone completion gives more points
            is_deleted: false,
          })

        // Update user progress
        const { data: userData } = await supabase
          .from('users')
          .select('total_progress, consistency_streak, last_activity_date, avatar_level, avatar_stage')
          .eq('id', user.id)
          .single()

        if (userData) {
          const today = new Date().toISOString().split('T')[0]
          const lastActivity = userData.last_activity_date
            ? new Date(userData.last_activity_date).toISOString().split('T')[0]
            : null

          let newStreak = userData.consistency_streak || 0
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

          if (lastActivity === today) {
            // Already logged today, no streak change
          } else if (lastActivity === yesterday) {
            newStreak += 1
          } else if (lastActivity && lastActivity !== yesterday) {
            newStreak = 1
          } else {
            newStreak = 1
          }

          const newProgress = (userData.total_progress || 0) + 10

          // Check avatar level
          const { data: avatarStages } = await supabase
            .from('avatar_stages')
            .select('level, stage_name, min_progress_points')
            .order('level', { ascending: false })

          let newAvatarLevel = userData.avatar_level || 1
          let newAvatarStage = userData.avatar_stage || 'seed'

          if (avatarStages) {
            const qualifyingStage = avatarStages.find(
              (stage) => newProgress >= stage.min_progress_points
            )
            if (qualifyingStage) {
              newAvatarLevel = qualifyingStage.level
              newAvatarStage = qualifyingStage.stage_name
            }
          }

          // Update user progress
          await supabase
            .from('users')
            .update({
              total_progress: newProgress,
              consistency_streak: newStreak,
              last_activity_date: today,
              avatar_level: newAvatarLevel,
              avatar_stage: newAvatarStage,
            })
            .eq('id', user.id)
        }
      } catch (progressError) {
        console.error('Error logging milestone progress:', progressError)
        // Continue even if progress logging fails
      }
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

