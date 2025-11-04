import { Card } from '@/components/ui/Card'
import { AvatarEvolution } from '@/components/progress/AvatarEvolution'
import { ProgressTimeline } from '@/components/progress/ProgressTimeline'
import { ProgressCharts } from '@/components/progress/ProgressCharts'

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Progress</h1>
        <p className="text-gray-600 mt-1">Track your journey and celebrate achievements</p>
      </div>

      {/* Avatar Evolution */}
      <Card>
        <AvatarEvolution />
      </Card>

      {/* Current Goals Progress */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Goals Progress</h2>
        {/* TODO: List of goals with progress */}
        <p className="text-gray-500 text-sm">No active goals yet</p>
      </Card>

      {/* Progress Timeline */}
      <Card>
        <ProgressTimeline />
      </Card>

      {/* Progress Charts */}
      <Card>
        <ProgressCharts />
      </Card>
    </div>
  )
}
