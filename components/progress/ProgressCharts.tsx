'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Loader2 } from 'lucide-react'

interface WeeklyData {
  day: string
  points: number
}

interface MonthlyData {
  week: string
  points: number
}

export function ProgressCharts() {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()
  const { user } = useUser()
  const isFetching = useRef(false)

  const fetchChartData = useCallback(async () => {
    // Prevent duplicate concurrent fetches
    if (isFetching.current || !user) {
      return
    }

    isFetching.current = true
    setLoading(true)
    try {

      // Get progress logs for the last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: logs } = await supabase
        .from('progress_logs')
        .select('points_earned, created_at')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true })

      if (!logs) return

      // Process weekly data (last 7 days)
      const weeklyPoints: Record<string, number> = {}
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return date
      })

      last7Days.forEach((date) => {
        const dayKey = days[date.getDay()]
        weeklyPoints[dayKey] = 0
      })

      logs.forEach((log) => {
        const logDate = new Date(log.created_at)
        const daysDiff = Math.floor((Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff < 7) {
          const dayKey = days[logDate.getDay()]
          weeklyPoints[dayKey] = (weeklyPoints[dayKey] || 0) + log.points_earned
        }
      })

      setWeeklyData(
        last7Days.map((date) => ({
          day: days[date.getDay()],
          points: weeklyPoints[days[date.getDay()]] || 0,
        }))
      )

      // Process monthly data (last 4 weeks)
      const monthlyPoints: Record<string, number> = {}
      const weeks = Array.from({ length: 4 }, (_, i) => {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - (7 * (4 - i - 1)))
        return `Week ${i + 1}`
      })

      weeks.forEach((week) => {
        monthlyPoints[week] = 0
      })

      logs.forEach((log) => {
        const logDate = new Date(log.created_at)
        const weeksAgo = Math.floor((Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
        if (weeksAgo < 4) {
          const weekKey = `Week ${4 - weeksAgo}`
          monthlyPoints[weekKey] = (monthlyPoints[weekKey] || 0) + log.points_earned
        }
      })

      setMonthlyData(
        weeks.map((week) => ({
          week,
          points: monthlyPoints[week] || 0,
        }))
      )
    } catch (error) {
      console.error('Error fetching chart data:', error)
    } finally {
      setLoading(false)
      isFetching.current = false
    }
  }, [supabase, user])

  useEffect(() => {
    fetchChartData()
  }, [fetchChartData])

  const maxWeeklyPoints = Math.max(...weeklyData.map((d) => d.points), 1)
  const maxMonthlyPoints = Math.max(...monthlyData.map((d) => d.points), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Progress Charts</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Progress */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4">Weekly Progress (Last 7 Days)</h3>
          <div className="space-y-3">
            {weeklyData.map((data, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-12 text-xs text-gray-600 text-right">{data.day}</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-6 relative">
                    <div
                      className="bg-primary-600 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{
                        width: `${(data.points / maxWeeklyPoints) * 100}%`,
                        minWidth: data.points > 0 ? '30px' : '0',
                      }}
                    >
                      {data.points > 0 && (
                        <span className="text-xs text-white font-medium">{data.points}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Progress */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4">Monthly Progress (Last 4 Weeks)</h3>
          <div className="space-y-3">
            {monthlyData.map((data, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-16 text-xs text-gray-600 text-right">{data.week}</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-6 relative">
                    <div
                      className="bg-green-600 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{
                        width: `${(data.points / maxMonthlyPoints) * 100}%`,
                        minWidth: data.points > 0 ? '40px' : '0',
                      }}
                    >
                      {data.points > 0 && (
                        <span className="text-xs text-white font-medium">{data.points}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
