'use client'

import { useEffect, useState, useRef } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
}

interface NotificationProps {
  notification: Notification
  onClose: (id: string) => void
}

export function Notification({ notification, onClose }: NotificationProps) {
  const [progress, setProgress] = useState(100)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const duration = notification.duration || 2000 // 2 seconds default

  useEffect(() => {
    const startTime = Date.now()
    const updateInterval = 16 // Update every ~16ms for smooth animation (60fps)

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, duration - elapsed)
      const progressPercent = (remaining / duration) * 100
      setProgress(progressPercent)

      if (progressPercent <= 0) {
        onClose(notification.id)
      }
    }, updateInterval)

    // Auto-close after duration
    const timeout = setTimeout(() => {
      onClose(notification.id)
    }, duration)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      clearTimeout(timeout)
    }
  }, [duration, notification.id, onClose])

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-[#ff6b35]" />
      case 'info':
        return <Info className="w-5 h-5 text-[#00d4ff]" />
      default:
        return <Info className="w-5 h-5 text-[#00d4ff]" />
    }
  }

  const getBorderColor = () => {
    switch (notification.type) {
      case 'success':
        return 'border-green-400'
      case 'error':
        return 'border-red-400'
      case 'warning':
        return 'border-[#ff6b35]'
      case 'info':
        return 'border-[#00d4ff]'
      default:
        return 'border-[#00d4ff]'
    }
  }

  const getProgressColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-400'
      case 'error':
        return 'bg-red-400'
      case 'warning':
        return 'bg-[#ff6b35]'
      case 'info':
        return 'bg-[#00d4ff]'
      default:
        return 'bg-[#00d4ff]'
    }
  }

  return (
    <div
      className={`glass-card rounded-lg border-2 ${getBorderColor()} shadow-[0_0_20px_rgba(0,212,255,0.3)] p-4 min-w-[320px] max-w-[420px] backdrop-blur-xl relative overflow-hidden animate-slide-in-right`}
    >
      {/* Progress bar at the top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800">
        <div
          className={`h-full ${getProgressColor()} transition-all duration-[16ms] ease-linear shadow-[0_0_10px_currentColor]`}
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      {/* Content */}
      <div className="flex items-start gap-3 pt-1">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-100 break-words">
            {notification.message}
          </p>
        </div>
        <button
          onClick={() => onClose(notification.id)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-200 transition-colors p-1 rounded hover:bg-[rgba(255,255,255,0.1)]"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

