'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function AccountSection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const supabase = createSupabaseClient()
  const router = useRouter()

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Update password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Error changing password:', err)
      setError(err instanceof Error ? err.message : 'Failed to change password')
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
    setError(null)

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

      // Sign out user
      await supabase.auth.signOut()

      // Redirect to login
      router.push('/login')
    } catch (err) {
      console.error('Error deleting account:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setDeleteLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Account</h2>
      <div className="space-y-6">
        {/* Change Password */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
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
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
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
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {success}
              </div>
            )}
            <Button onClick={handleChangePassword} loading={loading} disabled={loading}>
              Change Password
            </Button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h3>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 mb-4">
              {showDeleteConfirm
                ? 'Are you absolutely sure? This will permanently delete your account and all associated data. This action cannot be undone.'
                : 'Once you delete your account, there is no going back. Please be certain.'}
            </p>
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-100"
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
