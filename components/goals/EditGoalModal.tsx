'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { X } from 'lucide-react'

interface Goal {
  id: string
  title: string
  description: string | null
  main_goal: string
  status: 'active' | 'completed' | 'paused'
}

interface EditGoalModalProps {
  goal: Goal
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function EditGoalModal({ goal, isOpen, onClose, onSuccess }: EditGoalModalProps) {
  const [title, setTitle] = useState(goal.title)
  const [mainGoal, setMainGoal] = useState(goal.main_goal)
  const [description, setDescription] = useState(goal.description || '')
  const [status, setStatus] = useState(goal.status)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setTitle(goal.title)
      setMainGoal(goal.main_goal)
      setDescription(goal.description || '')
      setStatus(goal.status)
      setError(null)
    }
  }, [isOpen, goal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          main_goal: mainGoal,
          description: description || null,
          status,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update goal')
      }

      onClose()
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error('Error updating goal:', err)
      setError(err instanceof Error ? err.message : 'Failed to update goal')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal onClose={onClose}>
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-gray-100">Edit Goal</h2>
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
              Goal Title *
            </label>
            <Input
              id="title"
              type="text"
              placeholder="e.g., Master Public Speaking"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="mainGoal" className="block text-sm font-medium text-gray-300 mb-2">
              Your One Thing *
            </label>
            <textarea
              id="mainGoal"
              rows={5}
              className="w-full px-4 py-2 border border-gray-700 bg-gray-800 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-50"
              placeholder="Describe the goal that gives meaning to your life, career, and routine..."
              value={mainGoal}
              onChange={(e) => setMainGoal(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              rows={3}
              className="w-full px-4 py-2 border border-gray-700 bg-gray-800 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-50"
              placeholder="Additional context about your goal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
              disabled={loading}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={loading}>
              Update Goal
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

