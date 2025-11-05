'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download, Trash2 } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase/client'

export function DataSection() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = createSupabaseClient()

  const handleClearChatHistory = async () => {
    if (!confirm('Are you sure you want to clear all chat messages? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
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
            Download a copy of all your data including goals, progress, and chat history.
          </p>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export My Data
          </Button>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Clear Chat History</h3>
          <p className="text-sm text-gray-600 mb-4">
            Mark all your chat messages as deleted. This action cannot be undone.
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
