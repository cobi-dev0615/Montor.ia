'use client'

import { Card } from '@/components/ui/Card'
import { AvatarEvolution } from '@/components/progress/AvatarEvolution'
import { ProgressTimeline } from '@/components/progress/ProgressTimeline'
import { ProgressCharts } from '@/components/progress/ProgressCharts'
import { ProgressStats } from '@/components/progress/ProgressStats'
import { ActiveGoalsProgress } from '@/components/progress/ActiveGoalsProgress'

export default function ProgressPage() {
  return (
    <div className="space-y-4 xl:space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-gray-100">Meu Progresso</h1>
        <p className="text-sm text-gray-400">Acompanhe sua jornada e celebre conquistas</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:gap-5 xl:grid-cols-3 auto-rows-[minmax(0,1fr)]">
        <Card className="p-4 md:p-5 h-full">
          <ProgressStats />
        </Card>

        <Card className="p-4 md:p-5 h-[400px] overflow-hidden">
          <div className="h-full overflow-y-auto pr-1 custom-scrollbar">
            <AvatarEvolution />
          </div>
        </Card>

        <Card className="p-4 md:p-5 h-[400px] overflow-hidden">
          <div className="h-full overflow-y-auto pr-1 custom-scrollbar">
            <h2 className="text-lg font-semibold text-gray-100 mb-3">Progresso das Metas Ativas</h2>
            <ActiveGoalsProgress />
          </div>
        </Card>

        <Card className="p-4 md:p-5 h-[360px] xl:col-span-2 overflow-hidden">
          <div className="h-full overflow-y-auto pr-1 custom-scrollbar">
            <ProgressCharts />
          </div>
        </Card>

        <Card className="p-4 md:p-5 h-[360px] overflow-hidden">
          <div className="h-full overflow-y-auto pr-1 custom-scrollbar">
            <ProgressTimeline />
          </div>
        </Card>
      </div>
    </div>
  )
}
