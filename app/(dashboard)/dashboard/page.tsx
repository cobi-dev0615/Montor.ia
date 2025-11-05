import { Card } from '@/components/ui/Card'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { AvatarDisplay } from '@/components/dashboard/AvatarDisplay'
import { ProgressOverview } from '@/components/dashboard/ProgressOverview'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { Target, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
        <p className="text-gray-600 mt-2">Here's your overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Goals"
          value="0"
          icon={<Target className="w-6 h-6" />}
        />
        <StatsCard
          title="Progress Points"
          value="0"
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <StatsCard
          title="Consistency Streak"
          value="0 days"
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <StatsCard
          title="Avatar Level"
          value="Level 1"
          subValue="Seed"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Avatar + Progress */}
        <div className="space-y-6">
          <Card>
            <AvatarDisplay />
          </Card>
          <Card>
            <ProgressOverview />
          </Card>
        </div>

        {/* Right: Recent Activity */}
        <div>
          <Card>
            <RecentActivity />
          </Card>
        </div>
      </div>

    </div>
  )
}
