'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useNotification } from '@/hooks/useNotification'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function AccountSection() {
  const { showNotification } = useNotification()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const supabase = createSupabaseClient()
  const router = useRouter()

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showNotification('New password must be at least 6 characters long', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match', 'error')
      return
    }

    setLoading(true)

    try {
      // Update password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw updateError
      }

      showNotification('Password updated successfully', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Error changing password:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to change password',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    const confirmText = prompt(
      'This action cannot be undone. Type "DELETE" to confirm account deletion:'
    )

    if (confirmText !== 'DELETE') {
      setShowDeleteConfirm(false)
      return
    }

    setDeleteLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not found')
      }

      // Soft delete user data (mark as deleted instead of hard delete)
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_deleted: true })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      showNotification('Account deleted successfully', 'success')

      // Sign out user
      await supabase.auth.signOut()

      // Redirect to login
      router.push('/login')
    } catch (err) {
      console.error('Error deleting account:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to delete account',
        'error'
      )
      setDeleteLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-gray-100 mb-6">Account</h2>
      <div className="space-y-6">
        {/* Change Password */}
        <div>
          <h3 className="text-lg font-medium text-gray-100 mb-4">Change Password</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <Button onClick={handleChangePassword} loading={loading} disabled={loading}>
              Change Password
            </Button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="pt-6 border-t border-[rgba(239,68,68,0.3)]">
          <h3 className="text-lg font-medium text-red-400 mb-4">Danger Zone</h3>
          <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg p-4">
            <p className="text-sm text-red-300 mb-4">
              {showDeleteConfirm
                ? 'Are you absolutely sure? This will permanently delete your account and all associated data. This action cannot be undone.'
                : 'Once you delete your account, there is no going back. Please be certain.'}
            </p>
            <Button
              variant="outline"
              className="border-red-400 text-red-400 hover:bg-[rgba(239,68,68,0.2)] hover:border-red-500"
              onClick={handleDeleteAccount}
              loading={deleteLoading}
              disabled={deleteLoading}
            >
              {showDeleteConfirm ? 'Confirm Deletion' : 'Delete My Account'}
            </Button>
            {showDeleteConfirm && (
              <Button
                variant="outline"
                className="ml-2"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
