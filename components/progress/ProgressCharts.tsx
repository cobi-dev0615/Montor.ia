'use client'

export function ProgressCharts() {
  // TODO: Implement with Recharts
  // Weekly progress line chart
  // Monthly progress bar chart
  // Consistency streak calendar

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Progress Charts</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm mb-4">Weekly Progress</p>
          <p className="text-gray-400 text-xs">Chart will be displayed here</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm mb-4">Monthly Progress</p>
          <p className="text-gray-400 text-xs">Chart will be displayed here</p>
        </div>
      </div>
    </div>
  )
}
