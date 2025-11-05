import { AdminProtectedRoute } from '@/components/layout/AdminProtectedRoute'
import { AdminNavbar } from '@/components/admin/AdminNavbar'
import { ImmersiveWorld } from '@/components/animations/ImmersiveWorld'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminProtectedRoute>
      <ImmersiveWorld particleIntensity="medium" glowIntensity={0.25}>
        <div className="flex flex-col h-screen bg-transparent">
          <AdminNavbar />
          <main className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-transparent">
            {children}
          </main>
        </div>
      </ImmersiveWorld>
    </AdminProtectedRoute>
  )
}

