import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MoreVertical } from 'lucide-react'

interface GoalCardProps {
  goal: {
    id: string
    title: string
    main_goal: string
    status: string
    progress: number
  }
}

export function GoalCard({ goal }: GoalCardProps) {
  return (
    <Link href={`/goals/${goal.id}`}>
      <Card variant="goal">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
          <Badge variant={goal.status as any}>{goal.status}</Badge>
        </div>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{goal.main_goal}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Progress</span>
            <span>{goal.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>
      </Card>
    </Link>
  )
}
