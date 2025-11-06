/**
 * Calculates the average completion percentage of user's active goals
 */

export interface GoalProgress {
  goalId: string
  title: string
  progress: number // 0-100
}

/**
 * Fetches and calculates the average progress of active goals for a user
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @returns Average completion percentage (0-100) and individual goal progress
 */
export async function getUserGoalProgress(
  supabase: any,
  userId: string
): Promise<{ averageProgress: number; goalsProgress: GoalProgress[] }> {
  try {
    // Fetch all active goals for the user
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('id, title')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('is_deleted', false)

    if (goalsError || !goals || goals.length === 0) {
      return { averageProgress: 0, goalsProgress: [] }
    }

    // Calculate progress for each goal
    const goalsProgress: GoalProgress[] = []

    for (const goal of goals) {
      // Count completed milestones
      const { count: completedCount } = await supabase
        .from('milestones')
        .select('*', { count: 'exact', head: true })
        .eq('goal_id', goal.id)
        .eq('status', 'completed')
        .eq('is_deleted', false)

      // Count total milestones
      const { count: totalCount } = await supabase
        .from('milestones')
        .select('*', { count: 'exact', head: true })
        .eq('goal_id', goal.id)
        .eq('is_deleted', false)

      const progress = totalCount && totalCount > 0
        ? Math.round(((completedCount || 0) / totalCount) * 100)
        : 0

      goalsProgress.push({
        goalId: goal.id,
        title: goal.title,
        progress,
      })
    }

    // Calculate average progress
    const averageProgress = goalsProgress.length > 0
      ? Math.round(
          goalsProgress.reduce((sum, goal) => sum + goal.progress, 0) /
            goalsProgress.length
        )
      : 0

    return { averageProgress, goalsProgress }
  } catch (error) {
    console.error('Error calculating user goal progress:', error)
    return { averageProgress: 0, goalsProgress: [] }
  }
}

