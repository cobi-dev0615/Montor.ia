'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Users, Target, MessageSquare, TrendingUp, Calendar, Activity } from 'lucide-react'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalGoals: number
  totalMessages: number
  newUsersThisMonth: number
  growthPercentage: number
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalGoals: 0,
    totalMessages: 0,
    newUsersThisMonth: 0,
    growthPercentage: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch all stats in parallel
        const [usersResult, goalsResult, messagesResult, activeUsersResult] = await Promise.all([
          supabase.from('users').select('id, created_at', { count: 'exact' }),
          supabase.from('goals').select('id', { count: 'exact' }),
          supabase.from('messages').select('id', { count: 'exact' }),
          supabase
            .from('users')
            .select('id')
            .gte('last_activity_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        ])

        const totalUsers = usersResult.count || 0
        const activeUsers = activeUsersResult.data?.length || 0
        const totalGoals = goalsResult.count || 0
        const totalMessages = messagesResult.count || 0

        // Calculate new users this month
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const newUsersResult = await supabase
          .from('users')
          .select('id')
          .gte('created_at', startOfMonth.toISOString())

        const newUsersThisMonth = newUsersResult.data?.length || 0

        // Calculate growth percentage (simplified)
        const lastMonthStart = new Date(startOfMonth)
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
        const lastMonthEnd = new Date(startOfMonth)

        const lastMonthUsersResult = await supabase
          .from('users')
          .select('id')
          .gte('created_at', lastMonthStart.toISOString())
          .lt('created_at', lastMonthEnd.toISOString())

        const lastMonthUsers = lastMonthUsersResult.data?.length || 0
        const growthPercentage =
          lastMonthUsers > 0 ? ((newUsersThisMonth - lastMonthUsers) / lastMonthUsers) * 100 : 0

        setStats({
          totalUsers,
          activeUsers,
          totalGoals,
          totalMessages,
          newUsersThisMonth,
          growthPercentage: Math.round(growthPercentage * 10) / 10,
        })
      } catch (error) {
        console.error('Error fetching admin stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d4ff]"></div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total de Usuários',
      value: stats.totalUsers.toString(),
      icon: Users,
      color: 'text-[#00d4ff]',
      bgColor: 'bg-[rgba(0,212,255,0.1)]',
      borderColor: 'border-[rgba(0,212,255,0.3)]',
    },
    {
      title: 'Usuários Ativos (30 dias)',
      value: stats.activeUsers.toString(),
      icon: Activity,
      color: 'text-green-400',
      bgColor: 'bg-[rgba(34,197,94,0.1)]',
      borderColor: 'border-[rgba(34,197,94,0.3)]',
    },
    {
      title: 'Total de Metas',
      value: stats.totalGoals.toString(),
      icon: Target,
      color: 'text-[#ff6b35]',
      bgColor: 'bg-[rgba(255,107,53,0.1)]',
      borderColor: 'border-[rgba(255,107,53,0.3)]',
    },
    {
      title: 'Total de Mensagens',
      value: stats.totalMessages.toString(),
      icon: MessageSquare,
      color: 'text-[#00d4ff]',
      bgColor: 'bg-[rgba(0,212,255,0.1)]',
      borderColor: 'border-[rgba(0,212,255,0.3)]',
    },
    {
      title: 'Novos Usuários (Este Mês)',
      value: stats.newUsersThisMonth.toString(),
      icon: Calendar,
      color: 'text-[#00d4ff]',
      bgColor: 'bg-[rgba(0,212,255,0.1)]',
      borderColor: 'border-[rgba(0,212,255,0.3)]',
    },
    {
      title: 'Taxa de Crescimento',
      value: `${stats.growthPercentage >= 0 ? '+' : ''}${stats.growthPercentage}%`,
      icon: TrendingUp,
      color: stats.growthPercentage >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: stats.growthPercentage >= 0 ? 'bg-[rgba(34,197,94,0.1)]' : 'bg-[rgba(239,68,68,0.1)]',
      borderColor: stats.growthPercentage >= 0 ? 'border-[rgba(34,197,94,0.3)]' : 'border-[rgba(239,68,68,0.3)]',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Painel Administrativo</h1>
        <p className="text-gray-400 mt-1">Visão geral e estatísticas da plataforma</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={index} className={`p-6 border ${card.borderColor}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-1">{card.title}</p>
                  <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                </div>
                <div className={`${card.bgColor} p-3 rounded-lg border ${card.borderColor}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-4">
          <a
            href="/admin/users"
            className="px-4 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] text-white rounded-lg hover:shadow-[0_0_20px_rgba(0,212,255,0.5)] transition-all"
          >
            Ver Todos os Usuários
          </a>
          <a
            href="/admin/users"
            className="px-4 py-2 bg-[rgba(255,107,53,0.2)] text-[#ff6b35] border border-[rgba(255,107,53,0.5)] rounded-lg hover:bg-[rgba(255,107,53,0.3)] hover:shadow-[0_0_15px_rgba(255,107,53,0.4)] transition-all"
          >
            Gerenciar Usuários
          </a>
        </div>
      </Card>
    </div>
  )
}

