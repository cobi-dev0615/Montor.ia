'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface Milestone {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed'
  order_index: number
  completed_at: string | null
}

interface MicroAction {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'completed'
  completed_at: string | null
  milestone_id: string
}

interface MilestoneTimelineProps {
  goalId: string
  onUpdate?: () => void
  onMilestonesLoaded?: (hasMilestones: boolean) => void
}

export function MilestoneTimeline({ goalId, onUpdate, onMilestonesLoaded }: MilestoneTimelineProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [actions, setActions] = useState<Record<string, MicroAction[]>>({})
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null)
  
  // Use ref to track if we've already set initial expanded state
  const hasInitializedExpanded = useRef(false)
  // Use ref to prevent duplicate fetches
  const isFetching = useRef(false)

  const fetchMilestones = useCallback(async () => {
    // Prevent duplicate concurrent fetches
    if (isFetching.current) {
      return
    }
    
    isFetching.current = true
    setLoading(true)
    
    try {
      const response = await fetch(`/api/goals/${goalId}/milestones`)
      if (!response.ok) {
        throw new Error('Failed to fetch milestones')
      }
      const data = await response.json()
      // Sort by order_index
      const sorted = (data.milestones || []).sort((a: Milestone, b: Milestone) => 
        a.order_index - b.order_index
      )
      setMilestones(sorted)
      
      // Auto-expand first milestone only once
      if (sorted.length > 0 && !hasInitializedExpanded.current) {
        setExpandedMilestones(new Set([sorted[0].id]))
        hasInitializedExpanded.current = true
      }
      
      // Fetch actions for all milestones in parallel
      const actionsPromises = sorted.map(async (milestone: Milestone) => {
        try {
          const actionsResponse = await fetch(`/api/milestones/${milestone.id}/actions`)
          if (actionsResponse.ok) {
            const actionsData = await actionsResponse.json()
            return { milestoneId: milestone.id, actions: actionsData.actions || [] }
          }
        } catch (error) {
          console.error(`Error fetching actions for milestone ${milestone.id}:`, error)
        }
        return { milestoneId: milestone.id, actions: [] }
      })
      
      const actionsResults = await Promise.all(actionsPromises)
      const actionsMap: Record<string, MicroAction[]> = {}
      actionsResults.forEach(({ milestoneId, actions }) => {
        actionsMap[milestoneId] = actions
      })
      
      setActions(actionsMap)
      
      // Notify parent about milestones status (don't include in deps to avoid re-renders)
      if (onMilestonesLoaded) {
        onMilestonesLoaded(sorted.length > 0)
      }
    } catch (error) {
      console.error('Error fetching milestones:', error)
      if (onMilestonesLoaded) {
        onMilestonesLoaded(false)
      }
    } finally {
      setLoading(false)
      isFetching.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId])

  const toggleMilestone = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones)
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId)
    } else {
      newExpanded.add(milestoneId)
    }
    setExpandedMilestones(newExpanded)
  }

  const handleMarkActionDone = async (actionId: string) => {
    setUpdatingActionId(actionId)
    try {
      const response = await fetch(`/api/actions/${actionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update action')
      }

      const data = await response.json()
      const updatedAction = data.action

      // Find which milestone this action belongs to and update only that action
      const milestoneId = Object.keys(actions).find(mid => 
        actions[mid].some(a => a.id === actionId)
      )

      if (milestoneId && updatedAction) {
        // Update only the specific action in state
        setActions(prev => {
          const updatedActions = {
            ...prev,
            [milestoneId]: prev[milestoneId].map(action =>
              action.id === actionId ? { ...action, ...updatedAction } : action
            )
          }

          // Check if all actions in this milestone are now completed
          const updatedActionsForMilestone = updatedActions[milestoneId]
          const allCompleted = updatedActionsForMilestone.length > 0 && 
            updatedActionsForMilestone.every(a => a.status === 'completed')
          
          // If all actions completed, update milestone status to in_progress
          if (allCompleted) {
            setMilestones(currentMilestones => currentMilestones.map(m => 
              m.id === milestoneId && m.status === 'pending'
                ? { ...m, status: 'in_progress' as const }
                : m
            ))
          }

          return updatedActions
        })
      }
    } catch (error) {
      console.error('Error updating action:', error)
      alert('Falha ao marcar ação como concluída')
    } finally {
      setUpdatingActionId(null)
    }
  }

  useEffect(() => {
    fetchMilestones()
  }, [fetchMilestones])

  const handleMarkComplete = async (milestoneId: string) => {
    setUpdatingId(milestoneId)
    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update milestone')
      }

      const data = await response.json()
      const updatedMilestone = data.milestone

      // Update only the specific milestone in state
      setMilestones(prev => prev.map(m => 
        m.id === milestoneId ? { ...m, ...updatedMilestone } : m
      ))

      // Update all actions for this milestone to completed
      if (updatedMilestone.status === 'completed' && actions[milestoneId]) {
        setActions(prev => ({
          ...prev,
          [milestoneId]: prev[milestoneId].map(action => ({
            ...action,
            status: 'completed' as const,
            completed_at: updatedMilestone.completed_at || new Date().toISOString(),
          }))
        }))
      }
    } catch (error) {
      console.error('Error updating milestone:', error)
      alert('Falha ao marcar marco como concluído')
    } finally {
      setUpdatingId(null)
    }
  }

  const completedCount = milestones.filter(m => m.status === 'completed').length
  const totalCount = milestones.length
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-100">Jornada de Progresso</h3>
        <span className="text-sm text-gray-400">
          {completedCount} de {totalCount} concluídos
        </span>
      </div>

      <div className="w-full bg-gray-700 rounded-full h-2 mb-8">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Ainda não há marcos. Comece criando marcos para sua meta.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700" />

          {/* Milestones */}
          <div className="space-y-6">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="relative flex gap-4">
                {/* Icon */}
                <div className="relative z-10">
                  {milestone.status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 bg-gray-800" />
                  ) : milestone.status === 'in_progress' ? (
                    <Circle className="w-6 h-6 text-primary-500 bg-gray-800" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-500 bg-gray-800" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className={`${milestone.status === 'completed' ? 'text-green-400' : milestone.status === 'in_progress' ? 'text-primary-400' : 'text-gray-400'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{milestone.title}</h4>
                        {milestone.description && (
                          <p className="text-sm mb-3">{milestone.description}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMilestone(milestone.id)}
                        className="ml-2"
                      >
                        {expandedMilestones.has(milestone.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Micro-actions */}
                    {expandedMilestones.has(milestone.id) && (
                      <div className="mt-4 space-y-2">
                        {actions[milestone.id] && actions[milestone.id].length > 0 ? (
                          actions[milestone.id].map((action) => (
                            <Card key={action.id} className="p-3 bg-gray-700">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {action.status === 'completed' ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    )}
                                    <h5 className={`text-sm font-medium ${
                                      action.status === 'completed' ? 'text-green-400 line-through' : 'text-gray-100'
                                    }`}>
                                      {action.title}
                                    </h5>
                                  </div>
                                  {action.description && (
                                    <p className="text-xs text-gray-400 ml-6">{action.description}</p>
                                  )}
                                </div>
                                {action.status !== 'completed' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMarkActionDone(action.id)}
                                    disabled={updatingActionId === action.id}
                                    className="flex-shrink-0"
                                  >
                                    {updatingActionId === action.id ? '...' : 'Marcar como concluído'}
                                  </Button>
                                )}
                              </div>
                            </Card>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic ml-6">Ainda não há micro-ações</p>
                        )}
                      </div>
                    )}

                    {milestone.status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkComplete(milestone.id)}
                        disabled={updatingId === milestone.id}
                        className="mt-3"
                      >
                        {updatingId === milestone.id ? 'Atualizando...' : 'Marcar como Concluído'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
