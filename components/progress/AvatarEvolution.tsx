'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Loader2 } from 'lucide-react'

// Map stage names to icons (constant outside component)
const stageIcons: Record<string, string> = {
  seed: '🌱',
  sprout: '🌿',
  sapling: '🌳',
  tree: '🌲',
  oak: '🏛️',
}

// Map stage names to display names (constant outside component)
const stageNames: Record<string, string> = {
  seed: 'Seed',
  sprout: 'Sprout',
  sapling: 'Sapling',
  tree: 'Tree',
  oak: 'Oak',
}

export function AvatarEvolution() {
  const [avatarLevel, setAvatarLevel] = useState(1)
  const [avatarStage, setAvatarStage] = useState('seed')
  const [currentPoints, setCurrentPoints] = useState(0)
  const [pointsToNext, setPointsToNext] = useState(10)
  const [loading, setLoading] = useState(true)
  const [stages, setStages] = useState<Array<{ level: number; name: string; icon: string; minPoints: number }>>([
    { level: 1, name: 'Seed', icon: '🌱', minPoints: 0 },
    { level: 2, name: 'Sprout', icon: '🌿', minPoints: 10 },
    { level: 3, name: 'Sapling', icon: '🌳', minPoints: 25 },
    { level: 4, name: 'Tree', icon: '🌲', minPoints: 50 },
    { level: 5, name: 'Oak', icon: '🏛️', minPoints: 100 },
  ])
  const supabase = createSupabaseClient()
  const { user } = useUser()
  const isFetching = useRef(false)

  const fetchAvatarData = useCallback(async () => {
    // Prevent duplicate concurrent fetches
    if (isFetching.current || !user) {
      return
    }

    isFetching.current = true
    setLoading(true)
    try {

      // Fetch user progress
      const { data: userData } = await supabase
        .from('users')
        .select('total_progress, avatar_level, avatar_stage')
        .eq('id', user.id)
        .single()

      if (userData) {
        setCurrentPoints(userData.total_progress || 0)
        setAvatarLevel(userData.avatar_level || 1)
        setAvatarStage(userData.avatar_stage || 'seed')

        // Calculate points to next level
        const currentStage = stages.find(s => s.level === userData.avatar_level || 1)
        const nextStage = stages.find(s => s.level === (userData.avatar_level || 1) + 1)
        
        if (nextStage) {
          setPointsToNext(nextStage.minPoints - (userData.total_progress || 0))
        } else {
          // Max level reached
          setPointsToNext(0)
        }
      }

      // Fetch avatar stages to get accurate min points
      const { data: avatarStages } = await supabase
        .from('avatar_stages')
        .select('level, stage_name, min_progress_points')
        .order('level', { ascending: true })

      if (avatarStages && avatarStages.length > 0) {
        // Update stages with real data
        const mappedStages = avatarStages.map(stage => ({
          level: stage.level,
          name: stageNames[stage.stage_name] || stage.stage_name,
          icon: stageIcons[stage.stage_name] || '🌱',
          minPoints: stage.min_progress_points,
        }))
        setStages(mappedStages)

        const currentStageIndex = avatarStages.findIndex(
          s => s.level === (userData?.avatar_level || 1)
        )
        if (currentStageIndex < avatarStages.length - 1) {
          const nextStage = avatarStages[currentStageIndex + 1]
          setPointsToNext(Math.max(0, nextStage.min_progress_points - (userData?.total_progress || 0)))
        } else {
          setPointsToNext(0)
        }
      }
    } catch (error) {
      console.error('Error fetching avatar data:', error)
    } finally {
      setLoading(false)
      isFetching.current = false
    }
  }, [supabase, user])

  useEffect(() => {
    fetchAvatarData()
  }, [fetchAvatarData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const currentStageIcon = stages.find(s => s.level === avatarLevel)?.icon || stageIcons[avatarStage] || '🌱'
  
  // Calculate progress percentage to next level
  let progressPercentage = 0
  if (pointsToNext > 0) {
    const currentStage = stages.find(s => s.level === avatarLevel)
    const nextStage = stages.find(s => s.level === avatarLevel + 1)
    if (currentStage && nextStage) {
      const pointsInCurrentStage = currentPoints - currentStage.minPoints
      const pointsNeededForNext = nextStage.minPoints - currentStage.minPoints
      progressPercentage = (pointsInCurrentStage / pointsNeededForNext) * 100
    }
  } else {
    progressPercentage = 100 // Max level reached
  }

  return (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-6xl md:text-8xl">
            {currentStageIcon}
          </span>
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 capitalize mb-2">{avatarStage}</h3>
        <p className="text-gray-600">Level {avatarLevel}</p>
      </div>

      {/* Evolution Path */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          {stages.map((stage, index) => (
            <div key={stage.level} className="flex-1 flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 transition-all ${
                  stage.level < avatarLevel
                    ? 'bg-green-100'
                    : stage.level === avatarLevel
                    ? 'bg-primary-100 ring-4 ring-primary-300'
                    : 'bg-gray-100 opacity-50'
                }`}
              >
                <span>{stage.icon}</span>
              </div>
              <span
                className={`text-xs font-medium ${
                  stage.level <= avatarLevel ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {stage.name}
              </span>
            </div>
          ))}
        </div>
        {pointsToNext > 0 ? (
          <>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, progressPercentage)}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {pointsToNext} points until next evolution
            </p>
          </>
        ) : (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full w-full" />
          </div>
        )}
      </div>
    </div>
  )
}
