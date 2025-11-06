import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'active' | 'completed' | 'paused' | 'default'
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    paused: 'bg-yellow-100 text-yellow-800',
    default: 'bg-gray-100 text-gray-800',
  }

  const statusLabels: Record<string, string> = {
    active: 'Ativa',
    completed: 'Concluída',
    paused: 'Pausada',
  }

  const displayText = typeof children === 'string' && statusLabels[children.toLowerCase()] 
    ? statusLabels[children.toLowerCase()] 
    : children

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant]
      )}
    >
      {displayText}
    </span>
  )
}
