import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Navbar } from '@/components/layout/Navbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}
