'use client'

import { Card } from '@/components/ui/Card'
import { AvatarEvolution } from '@/components/progress/AvatarEvolution'
import { ProgressTimeline } from '@/components/progress/ProgressTimeline'
import { ProgressCharts } from '@/components/progress/ProgressCharts'
import { ProgressStats } from '@/components/progress/ProgressStats'
import { ActiveGoalsProgress } from '@/components/progress/ActiveGoalsProgress'

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Meu Progresso</h1>
        <p className="text-gray-400 mt-1">Acompanhe sua jornada e celebre conquistas</p>
      </div>

      {/* Stats Overview - Full Width Horizontal */}
      <Card>
        <ProgressStats />
      </Card>

      {/* Main Content Grid - Avatar and Goals Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avatar Evolution - Left Column */}
        <Card>
          <AvatarEvolution />
        </Card>

        {/* Active Goals Progress - Right Column */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Progresso das Metas Ativas</h2>
          <ActiveGoalsProgress />
        </Card>
      </div>

      {/* Charts and Timeline - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Charts - Left Column */}
        <Card>
          <ProgressCharts />
        </Card>

        {/* Progress Timeline - Right Column */}
        <Card>
          <ProgressTimeline />
        </Card>
      </div>
    </div>
  )
}
