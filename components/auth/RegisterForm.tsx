'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function RegisterForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseClient()

  const getPasswordStrength = (pwd: string): 'weak' | 'medium' | 'strong' => {
    if (pwd.length < 6) return 'weak'
    if (pwd.length < 10) return 'medium'
    if (pwd.length >= 10 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return 'strong'
    return 'medium'
  }

  const passwordStrength = getPasswordStrength(password)
  const strengthColors = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  }
  const strengthText = {
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Step 1: Sign up user with Supabase Auth
      // Supabase will automatically send email verification if enabled in dashboard
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Enable email verification - Supabase will send verification email
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
          data: {
            full_name: fullName,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // Step 2: Immediately use the user ID from signUp response
      if (!data.user) {
        setError('Failed to create user account')
        setLoading(false)
        return
      }

      const userId = data.user.id
      const userEmail = data.user.email

      if (!userEmail) {
        setError('Email is required')
        setLoading(false)
        return
      }

      // Step 3: Immediately insert user profile into public.users table using the user ID
      // This happens even if email verification is required - profile is created with unverified status
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: userId, // Use the user ID from signUp response
          email: userEmail,
          full_name: fullName || null,
          avatar_level: 1,
          avatar_stage: 'seed',
          total_progress: 0,
          consistency_streak: 0,
          is_admin: false,
        })

      if (profileError) {
        // Handle different error cases
        if (profileError.code === '23505') {
          // Duplicate key - profile might already exist (shouldn't happen, but handle gracefully)
          console.warn('User profile already exists:', profileError.message)
        } else {
          // Other database errors - show to user
          console.error('Error creating user profile:', profileError)
          setError(`Failed to create profile: ${profileError.message}`)
          setLoading(false)
          return
        }
      }

      // Step 4: Check if email verification is required
      // If no session is returned, Supabase requires email verification
      if (!data.session) {
        // Email verification required - redirect to verification page
        // Supabase has sent a verification email automatically
        router.push(`/verify-email?email=${encodeURIComponent(email)}`)
        return
      }

      // Step 5: If session exists (email verification disabled in Supabase), redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Registration error:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name
        </label>
        <Input
          id="fullName"
          type="text"
          placeholder="Enter your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          error={!!error}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          error={!!error}
        />
        {password && (
          <div className="mt-2">
            <div className="flex gap-1 h-2">
              <div className={`flex-1 rounded ${strengthColors[passwordStrength]}`} />
              <div
                className={`flex-1 rounded ${
                  passwordStrength !== 'weak' ? strengthColors[passwordStrength] : 'bg-gray-200'
                }`}
              />
              <div
                className={`flex-1 rounded ${
                  passwordStrength === 'strong' ? strengthColors[passwordStrength] : 'bg-gray-200'
                }`}
              />
            </div>
            <p className={`text-xs mt-1 ${
              passwordStrength === 'weak' ? 'text-red-600' :
              passwordStrength === 'medium' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {strengthText[passwordStrength]}
            </p>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          error={!!error}
        />
      </div>

      <Button type="submit" className="w-full" loading={loading} disabled={loading}>
        {loading ? 'Creating account...' : 'Create Account'}
      </Button>
    </form>
  )
}
