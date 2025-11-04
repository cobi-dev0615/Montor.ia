'use client'

export function ProgressTimeline() {
  // TODO: Fetch progress logs from Supabase
  const progressLogs: Array<{
    id: string
    description: string
    date: string
    points: number
    type: string
  }> = []

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Progress History</h2>
        <div className="flex gap-2">
          <button className="text-sm px-3 py-1 bg-primary-100 text-primary-700 rounded-lg">
            All
          </button>
          <button className="text-sm px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg">
            This Week
          </button>
          <button className="text-sm px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg">
            This Month
          </button>
        </div>
      </div>

      {progressLogs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No progress history yet.</p>
          <p className="text-sm mt-2">Start completing milestones to see your progress here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {progressLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-600">✓</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium">{log.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{log.date}</span>
                  <span className="text-xs text-primary-600">+{log.points} points</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
