'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Loader2 } from 'lucide-react'

// Map stage names to icons
const stageIcons: Record<string, string> = {
  seed: '🌱',
  sprout: '🌿',
  sapling: '🌳',
  tree: '🌲',
  oak: '🏛️',
}

export function AvatarDisplay() {
  const [avatarLevel, setAvatarLevel] = useState(1)
  const [avatarStage, setAvatarStage] = useState('seed')
  const [pointsToNext, setPointsToNext] = useState(10)
  const [currentPoints, setCurrentPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()
  const { user } = useUser()

  useEffect(() => {
    const fetchAvatarData = async () => {
      if (!user) return

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

          // Fetch avatar stages to calculate points to next level
          const { data: avatarStages } = await supabase
            .from('avatar_stages')
            .select('level, min_progress_points')
            .order('level', { ascending: true })

          if (avatarStages && avatarStages.length > 0) {
            const currentStageIndex = avatarStages.findIndex(
              s => s.level === (userData.avatar_level || 1)
            )
            if (currentStageIndex < avatarStages.length - 1) {
              const nextStage = avatarStages[currentStageIndex + 1]
              setPointsToNext(Math.max(0, nextStage.min_progress_points - (userData.total_progress || 0)))
            } else {
              setPointsToNext(0)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching avatar data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAvatarData()
  }, [user, supabase])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const currentStageIcon = stageIcons[avatarStage] || '🌱'
  const progressPercentage = pointsToNext > 0 
    ? Math.min(100, ((currentPoints % (pointsToNext + currentPoints - (avatarLevel > 1 ? 10 : 0))) / pointsToNext) * 100)
    : 100

  return (
    <div className="flex flex-col items-center">
      <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-primary-900 flex items-center justify-center mb-4">
        <span className="text-4xl md:text-6xl">{currentStageIcon}</span>
      </div>
      <h3 className="text-xl font-semibold text-gray-100 capitalize mb-2">{avatarStage}</h3>
      <p className="text-sm text-gray-400 mb-4">Level {avatarLevel}</p>
      {pointsToNext > 0 ? (
        <>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, progressPercentage)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">{pointsToNext} points to next level</p>
        </>
      ) : (
        <p className="text-xs text-green-600 font-medium">Max level reached! 🎉</p>
      )}
    </div>
  )
}
