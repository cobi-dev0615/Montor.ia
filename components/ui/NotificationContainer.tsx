'use client'

import { Notification, NotificationType } from './Notification'

interface NotificationContainerProps {
  notifications: Array<{
    id: string
    type: NotificationType
    message: string
    duration?: number
  }>
  onClose: (id: string) => void
}

export function NotificationContainer({
  notifications,
  onClose,
}: NotificationContainerProps) {
  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <Notification notification={notification} onClose={onClose} />
        </div>
      ))}
    </div>
  )
}

