'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { LayoutDashboard, Users, FileText, ArrowLeft, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const adminNavItems = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: Users,
  },
  {
    name: 'Content Management',
    href: '/admin/content',
    icon: FileText,
  },
]

export function AdminNavbar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  return (
    <nav className="glass-card border-b border-[rgba(0,212,255,0.3)] sticky top-0 z-50 backdrop-blur-xl">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Back Button */}
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="flex items-center">
              <h1 className="text-xl font-bold holographic-text neon-glow">Admin Panel</h1>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Button>
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center gap-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium',
                    isActive
                      ? 'bg-[rgba(0,212,255,0.2)] text-[#00d4ff] border border-[rgba(0,212,255,0.5)] shadow-[0_0_15px_rgba(0,212,255,0.3)]'
                      : 'text-gray-300 hover:bg-[rgba(255,107,53,0.1)] hover:text-[#ff6b35] hover:border hover:border-[rgba(255,107,53,0.3)]'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-gray-300 hidden lg:block">{user.email}</span>
            )}
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}

