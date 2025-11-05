'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download, Trash2 } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Loader2 } from 'lucide-react'

export function DataSection() {
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = createSupabaseClient()
  const { user } = useUser()

  const handleExportData = async () => {
    if (!user) {
      setError('You must be logged in to export data')
      return
    }

    setExportLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Fetch all user data
      const [userData, goalsData, messagesData, progressData] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_deleted', false),
        supabase
          .from('messages')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('progress_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false }),
      ])

      // Combine all data
      const exportData = {
        exportDate: new Date().toISOString(),
        user: userData.data,
        goals: goalsData.data || [],
        messages: messagesData.data || [],
        progressLogs: progressData.data || [],
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mentor-ai-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccess('Data exported successfully')
    } catch (err) {
      console.error('Error exporting data:', err)
      setError(err instanceof Error ? err.message : 'Failed to export data')
    } finally {
      setExportLoading(false)
    }
  }

  const handleClearChatHistory = async () => {
    if (!confirm('Are you sure you want to clear all chat messages? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (!user) {
        setError('You must be logged in to clear chat history')
        return
      }

      // Soft delete all user messages (using UPDATE instead of DELETE)
      const { error: updateError } = await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('user_id', user.id)
        .eq('is_deleted', false)

      if (updateError) {
        throw updateError
      }

      setSuccess('Chat history cleared successfully')
    } catch (err) {
      console.error('Error clearing chat history:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear chat history')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Data Management</h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Export Your Data</h3>
          <p className="text-sm text-gray-600 mb-4">
            Download a copy of all your data including goals, progress, and chat history as a JSON file.
          </p>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}
          <Button
            variant="outline"
            onClick={handleExportData}
            loading={exportLoading}
            disabled={exportLoading}
          >
            <Download className="w-4 h-4 mr-2" />
            Export My Data
          </Button>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Clear Chat History</h3>
          <p className="text-sm text-gray-600 mb-4">
            Mark all your chat messages as deleted. This action cannot be undone.
          </p>
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={handleClearChatHistory}
            loading={loading}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {loading ? 'Clearing...' : 'Clear Chat History'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
