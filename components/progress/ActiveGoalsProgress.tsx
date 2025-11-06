'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Loader2, ArrowRight } from 'lucide-react'

interface Goal {
  id: string
  title: string
  progress: number
  status: string
}

export function ActiveGoalsProgress() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()
  const isFetching = useRef(false)

  const fetchGoals = useCallback(async () => {
    // Prevent duplicate concurrent fetches
    if (isFetching.current) {
      return
    }

    isFetching.current = true
    setLoading(true)
    try {
      const response = await fetch('/api/goals')
      if (response.ok) {
        const data = await response.json()
        // Filter only active goals
        const activeGoals = (data.goals || []).filter(
          (goal: Goal) => goal.status === 'active'
        )
        setGoals(activeGoals)
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
      isFetching.current = false
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm">No active goals yet.</p>
        <Link href="/goals" className="text-[#00d4ff] hover:text-[#00ffff] hover:underline text-sm mt-2 inline-block">
          Create your first goal
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {goals.map((goal) => (
        <Link
          key={goal.id}
          href={`/goals/${goal.id}`}
          className="block p-4 border border-[rgba(0,212,255,0.3)] rounded-lg hover:bg-[rgba(0,212,255,0.1)] transition-colors glass-card"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-100">{goal.title}</h3>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">Progress</span>
              <span className="text-[#00d4ff] font-medium">{goal.progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#00d4ff] to-[#0099ff] h-2 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,212,255,0.5)]"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

