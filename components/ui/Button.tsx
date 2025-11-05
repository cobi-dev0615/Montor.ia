import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  loading,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-[#00d4ff] to-[#0099ff] text-white hover:shadow-[0_0_20px_rgba(0,212,255,0.5)] active:opacity-90 transition-all duration-300',
    secondary: 'bg-[rgba(255,107,53,0.2)] text-[#ff6b35] border border-[rgba(255,107,53,0.5)] hover:bg-[rgba(255,107,53,0.3)] hover:shadow-[0_0_15px_rgba(255,107,53,0.4)] active:opacity-90 transition-all duration-300',
    outline: 'border-2 border-[rgba(0,212,255,0.5)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.1)] hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] active:opacity-90 bg-transparent transition-all duration-300',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={cn(
        'rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
