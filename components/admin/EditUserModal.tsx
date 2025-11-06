'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { X } from 'lucide-react'

interface User {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean
}

interface EditUserModalProps {
  isOpen: boolean
  user: User | null
  onClose: () => void
  onSuccess: () => void
}

export function EditUserModal({ isOpen, user, onClose, onSuccess }: EditUserModalProps) {
  const [fullName, setFullName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
      setIsAdmin(user.is_admin)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      // Update user info
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          fullName,
          isAdmin,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update user')
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating user:', error)
      alert(error instanceof Error ? error.message : 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="glass-card rounded-lg max-w-md w-full mx-4 border border-[rgba(0,212,255,0.3)] shadow-[0_0_40px_rgba(0,212,255,0.3)]">
        <div className="flex items-center justify-between p-6 border-b border-[rgba(0,212,255,0.3)]">
          <h2 className="text-xl font-semibold text-[#00d4ff] neon-glow">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="bg-[rgba(0,0,0,0.3)]"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isAdmin"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="w-4 h-4 text-[#00d4ff] bg-[rgba(0,0,0,0.4)] border-[rgba(0,212,255,0.3)] rounded focus:ring-[#00d4ff] focus:ring-2"
            />
            <label htmlFor="isAdmin" className="text-sm font-medium text-gray-300">
              Admin Status
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[rgba(0,212,255,0.3)]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={loading} className="flex-1">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

