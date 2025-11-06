'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { TrendingUp, Flame, Calendar, Target } from 'lucide-react'
import { Loader2 } from 'lucide-react'

export function ProgressStats() {
  const [stats, setStats] = useState({
    totalProgress: 0,
    consistencyStreak: 0,
    daysActive: 0,
    completedGoals: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()
  const { user } = useUser()
  const isFetching = useRef(false)

  const fetchStats = useCallback(async () => {
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
        .select('total_progress, consistency_streak, created_at')
        .eq('id', user.id)
        .single()

      // Fetch completed goals
      const { count: completedGoals } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .eq('is_deleted', false)

      // Calculate days active (days since account creation)
      const accountCreated = userData?.created_at
        ? new Date(userData.created_at)
        : new Date()
      const daysActive = Math.floor(
        (Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24)
      )

      setStats({
        totalProgress: userData?.total_progress || 0,
        consistencyStreak: userData?.consistency_streak || 0,
        daysActive: Math.max(1, daysActive),
        completedGoals: completedGoals || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
      isFetching.current = false
    }
  }, [supabase, user])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse h-24" />
        ))}
      </div>
    )
  }

  const statCards = [
    {
      icon: TrendingUp,
      label: 'Total Progress',
      value: stats.totalProgress,
      unit: 'points',
      color: 'text-[#00d4ff]',
      bgColor: 'bg-[rgba(0,212,255,0.1)]',
      borderColor: 'border-[rgba(0,212,255,0.3)]',
    },
    {
      icon: Flame,
      label: 'Consistency Streak',
      value: stats.consistencyStreak,
      unit: 'days',
      color: 'text-[#ff6b35]',
      bgColor: 'bg-[rgba(255,107,53,0.1)]',
      borderColor: 'border-[rgba(255,107,53,0.3)]',
    },
    {
      icon: Calendar,
      label: 'Days Active',
      value: stats.daysActive,
      unit: 'days',
      color: 'text-[#00d4ff]',
      bgColor: 'bg-[rgba(0,212,255,0.1)]',
      borderColor: 'border-[rgba(0,212,255,0.3)]',
    },
    {
      icon: Target,
      label: 'Completed Goals',
      value: stats.completedGoals,
      unit: 'goals',
      color: 'text-green-400',
      bgColor: 'bg-[rgba(34,197,94,0.1)]',
      borderColor: 'border-[rgba(34,197,94,0.3)]',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={index}
            className={`${stat.bgColor} rounded-lg p-4 border ${stat.borderColor}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-sm text-gray-300">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </span>
              <span className="text-sm text-gray-400">{stat.unit}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

