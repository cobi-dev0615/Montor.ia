interface ChatHeaderProps {
  goalId?: string
}

export function ChatHeader({ goalId }: ChatHeaderProps) {
  return (
    <div className="border-b border-gray-700 px-6 py-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-100">Chat com Mentor</h2>
        {goalId && (
          <span className="text-sm text-gray-300 bg-primary-600 px-3 py-1 rounded-full">
            Contexto da Meta
          </span>
        )}
      </div>
    </div>
  )
}
