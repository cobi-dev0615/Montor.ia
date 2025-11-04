'use client'

export function AvatarDisplay() {
  // TODO: Fetch user data from Supabase
  const avatarLevel = 1
  const avatarStage = 'seed'
  const pointsToNext = 10
  const currentPoints = 0

  return (
    <div className="flex flex-col items-center">
      <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-primary-100 flex items-center justify-center mb-4">
        <span className="text-4xl md:text-6xl">🌱</span>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 capitalize mb-2">{avatarStage}</h3>
      <p className="text-sm text-gray-600 mb-4">Level {avatarLevel}</p>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${(currentPoints / pointsToNext) * 100}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{pointsToNext - currentPoints} points to next level</p>
    </div>
  )
}
