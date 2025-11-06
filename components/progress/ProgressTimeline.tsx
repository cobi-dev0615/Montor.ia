'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { CheckCircle2, Target, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface ProgressLog {
  id: string
  goal_id: string | null
  milestone_id: string | null
  action_id: string | null
  progress_type: 'action' | 'milestone' | 'goal'
  points_earned: number
  created_at: string
  goals?: {
    title: string
  } | null
  milestones?: {
    title: string
  } | null
  actions?: {
    title: string
  } | null
}

type FilterType = 'all' | 'week' | 'month' | 'goal'

export function ProgressTimeline() {
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [goalFilter, setGoalFilter] = useState<string | null>(null)
  const [availableGoals, setAvailableGoals] = useState<Array<{ id: string; title: string }>>([])
  const supabase = createSupabaseClient()
  const { user } = useUser()
  const isFetchingLogs = useRef(false)
  const isFetchingGoals = useRef(false)

  const fetchGoals = useCallback(async () => {
    // Prevent duplicate concurrent fetches
    if (isFetchingGoals.current || !user) {
      return
    }

    isFetchingGoals.current = true
    try {

      const { data: goals } = await supabase
        .from('goals')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (goals) {
        setAvailableGoals(goals)
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      isFetchingGoals.current = false
    }
  }, [supabase, user])

  const fetchProgressLogs = useCallback(async () => {
    // Prevent duplicate concurrent fetches
    if (isFetchingLogs.current || !user) {
      return
    }

    isFetchingLogs.current = true
    setLoading(true)
    try {

      let query = supabase
        .from('progress_logs')
        .select(`
          *,
          goals:goal_id (title),
          milestones:milestone_id (title),
          actions:action_id (title)
        `)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50)

      // Apply filters
      if (filter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('created_at', weekAgo.toISOString())
      } else if (filter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        query = query.gte('created_at', monthAgo.toISOString())
      }

      if (goalFilter) {
        query = query.eq('goal_id', goalFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching progress logs:', error)
        return
      }

      setProgressLogs((data || []) as ProgressLog[])
    } catch (error) {
      console.error('Error fetching progress logs:', error)
    } finally {
      setLoading(false)
      isFetchingLogs.current = false
    }
  }, [supabase, filter, goalFilter, user])

  useEffect(() => {
    fetchProgressLogs()
    // Only fetch goals once on mount
    if (availableGoals.length === 0) {
      fetchGoals()
    }
  }, [fetchProgressLogs, fetchGoals, availableGoals.length])

  const getProgressDescription = (log: ProgressLog): string => {
    if (log.progress_type === 'action' && log.actions?.title) {
      return `Completed action: "${log.actions.title}"`
    } else if (log.progress_type === 'milestone' && log.milestones?.title) {
      return `Completed milestone: "${log.milestones.title}"`
    } else if (log.progress_type === 'goal' && log.goals?.title) {
      return `Completed goal: "${log.goals.title}"`
    }
    return `Completed ${log.progress_type}`
  }

  const getProgressIcon = (type: string) => {
    switch (type) {
      case 'milestone':
        return <Target className="w-5 h-5 text-[#00d4ff]" />
      case 'goal':
        return <Target className="w-5 h-5 text-green-400" />
      default:
        return <CheckCircle2 className="w-5 h-5 text-[#00d4ff]" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Progress History</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setFilter('all')
              setGoalFilter(null)
            }}
            className={`text-sm px-3 py-1 rounded-lg transition-colors ${
              filter === 'all' && !goalFilter
                ? 'bg-[rgba(0,212,255,0.2)] text-[#00d4ff] border border-[rgba(0,212,255,0.5)]'
                : 'text-gray-300 hover:bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              setFilter('week')
              setGoalFilter(null)
            }}
            className={`text-sm px-3 py-1 rounded-lg transition-colors ${
              filter === 'week'
                ? 'bg-[rgba(0,212,255,0.2)] text-[#00d4ff] border border-[rgba(0,212,255,0.5)]'
                : 'text-gray-300 hover:bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)]'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => {
              setFilter('month')
              setGoalFilter(null)
            }}
            className={`text-sm px-3 py-1 rounded-lg transition-colors ${
              filter === 'month'
                ? 'bg-[rgba(0,212,255,0.2)] text-[#00d4ff] border border-[rgba(0,212,255,0.5)]'
                : 'text-gray-300 hover:bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)]'
            }`}
          >
            This Month
          </button>
          {availableGoals.length > 0 && (
            <select
              value={goalFilter || ''}
              onChange={(e) => {
                setGoalFilter(e.target.value || null)
                setFilter('all')
              }}
              className="text-sm px-3 py-1 rounded-lg border border-[rgba(0,212,255,0.3)] text-gray-300 bg-[rgba(0,0,0,0.4)] hover:bg-[rgba(0,212,255,0.1)] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] backdrop-blur-sm"
            >
              <option value="">By Goal</option>
              {availableGoals.map((goal) => (
                <option key={goal.id} value={goal.id} className="bg-gray-800">
                  {goal.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {progressLogs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No progress history yet.</p>
          <p className="text-sm mt-2">Start completing actions and milestones to see your progress here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {progressLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 pb-4 border-b border-[rgba(0,212,255,0.2)] last:border-0"
            >
              <div className="w-10 h-10 rounded-full bg-[rgba(0,212,255,0.2)] flex items-center justify-center flex-shrink-0 border border-[rgba(0,212,255,0.3)]">
                {getProgressIcon(log.progress_type)}
              </div>
              <div className="flex-1">
                <p className="text-gray-100 font-medium">{getProgressDescription(log)}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {log.goals && (
                    <Link
                      href={`/goals/${log.goal_id}`}
                      className="text-xs text-[#00d4ff] hover:text-[#00ffff] hover:underline"
                    >
                      {log.goals.title}
                    </Link>
                  )}
                  <span className="text-xs text-gray-400">
                    {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                  <span className="text-xs text-[#00d4ff] font-semibold">
                    +{log.points_earned} points
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
