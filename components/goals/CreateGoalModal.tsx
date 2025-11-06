'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { X } from 'lucide-react'

interface CreateGoalModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (goalId?: string) => void
}

export function CreateGoalModal({ isOpen, onClose, onSuccess }: CreateGoalModalProps) {
  const [title, setTitle] = useState('')
  const [mainGoal, setMainGoal] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          main_goal: mainGoal,
          description: description || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao criar meta')
      }

      const data = await response.json()
      const goalId = data.goal?.id

      // Reset form and close
      setTitle('')
      setMainGoal('')
      setDescription('')
      onClose()
      
      // Call success callback to refresh goals list and pass goalId for plan generation
      if (onSuccess) {
        onSuccess(goalId)
      }
    } catch (err) {
      console.error('Error creating goal:', err)
      setError(err instanceof Error ? err.message : 'Falha ao criar meta')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal onClose={onClose}>
      <div className="glass-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[rgba(0,212,255,0.3)] shadow-[0_0_40px_rgba(0,212,255,0.3)]">
        <div className="flex justify-between items-center p-6 border-b border-[rgba(0,212,255,0.3)]">
          <h2 className="text-2xl font-bold text-[#00d4ff] neon-glow">Criar Nova Meta</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-900 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Título da Meta *
            </label>
            <Input
              id="title"
              type="text"
              placeholder="ex: Dominar Oratória Pública"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="mainGoal" className="block text-sm font-medium text-gray-300 mb-2">
              Sua Única Coisa *
            </label>
            <textarea
              id="mainGoal"
              rows={5}
              className="w-full px-4 py-2 border border-[rgba(0,212,255,0.3)] bg-[rgba(0,0,0,0.4)] text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent focus:shadow-[0_0_15px_rgba(0,212,255,0.3)] resize-none backdrop-blur-sm transition-all duration-300"
              placeholder="Descreva a meta que dá sentido à sua vida, carreira e rotina..."
              value={mainGoal}
              onChange={(e) => setMainGoal(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Descrição (Opcional)
            </label>
            <textarea
              id="description"
              rows={3}
              className="w-full px-4 py-2 border border-[rgba(0,212,255,0.3)] bg-[rgba(0,0,0,0.4)] text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent focus:shadow-[0_0_15px_rgba(0,212,255,0.3)] resize-none backdrop-blur-sm transition-all duration-300"
              placeholder="Contexto adicional sobre sua meta..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-[rgba(0,212,255,0.3)]">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading} disabled={loading}>
              Criar Meta
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
