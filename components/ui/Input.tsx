import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full px-4 py-2 border rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent',
          'disabled:bg-[rgba(0,0,0,0.3)] disabled:cursor-not-allowed',
          'transition-all duration-300',
          'bg-[rgba(0,0,0,0.4)] text-gray-100 backdrop-blur-sm',
          'border-[rgba(0,212,255,0.3)]',
          'focus:shadow-[0_0_15px_rgba(0,212,255,0.3)]',
          error
            ? 'border-red-500 focus:ring-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.5)]'
            : '',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
