'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { NotificationType } from '@/components/ui/Notification'
import { NotificationContainer } from '@/components/ui/NotificationContainer'

interface NotificationContextType {
  showNotification: (
    message: string,
    type?: NotificationType,
    duration?: number
  ) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<
    Array<{
      id: string
      type: NotificationType
      message: string
      duration?: number
    }>
  >([])

  const showNotification = useCallback(
    (message: string, type: NotificationType = 'info', duration: number = 2000) => {
      const id = Math.random().toString(36).substring(2, 9)
      setNotifications((prev) => [...prev, { id, type, message, duration }])
    },
    []
  )

  const handleClose = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <NotificationContainer notifications={notifications} onClose={handleClose} />
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}

