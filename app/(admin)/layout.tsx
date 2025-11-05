import { AdminProtectedRoute } from '@/components/layout/AdminProtectedRoute'
import { AdminNavbar } from '@/components/admin/AdminNavbar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminProtectedRoute>
      <div className="flex flex-col h-screen bg-gray-50">
        <AdminNavbar />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </AdminProtectedRoute>
  )
}

