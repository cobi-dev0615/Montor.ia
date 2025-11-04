'use client'

export function AvatarEvolution() {
  // TODO: Fetch user progress from Supabase
  const avatarLevel = 1
  const avatarStage = 'seed'
  const currentPoints = 0
  const pointsToNext = 10

  const stages = [
    { level: 1, name: 'Seed', icon: '🌱' },
    { level: 2, name: 'Sprout', icon: '🌿' },
    { level: 3, name: 'Sapling', icon: '🌳' },
    { level: 4, name: 'Tree', icon: '🌲' },
    { level: 5, name: 'Oak', icon: '🏛️' },
  ]

  return (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-6xl md:text-8xl">
            {stages.find(s => s.level === avatarLevel)?.icon || '🌱'}
          </span>
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 capitalize mb-2">{avatarStage}</h3>
        <p className="text-gray-600">Level {avatarLevel}</p>
      </div>

      {/* Evolution Path */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          {stages.map((stage, index) => (
            <div key={stage.level} className="flex-1 flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 ${
                  stage.level < avatarLevel
                    ? 'bg-green-100'
                    : stage.level === avatarLevel
                    ? 'bg-primary-100 ring-4 ring-primary-300'
                    : 'bg-gray-100 opacity-50'
                }`}
              >
                <span>{stage.icon}</span>
              </div>
              <span
                className={`text-xs font-medium ${
                  stage.level <= avatarLevel ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {stage.name}
              </span>
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(currentPoints / pointsToNext) * 100}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {pointsToNext - currentPoints} points until next evolution
        </p>
      </div>
    </div>
  )
}
