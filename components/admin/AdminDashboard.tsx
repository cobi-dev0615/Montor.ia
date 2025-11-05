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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Users (30 days)',
      value: stats.activeUsers.toString(),
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Goals',
      value: stats.totalGoals.toString(),
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Total Messages',
      value: stats.totalMessages.toString(),
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'New Users (This Month)',
      value: stats.newUsersThisMonth.toString(),
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Growth Rate',
      value: `${stats.growthPercentage >= 0 ? '+' : ''}${stats.growthPercentage}%`,
      icon: TrendingUp,
      color: stats.growthPercentage >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: stats.growthPercentage >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Platform overview and statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <a
            href="/admin/users"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            View All Users
          </a>
          <a
            href="/admin/users"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Manage Users
          </a>
        </div>
      </Card>
    </div>
  )
}

