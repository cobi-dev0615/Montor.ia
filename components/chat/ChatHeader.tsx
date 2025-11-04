interface ChatHeaderProps {
  goalId?: string
}

export function ChatHeader({ goalId }: ChatHeaderProps) {
  return (
    <div className="border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Chat with Mentor</h2>
        {goalId && (
          <span className="text-sm text-gray-600 bg-primary-50 px-3 py-1 rounded-full">
            Goal Context
          </span>
        )}
      </div>
    </div>
  )
}
