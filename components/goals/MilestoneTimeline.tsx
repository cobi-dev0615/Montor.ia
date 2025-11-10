'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {milestones.map((milestone, index) => {
            const orderLabel = String(index + 1).padStart(2, '0')
            const statusColor =
              milestone.status === 'completed'
                ? 'bg-green-500 text-gray-900'
                : milestone.status === 'in_progress'
                ? 'bg-primary-500 text-gray-900'
                : 'bg-gray-600 text-gray-200'

            return (
              <div
                key={milestone.id}
                className="flex flex-col h-full rounded-xl border border-gray-700 bg-gray-800/60 p-5 shadow-[0_0_15px_rgba(0,0,0,0.25)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full font-semibold ${statusColor}`}>
                    {orderLabel}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-100">{milestone.title}</h4>
                        {milestone.description && (
                          <p className="mt-2 text-sm text-gray-400">{milestone.description}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMilestone(milestone.id)}
                        className="h-8 w-8 rounded-full border border-gray-700 text-gray-300 hover:text-primary-400 bg-transparent flex items-center justify-center"
                      >
                        {expandedMilestones.has(milestone.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs uppercase tracking-wide">
                      {milestone.status === 'completed' ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-green-400">Concluído</span>
                        </>
                      ) : milestone.status === 'in_progress' ? (
                        <>
                          <Circle className="h-3.5 w-3.5 text-primary-400" />
                          <span className="text-primary-300">Em andamento</span>
                        </>
                      ) : (
                        <>
                          <Circle className="h-3.5 w-3.5 text-gray-500" />
                          <span className="text-gray-400">Pendente</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {expandedMilestones.has(milestone.id) && (
                  <div className="mt-5 space-y-3">
                    {actions[milestone.id] && actions[milestone.id].length > 0 ? (
                      <ol className="space-y-3">
                        {actions[milestone.id].map((action, actionIndex) => {
                          const actionLabel = `${orderLabel}.${actionIndex + 1}`
                          const actionCompleted = action.status === 'completed'

                          return (
                            <li
                              key={action.id}
                              className="flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-900/60 p-3"
                            >
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-semibold text-primary-300">
                                {actionLabel}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p
                                      className={`text-sm font-medium ${
                                        actionCompleted ? 'text-green-400 line-through' : 'text-gray-100'
                                      }`}
                                    >
                                      {action.title}
                                    </p>
                                    {action.description && (
                                      <p className="mt-1 text-xs text-gray-400">{action.description}</p>
                                    )}
                                  </div>
                                  {!actionCompleted && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleMarkActionDone(action.id)}
                                      disabled={updatingActionId === action.id}
                                      className="px-2 py-1 text-xs"
                                    >
                                      {updatingActionId === action.id ? '...' : 'Concluir'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ol>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Ainda não há micro-ações</p>
                    )}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <div className="text-xs text-gray-500">Marco {index + 1} de {totalCount}</div>
                  {milestone.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkComplete(milestone.id)}
                      disabled={updatingId === milestone.id}
                    >
                      {updatingId === milestone.id ? 'Atualizando...' : 'Marcar como Concluído'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
