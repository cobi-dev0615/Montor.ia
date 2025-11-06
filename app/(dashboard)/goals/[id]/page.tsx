'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, Edit, Trash2, Loader2 } from 'lucide-react'
import { OneThingDisplay } from '@/components/goals/OneThingDisplay'
import { MilestoneTimeline } from '@/components/goals/MilestoneTimeline'
import { EditGoalModal } from '@/components/goals/EditGoalModal'

interface Goal {
  id: string
  title: string
  description: string | null
  main_goal: string
  status: 'active' | 'completed' | 'paused'
  progress: number
  created_at: string
  updated_at: string
}

export default function GoalDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [goal, setGoal] = useState<Goal | null>(null)
  const [hasMilestones, setHasMilestones] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchGoal = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/goals/${params.id}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao buscar meta')
      }
      const data = await response.json()
      setGoal(data.goal)

      // Don't fetch milestones here - MilestoneTimeline will handle it
      // and notify us via onMilestonesLoaded callback
    } catch (err) {
      console.error('Error fetching goal:', err)
      setError(err instanceof Error ? err.message : 'Falha ao carregar meta')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGoal()
  }, [params.id])

  const handleDelete = async () => {
    if (!confirm('Tem certeza de que deseja excluir esta meta? Esta ação não pode ser desfeita.')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/goals/${params.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao excluir meta')
      }

      router.push('/goals')
    } catch (err) {
      console.error('Error deleting goal:', err)
      alert(err instanceof Error ? err.message : 'Falha ao excluir meta')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleGoalUpdated = () => {
    fetchGoal()
    setIsEditModalOpen(false)
  }

  const handleMilestonesLoaded = useCallback((hasMilestones: boolean) => {
    setHasMilestones(hasMilestones)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (error || !goal) {
    return (
      <Card>
        <div className="p-6 text-center">
          <p className="text-red-600 mb-4">{error || 'Meta não encontrada'}</p>
          <Link href="/goals">
            <Button variant="outline">Voltar para Metas</Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/goals">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Metas
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-100">{goal.title}</h1>
          {goal.description && (
            <p className="text-gray-400 mt-2">{goal.description}</p>
          )}
        </div>
        <Badge variant={goal.status as any}>{goal.status}</Badge>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </div>
      </div>

      {/* One Thing Display */}
      <OneThingDisplay mainGoal={goal.main_goal} />

      {/* Milestones */}
      <Card>
        <MilestoneTimeline 
          goalId={goal.id} 
          onUpdate={() => {
            // Only update milestones status, don't reload entire goal
            // MilestoneTimeline handles its own refresh
          }}
          onMilestonesLoaded={handleMilestonesLoaded}
        />
      </Card>

      {/* Generate Plan Button (if no milestones exist) */}
      {!hasMilestones && (
        <Card>
          <div className="p-6 bg-primary-900 border border-primary-700 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-primary-100 mb-2">
              Pronto para criar seu plano de ação?
            </h3>
            <p className="text-primary-200 mb-4">
              Deixe o Mentor.ai dividir sua meta em marcos e micro-ações diárias.
            </p>
            <Button
              onClick={async () => {
                setIsGenerating(true)
                try {
                  const response = await fetch(`/api/goals/${goal.id}/generate-plan`, {
                    method: 'POST',
                  })

                  if (!response.ok) {
                    const data = await response.json()
                    throw new Error(data.error || 'Falha ao gerar plano')
                  }

                  // Refresh the page to show generated plan
                  await fetchGoal()
                } catch (err) {
                  console.error('Error generating plan:', err)
                  alert(err instanceof Error ? err.message : 'Falha ao gerar plano')
                } finally {
                  setIsGenerating(false)
                }
              }}
              loading={isGenerating}
              disabled={isGenerating}
            >
              {isGenerating ? 'Gerando Plano...' : 'Gerar Plano com Mentor'}
            </Button>
          </div>
        </Card>
      )}


      {/* Edit Goal Modal */}
      {isEditModalOpen && goal && (
        <EditGoalModal
          goal={goal}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleGoalUpdated}
        />
      )}
    </div>
  )
}
