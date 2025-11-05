'use client'

import { EnergyParticles } from './EnergyParticles'
import { VideoBackground } from './VideoBackground'
import { HolographicGlow } from './HolographicGlow'
import { CinematicOverlay } from './CinematicOverlay'
import { ForwardMotion } from './ForwardMotion'
import { ProgressFlow } from './ProgressFlow'
import { useUser } from '@/hooks/useUser'
import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

interface ImmersiveWorldProps {
  children: React.ReactNode
  videoUrl?: string
  particleIntensity?: 'low' | 'medium' | 'high'
  glowIntensity?: number
  enableForwardMotion?: boolean
}

export function ImmersiveWorld({
  children,
  videoUrl,
  particleIntensity = 'high',
  glowIntensity = 0.4,
  enableForwardMotion = true,
}: ImmersiveWorldProps) {
  const { user } = useUser()
  const [overallProgress, setOverallProgress] = useState(0)

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return

      try {
        const supabase = createSupabaseClient()
        const { data: userData } = await supabase
          .from('users')
          .select('total_progress')
          .eq('id', user.id)
          .single()

        if (userData) {
          // Calculate progress percentage (0-100)
          const progress = Math.min((userData.total_progress || 0) / 10, 100)
          setOverallProgress(progress)
        }
      } catch (error) {
        console.error('Error fetching progress for animations:', error)
      }
    }

    fetchProgress()
  }, [user])

  return (
    <>
      {/* Layered background effects */}
      <VideoBackground videoUrl={videoUrl} />
      <EnergyParticles intensity={particleIntensity} particleCount={150} />
      {enableForwardMotion && (
        <>
          <ForwardMotion intensity="medium" direction="left-to-right" speed={0.8} />
          <ProgressFlow progress={overallProgress} intensity="low" />
        </>
      )}
      <HolographicGlow intensity={glowIntensity} />
      <CinematicOverlay intensity={0.4} />
      
      {/* Content with proper z-index */}
      <div className="relative z-10">{children}</div>
    </>
  )
}

