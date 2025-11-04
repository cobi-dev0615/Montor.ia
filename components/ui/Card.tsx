import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'stat' | 'goal' | 'message'
}

export function Card({ children, className, variant = 'default' }: CardProps) {
  const variants = {
    default: 'bg-white border border-gray-200',
    stat: 'bg-white border border-gray-200 hover:shadow-md transition-shadow',
    goal: 'bg-white border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer',
    message: 'bg-white border border-gray-200',
  }

  return (
    <div
      className={cn(
        'rounded-xl shadow-sm p-6',
        variants[variant],
        className
      )}
    >
      {children}
    </div>
  )
}
