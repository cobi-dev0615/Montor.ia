'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { CheckCircle2, Target, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface Activity {
  id: string
  description: string
  date: string
  type: 'action' | 'milestone' | 'goal'
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()
  const { user } = useUser()

  useEffect(() => {
    const fetchActivities = async () => {
      if (!user) return

      try {
        // Fetch recent progress logs
        const { data: logs } = await supabase
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
          .limit(5)

        if (logs) {
          const formattedActivities: Activity[] = logs.map((log: any) => {
            let description = ''
            let type: 'action' | 'milestone' | 'goal' = 'action'

            if (log.progress_type === 'action' && log.actions?.title) {
              description = `Completed action: "${log.actions.title}"`
              type = 'action'
            } else if (log.progress_type === 'milestone' && log.milestones?.title) {
              description = `Completed milestone: "${log.milestones.title}"`
              type = 'milestone'
            } else if (log.progress_type === 'goal' && log.goals?.title) {
              description = `Completed goal: "${log.goals.title}"`
              type = 'goal'
            } else {
              description = `Completed ${log.progress_type}`
            }

            return {
              id: log.id,
              description,
              date: format(new Date(log.created_at), 'MMM d, yyyy'),
              type,
            }
          })

          setActivities(formattedActivities)
        }
      } catch (error) {
        console.error('Error fetching activities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [user, supabase])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'milestone':
        return <Target className="w-4 h-4 text-primary-600" />
      case 'goal':
        return <Target className="w-4 h-4 text-green-600" />
      default:
        return <CheckCircle2 className="w-4 h-4 text-primary-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      {activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No recent activity</p>
          <p className="text-gray-400 text-xs mt-2">
            Start by creating your first goal!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="mt-1">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-100">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <Link
        href="/progress"
        className="text-sm text-primary-600 hover:underline mt-4 inline-block"
      >
        View All →
      </Link>
    </div>
  )
}
