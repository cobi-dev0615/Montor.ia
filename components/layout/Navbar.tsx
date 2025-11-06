'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import {
  MessageSquare,
  Target,
  TrendingUp,
  Settings,
  LayoutDashboard,
  Shield,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Navbar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [userFullName, setUserFullName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          setLoading(false)
          return
        }

        const { data: userData } = await supabase
          .from('users')
          .select('is_admin, full_name')
          .eq('id', authUser.id)
          .single()

        setIsAdmin(userData?.is_admin || false)
        setUserFullName(userData?.full_name || null)
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [supabase])

  const allNavItems = [
    ...navItems,
    ...(isAdmin ? [{ href: '/admin/dashboard', label: 'Admin', icon: Shield }] : []),
  ]

  return (
    <nav className="glass-card border-b border-[rgba(0,212,255,0.3)] sticky top-0 z-50 backdrop-blur-xl">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center">
            <h1 className="text-xl font-bold holographic-text neon-glow">Mentor.ai</h1>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center gap-1">
            {allNavItems.map((item) => {
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
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-gray-300 hidden lg:block">
                {userFullName || user.email || 'Usuário'}
              </span>
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
