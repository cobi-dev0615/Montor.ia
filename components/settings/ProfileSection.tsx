'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/hooks/useUser'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const stageIcons: Record<string, string> = {
  seed: '🌱',
  sprout: '🌿',
  sapling: '🌳',
  tree: '🌲',
  oak: '🏛️',
}

export function ProfileSection() {
  const { user } = useUser()
  const [fullName, setFullName] = useState('')
  const [avatarStage, setAvatarStage] = useState('seed')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return

      try {
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, avatar_stage')
          .eq('id', user.id)
          .single()

        if (userData) {
          setFullName(userData.full_name || '')
          setAvatarStage(userData.avatar_stage || 'seed')
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setFetching(false)
      }
    }

    fetchProfile()
  }, [user, supabase])

  const handleUpdate = async () => {
    if (!user) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      setSuccess('Profile updated successfully')
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile</h2>
      <div className="space-y-6">
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <span className="text-4xl">{stageIcons[avatarStage] || '🌱'}</span>
          </div>
          <p className="text-sm text-gray-600 capitalize">{avatarStage}</p>
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
            placeholder="Enter your full name"
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
        <Button onClick={handleUpdate} loading={loading} disabled={loading}>
          Update Profile
        </Button>
      </div>
    </Card>
  )
}
