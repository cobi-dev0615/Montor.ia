'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Loader2 } from 'lucide-react'
import { AnimatedAvatar } from '@/components/animations/AnimatedAvatar'

// Map stage names to display names in Portuguese
const stageNames: Record<string, string> = {
  seed: 'Semente',
  sprout: 'Brotinho',
  sapling: 'Muda',
  tree: 'Árvore',
  oak: 'Carvalho',
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
  }, [user, supabase])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const progressPercentage = pointsToNext > 0 
    ? Math.min(100, ((currentPoints % (pointsToNext + currentPoints - (avatarLevel > 1 ? 10 : 0))) / pointsToNext) * 100)
    : 100

  return (
    <div className="flex flex-col items-center">
      <AnimatedAvatar
        stage={avatarStage}
        level={avatarLevel}
        size="md"
        showParticles={true}
        intensity={1}
      />
      <h3 className="text-xl font-semibold text-gray-100 mb-2 mt-4">{stageNames[avatarStage] || avatarStage}</h3>
      <p className="text-sm text-gray-400 mb-4">Nível {avatarLevel}</p>
      {pointsToNext > 0 ? (
        <>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, progressPercentage)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">{pointsToNext} pontos para o próximo nível</p>
        </>
      ) : (
        <p className="text-xs text-green-600 font-medium">Nível máximo alcançado! 🎉</p>
      )}
    </div>
  )
}
