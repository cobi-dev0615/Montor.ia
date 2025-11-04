'use client'

import Link from 'next/link'

export function RecentActivity() {
  // TODO: Fetch recent activity from Supabase
  const activities: Array<{ date: string; description: string; type: string }> = []

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      {activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No recent activity</p>
          <p className="text-gray-400 text-xs mt-2">
            Start by creating your first goal!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary-600 mt-2" />
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <Link
        href="/progress"
        className="text-sm text-primary-600 hover:underline mt-4 inline-block"
      >
        View All →
      </Link>
    </div>
  )
}
