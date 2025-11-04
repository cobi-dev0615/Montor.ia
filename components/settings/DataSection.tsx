'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download, Trash2 } from 'lucide-react'

export function DataSection() {
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
            Permanently delete all your chat messages. This action cannot be undone.
          </p>
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Chat History
          </Button>
        </div>
      </div>
    </Card>
  )
}
