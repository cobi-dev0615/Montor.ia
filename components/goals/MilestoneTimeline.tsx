'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface MilestoneTimelineProps {
  goalId: string
}

export function MilestoneTimeline({ goalId }: MilestoneTimelineProps) {
  // TODO: Fetch milestones from Supabase
  const milestones: Array<{
    id: string
    title: string
    description: string
    status: 'pending' | 'in_progress' | 'completed'
    order_index: number
  }> = []

  const completedCount = milestones.filter(m => m.status === 'completed').length
  const totalCount = milestones.length
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Progress Journey</h3>
        <span className="text-sm text-gray-600">
          {completedCount} of {totalCount} completed
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No milestones yet. Start by creating milestones for your goal.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Milestones */}
          <div className="space-y-6">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="relative flex gap-4">
                {/* Icon */}
                <div className="relative z-10">
                  {milestone.status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 bg-white" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-400 bg-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className={`${milestone.status === 'completed' ? 'text-green-600' : milestone.status === 'in_progress' ? 'text-primary-600' : 'text-gray-600'}`}>
                    <h4 className="font-semibold mb-1">{milestone.title}</h4>
                    {milestone.description && (
                      <p className="text-sm mb-3">{milestone.description}</p>
                    )}
                    {milestone.status !== 'completed' && (
                      <Button size="sm" variant="outline">
                        Mark Complete
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
