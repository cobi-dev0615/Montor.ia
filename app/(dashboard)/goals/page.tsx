'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GoalCard } from '@/components/goals/GoalCard'
import { CreateGoalModal } from '@/components/goals/CreateGoalModal'
import { Plus, Loader2 } from 'lucide-react'

interface Goal {
  id: string
  title: string
  main_goal: string
  description: string | null
  status: string
  progress: number
  created_at: string
  updated_at: string
}

export default function GoalsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if there are any incomplete goals (not completed)
  const hasIncompleteGoals = goals.some((goal) => goal.status !== 'completed')

  const fetchGoals = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/goals')
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao buscar metas')
      }
      const data = await response.json()
      setGoals(data.goals || [])
    } catch (err) {
      console.error('Error fetching goals:', err)
      setError(err instanceof Error ? err.message : 'Falha ao carregar metas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [])

  const [newlyCreatedGoalId, setNewlyCreatedGoalId] = useState<string | null>(null)

  const handleGoalCreated = (goalId?: string) => {
    fetchGoals()
    setIsCreateModalOpen(false)
    if (goalId) {
      setNewlyCreatedGoalId(goalId)
    }
  }

  const handleGeneratePlan = async (goalId: string) => {
    try {
      const response = await fetch(`/api/goals/${goalId}/generate-plan`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao gerar plano')
      }

      // Refresh goals and navigate to goal detail
      await fetchGoals()
      setNewlyCreatedGoalId(null)
      window.location.href = `/goals/${goalId}`
    } catch (err) {
      console.error('Error generating plan:', err)
      alert(err instanceof Error ? err.message : 'Falha ao gerar plano')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#00d4ff] neon-glow">Minhas Metas</h1>
          <p className="text-gray-300 mt-1">Gerencie suas metas e acompanhe o progresso</p>
          {hasIncompleteGoals && (
            <p className="text-xs text-[#ff6b35] mt-1">
              Complete suas metas atuais antes de criar novas
            </p>
          )}
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          disabled={hasIncompleteGoals}
          title={
            hasIncompleteGoals
              ? 'Por favor, complete suas metas atuais antes de criar novas'
              : 'Criar uma nova meta'
          }
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar Meta
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchGoals}
              className="ml-4"
            >
              Tentar Novamente
            </Button>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        </Card>
      )}

      {/* Goals Grid */}
      {!loading && !error && goals.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-semibold text-gray-100 mb-2">Ainda não há metas</h2>
            <p className="text-gray-400 mb-6">
              Comece sua jornada definindo sua única coisa
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              disabled={hasIncompleteGoals}
              title={
                hasIncompleteGoals
                  ? 'Por favor, complete suas metas atuais antes de criar novas'
                  : 'Criar sua primeira meta'
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Sua Primeira Meta
            </Button>
          </div>
        </Card>
      )}

      {!loading && !error && goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      {/* Generate Plan Prompt for New Goal */}
      {newlyCreatedGoalId && (
        <Card>
          <div className="p-6 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-primary-900 mb-2">
                  Meta Criada com Sucesso! 🎉
                </h3>
                <p className="text-primary-700">
                  Pronto para criar seu plano de ação? Deixe o Mentor.ai dividir sua meta em marcos e micro-ações diárias.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setNewlyCreatedGoalId(null)}
                >
                  Pular por Agora
                </Button>
                <Button
                  onClick={() => handleGeneratePlan(newlyCreatedGoalId)}
                >
                  Gerar Plano com Mentor
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Create Goal Modal */}
      <CreateGoalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleGoalCreated}
      />
    </div>
  )
}
