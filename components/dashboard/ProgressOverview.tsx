'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Loader2 } from 'lucide-react'

export function ProgressOverview() {
  const [overallProgress, setOverallProgress] = useState(0)
  const [goalsProgress, setGoalsProgress] = useState<Array<{ title: string; progress: number }>>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()
  const { user } = useUser()

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return

      try {
        // Fetch all active goals
        const response = await fetch('/api/goals')
        if (response.ok) {
          const data = await response.json()
          const activeGoals = (data.goals || []).filter((g: any) => g.status === 'active')
          
          if (activeGoals.length > 0) {
            // Calculate average progress across all goals
            const totalProgress = activeGoals.reduce((sum: number, goal: any) => sum + (goal.progress || 0), 0)
            const avgProgress = Math.round(totalProgress / activeGoals.length)
            setOverallProgress(avgProgress)
            
            // Store individual goal progress
            setGoalsProgress(activeGoals.map((g: any) => ({
              title: g.title,
              progress: g.progress || 0,
            })))
          } else {
            setOverallProgress(0)
            setGoalsProgress([])
          }
        }
      } catch (error) {
        console.error('Error fetching progress:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-gray-100">Progresso Geral</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Conclusão da Jornada</span>
            <span className="text-sm font-medium text-gray-100">{overallProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-primary-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
        
        {goalsProgress.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-medium">Por Meta:</p>
            {goalsProgress.slice(0, 3).map((goal, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400 truncate">{goal.title}</span>
                  <span className="text-xs text-gray-500 ml-2">{goal.progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-primary-400 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>
            ))}
            {goalsProgress.length > 3 && (
              <p className="text-xs text-gray-500">+{goalsProgress.length - 3} meta(s) adicional(is)</p>
            )}
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-2">
          Continue assim! A consistência é a chave para o crescimento.
        </p>
      </div>
    </div>
  )
}
