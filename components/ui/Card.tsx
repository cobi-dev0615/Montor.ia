import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'stat' | 'goal' | 'message'
}

export function Card({ children, className, variant = 'default' }: CardProps) {
  const variants = {
    default: 'glass-card text-gray-100',
    stat: 'glass-card text-gray-100 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-all duration-300',
    goal: 'glass-card text-gray-100 hover:shadow-[0_0_30px_rgba(255,107,53,0.4)] hover:border-[rgba(255,107,53,0.5)] transition-all duration-300 cursor-pointer',
    message: 'glass-card text-gray-100',
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
