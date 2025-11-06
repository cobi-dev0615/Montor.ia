'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { AvatarDisplay } from '@/components/dashboard/AvatarDisplay'
import { ProgressOverview } from '@/components/dashboard/ProgressOverview'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { Target, TrendingUp, Flame } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

// Map stage names to display names in Portuguese
const stageNames: Record<string, string> = {
  seed: 'Semente',
  sprout: 'Brotinho',
  sapling: 'Muda',
  tree: 'Árvore',
  oak: 'Carvalho',
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeGoals: 0,
    progressPoints: 0,
    consistencyStreak: 0,
    avatarLevel: 1,
    avatarStage: 'seed',
  })
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()
  const { user } = useUser()

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return

      try {
        // Fetch user data
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, total_progress, consistency_streak, avatar_level, avatar_stage')
          .eq('id', user.id)
          .single()

        if (userData) {
          setUserName(userData.full_name || 'usuário')
          setStats({
            activeGoals: 0, // Will be updated from goals fetch
            progressPoints: userData.total_progress || 0,
            consistencyStreak: userData.consistency_streak || 0,
            avatarLevel: userData.avatar_level || 1,
            avatarStage: userData.avatar_stage || 'seed',
          })
        }

        // Fetch active goals count
        const response = await fetch('/api/goals')
        if (response.ok) {
          const data = await response.json()
          const activeGoals = (data.goals || []).filter((g: any) => g.status === 'active')
          setStats(prev => ({ ...prev, activeGoals: activeGoals.length }))
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#00d4ff] neon-glow">Bem-vindo de volta, {userName}!</h1>
        <p className="text-gray-300 mt-2">Aqui está seu resumo.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Metas Ativas"
          value={stats.activeGoals.toString()}
          icon={<Target className="w-6 h-6" />}
        />
        <StatsCard
          title="Pontos de Progresso"
          value={stats.progressPoints.toString()}
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <StatsCard
          title="Sequência de Consistência"
          value={`${stats.consistencyStreak} dias`}
          icon={<Flame className="w-6 h-6" />}
        />
        <StatsCard
          title="Nível do Avatar"
          value={`Nível ${stats.avatarLevel}`}
          subValue={stageNames[stats.avatarStage] || stats.avatarStage.charAt(0).toUpperCase() + stats.avatarStage.slice(1)}
        />
      </div>

      {/* Main Content - Balanced Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Avatar */}
        <Card>
          <AvatarDisplay />
        </Card>

        {/* Center: Progress Overview */}
        <Card>
          <ProgressOverview />
        </Card>

        {/* Right: Recent Activity */}
        <Card>
          <RecentActivity />
        </Card>
      </div>
    </div>
  )
}
