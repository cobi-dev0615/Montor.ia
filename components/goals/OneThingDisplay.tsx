interface OneThingDisplayProps {
  mainGoal: string
}

export function OneThingDisplay({ mainGoal }: OneThingDisplayProps) {
  return (
    <div className="bg-primary-900 border-l-4 border-primary-600 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-100 mb-4">Sua Única Coisa</h2>
      <p className="text-xl text-gray-200 leading-relaxed font-serif italic">
        &ldquo;{mainGoal}&rdquo;
      </p>
    </div>
  )
}
