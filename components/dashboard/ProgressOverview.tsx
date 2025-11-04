'use client'

export function ProgressOverview() {
  // TODO: Fetch progress data from Supabase
  const overallProgress = 0

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Overall Progress</h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Journey Completion</span>
          <span className="text-sm font-medium text-gray-900">{overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-primary-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Keep going! Consistency is key to growth.
        </p>
      </div>
    </div>
  )
}
