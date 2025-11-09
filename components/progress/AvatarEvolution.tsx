'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Loader2 } from 'lucide-react'
import { AnimatedAvatar } from '@/components/animations/AnimatedAvatar'

// Map stage names to icons (constant outside component)
const stageIcons: Record<string, string> = {
  seed: '🌱',
  sprout: '🌿',
  sapling: '🌳',
  tree: '🌲',
  oak: '🏛️',
}

// Map stage names to display names in Portuguese (constant outside component)
const stageNames: Record<string, string> = {
  seed: 'Semente',
  sprout: 'Brotinho',
  sapling: 'Muda',
  tree: 'Árvore',
  oak: 'Carvalho',
}

export function AvatarEvolution() {
  const [avatarLevel, setAvatarLevel] = useState(1)
  const [avatarStage, setAvatarStage] = useState('seed')
  const [currentPoints, setCurrentPoints] = useState(0)
  const [pointsToNext, setPointsToNext] = useState(10)
  const [loading, setLoading] = useState(true)
  const [stages, setStages] = useState<Array<{ level: number; name: string; icon: string; minPoints: number }>>([
    { level: 1, name: 'Semente', icon: '🌱', minPoints: 0 },
    { level: 2, name: 'Brotinho', icon: '🌿', minPoints: 10 },
    { level: 3, name: 'Muda', icon: '🌳', minPoints: 25 },
    { level: 4, name: 'Árvore', icon: '🌲', minPoints: 50 },
    { level: 5, name: 'Carvalho', icon: '🏛️', minPoints: 100 },
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
    
    // Recalculate avatar when component mounts to ensure it's synced with goal progress
    const recalculateAvatar = async () => {
      try {
        await fetch('/api/avatar/recalculate', {
          method: 'POST',
        })
        // Refetch avatar data after recalculation
        fetchAvatarData()
      } catch (error) {
        console.error('Error recalculating avatar:', error)
      }
    }
    
    recalculateAvatar()
  }, [fetchAvatarData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

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
    <div className="text-center space-y-7">
      <div className="space-y-4.5">
        <div className="flex justify-center mx-auto">
          <AnimatedAvatar
            stage={avatarStage}
            level={avatarLevel}
            size="md"
            showParticles={true}
            intensity={1}
          />
        </div>
        <h3 className="text-base font-medium text-gray-100">{stageNames[avatarStage] || avatarStage}</h3>
        <p className="text-[11px] text-gray-400">Nível {avatarLevel}</p>
      </div>

      {/* Evolution Path */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center gap-2">
          {stages.map((stage, index) => (
            <div key={stage.level} className="flex-1 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg mb-1 transition-all ${
                  stage.level < avatarLevel
                    ? 'bg-green-600'
                    : stage.level === avatarLevel
                    ? 'bg-primary-600 ring ring-primary-400'
                    : 'bg-gray-700 opacity-50'
                }`}
              >
                <span>{stage.icon}</span>
              </div>
              <span
                className={`text-[10px] font-medium ${
                  stage.level <= avatarLevel ? 'text-gray-100' : 'text-gray-400'
                }`}
              >
                {stage.name}
              </span>
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1 overflow-hidden">
          <div
            className={`transition-all duration-500 h-full rounded-full ${
              pointsToNext > 0 ? 'bg-primary-600' : 'bg-green-600'
            }`}
            style={{ width: `${Math.min(100, progressPercentage)}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400">
          {pointsToNext > 0 ? `${pointsToNext} pontos até a próxima evolução` : 'Nível máximo alcançado'}
        </p>
      </div>
    </div>
  )
}
