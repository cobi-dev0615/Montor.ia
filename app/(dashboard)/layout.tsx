import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Navbar } from '@/components/layout/Navbar'
import { ImmersiveWorld } from '@/components/animations/ImmersiveWorld'
import { NotificationProvider } from '@/hooks/useNotification'
import { MentorDock } from '@/components/chat/MentorDock'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <NotificationProvider>
        <ImmersiveWorld particleIntensity="high" glowIntensity={0.3}>
          <div className="flex flex-col h-screen bg-transparent">
            <Navbar />
            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-transparent">
              {children}
            </main>
            <MentorDock />
          </div>
        </ImmersiveWorld>
      </NotificationProvider>
    </ProtectedRoute>
  )
}
