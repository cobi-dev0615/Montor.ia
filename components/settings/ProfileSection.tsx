'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

export function ProfileSection() {
  const { user } = useAuth()
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <Card>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile</h2>
      <div className="space-y-6">
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <span className="text-4xl">🌱</span>
          </div>
        </div>
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={user?.email || ''}
            disabled
            className="bg-gray-50"
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>
        <Button loading={loading} disabled={loading}>
          Update Profile
        </Button>
      </div>
    </Card>
  )
}
