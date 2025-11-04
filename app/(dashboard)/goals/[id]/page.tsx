import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { OneThingDisplay } from '@/components/goals/OneThingDisplay'
import { MilestoneTimeline } from '@/components/goals/MilestoneTimeline'

export default function GoalDetailPage({
  params,
}: {
  params: { id: string }
}) {
  // TODO: Fetch goal data from Supabase
  const goal = {
    id: params.id,
    title: 'Sample Goal',
    description: 'Sample description',
    main_goal: 'This is my one thing that gives meaning to my life',
    status: 'active',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/goals">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Goals
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{goal.title}</h1>
          {goal.description && (
            <p className="text-gray-600 mt-2">{goal.description}</p>
          )}
        </div>
        <Badge variant={goal.status as any}>{goal.status}</Badge>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Edit</Button>
          <Button variant="outline" size="sm">Delete</Button>
        </div>
      </div>

      {/* One Thing Display */}
      <OneThingDisplay mainGoal={goal.main_goal} />

      {/* Milestones */}
      <Card>
        <MilestoneTimeline goalId={goal.id} />
      </Card>

      {/* Chat Context */}
      <Card>
        <Link href={`/chat?goalId=${goal.id}`}>
          <Button className="w-full">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat with Mentor about this goal
          </Button>
        </Link>
      </Card>
    </div>
  )
}
