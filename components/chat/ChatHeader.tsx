import { Trash2 } from 'lucide-react'

interface ChatHeaderProps {
  goalId?: string
  onClearHistory?: () => void
  clearing?: boolean
  variant?: 'default' | 'dock'
}

export function ChatHeader({
  goalId,
  onClearHistory,
  clearing = false,
  variant = 'default',
}: ChatHeaderProps) {
  const paddingClasses = variant === 'dock' ? 'px-4 py-3' : 'px-6 py-4'

  return (
    <div className={`border-b border-gray-700 ${paddingClasses}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-100">Chat com Mentor</h2>
          {goalId && (
            <span className="text-xs text-gray-200 bg-primary-600/70 px-2.5 py-1 rounded-full">
              Contexto da Meta
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onClearHistory && (
            <button
              type="button"
              onClick={onClearHistory}
              disabled={clearing}
              className="p-2 rounded-full border border-[rgba(0,212,255,0.35)] text-gray-300 hover:bg-[rgba(0,212,255,0.15)] transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Limpar histórico"
              aria-label="Limpar histórico do chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
