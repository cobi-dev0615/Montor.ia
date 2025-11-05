'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Sparkles } from 'lucide-react'

interface ProgressUpdateToastProps {
  progressUpdate: {
    total_progress: number
    pointsEarned: number
    avatarEvolved?: boolean
  }
  onClose: () => void
}

export function ProgressUpdateToast({ progressUpdate, onClose }: ProgressUpdateToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for animation
    }, 3000)

    return () => clearTimeout(timer)
  }, [onClose])

  if (!isVisible) return null

  return (
    <div className="fixed top-20 right-6 z-50 animate-slide-in-right">
      <div className="bg-white border border-green-200 rounded-lg shadow-lg p-4 min-w-[300px]">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {progressUpdate.avatarEvolved ? (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            )}
          </div>
          <div className="flex-1">
            {progressUpdate.avatarEvolved ? (
              <>
                <p className="font-semibold text-gray-900">Avatar Evolved! 🎉</p>
                <p className="text-sm text-gray-600">Your progress is growing</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-900">Action Completed!</p>
                <p className="text-sm text-gray-600">
                  +{progressUpdate.pointsEarned} points earned
                </p>
              </>
            )}
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Total Progress</span>
            <span className="font-semibold text-primary-600">{progressUpdate.total_progress} pts</span>
          </div>
        </div>
      </div>
    </div>
  )
}

