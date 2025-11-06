/**
 * Calculates the correct avatar stage based on goal completion percentage
 * This ensures consistent avatar stage calculation across the application
 */

export interface AvatarStage {
  level: number
  stage_name: string
  min_progress_points: number
}

export interface CalculatedAvatar {
  level: number
  stage: string
}

/**
 * Calculates the avatar stage based on goal completion percentage (0-100)
 * @param completionPercentage - Average completion percentage of active goals (0-100)
 * @param avatarStages - Array of avatar stages, ordered by level ascending
 * @returns The calculated avatar level and stage name
 */
export function calculateAvatarStageFromPercentage(
  completionPercentage: number,
  avatarStages: AvatarStage[]
): CalculatedAvatar {
  if (!avatarStages || avatarStages.length === 0) {
    return { level: 1, stage: 'seed' }
  }

  // Ensure stages are sorted by level ascending
  const sortedStages = [...avatarStages].sort((a, b) => a.level - b.level)

  // Map completion percentage to avatar stages:
  // 0-20%: seed (level 1)
  // 21-40%: sprout (level 2)
  // 41-60%: sapling (level 3)
  // 61-80%: tree (level 4)
  // 81-100%: oak (level 5)
  
  let targetLevel = 1
  if (completionPercentage >= 81) {
    targetLevel = 5 // oak
  } else if (completionPercentage >= 61) {
    targetLevel = 4 // tree
  } else if (completionPercentage >= 41) {
    targetLevel = 3 // sapling
  } else if (completionPercentage >= 21) {
    targetLevel = 2 // sprout
  } else {
    targetLevel = 1 // seed
  }

  // Find the stage matching the target level
  const targetStage = sortedStages.find(stage => stage.level === targetLevel)
  
  if (targetStage) {
    return {
      level: targetStage.level,
      stage: targetStage.stage_name,
    }
  }

  // Fallback to first stage (seed)
  return {
    level: sortedStages[0].level,
    stage: sortedStages[0].stage_name,
  }
}

/**
 * Legacy function: Calculates the avatar stage based on total progress points
 * Kept for backward compatibility but should be replaced with calculateAvatarStageFromPercentage
 * @deprecated Use calculateAvatarStageFromPercentage instead
 */
export function calculateAvatarStage(
  totalProgress: number,
  avatarStages: AvatarStage[]
): CalculatedAvatar {
  if (!avatarStages || avatarStages.length === 0) {
    return { level: 1, stage: 'seed' }
  }

  // Ensure stages are sorted by min_progress_points ascending
  const sortedStages = [...avatarStages].sort(
    (a, b) => a.min_progress_points - b.min_progress_points
  )

  // Find the highest stage the user qualifies for
  let highestQualifyingStage: AvatarStage | null = null

  for (const stage of sortedStages) {
    if (totalProgress >= stage.min_progress_points) {
      highestQualifyingStage = stage
    } else {
      // Since stages are in ascending order, we can break once we find one we don't qualify for
      break
    }
  }

  // If no stage found, user qualifies for at least the first stage (seed)
  if (highestQualifyingStage) {
    return {
      level: highestQualifyingStage.level,
      stage: highestQualifyingStage.stage_name,
    }
  } else {
    // Fallback to first stage (seed)
    return {
      level: sortedStages[0].level,
      stage: sortedStages[0].stage_name,
    }
  }
}

