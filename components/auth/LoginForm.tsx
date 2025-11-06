'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // Check if error is due to unverified email
        if (signInError.message.includes('email') && signInError.message.includes('confirm')) {
          setError('Please verify your email before signing in. Check your inbox for the verification link.')
          // Optionally redirect to verify-email page
          router.push(`/verify-email?email=${encodeURIComponent(email)}`)
          setLoading(false)
          return
        }
        setError(signInError.message)
        setLoading(false)
        return
      }

      // Check if email is verified
      if (data.session) {
        const { data: { user } } = await supabase.auth.getUser()
        
        // If email is not verified, redirect to verification page
        if (user && !user.email_confirmed_at) {
          setError('Please verify your email before signing in.')
          router.push(`/verify-email?email=${encodeURIComponent(email)}`)
          setLoading(false)
          return
        }

        // Email verified, proceed to dashboard
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && (
        <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="Digite seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          error={!!error}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
          Senha
        </label>
        <Input
          id="password"
          type="password"
          placeholder="Digite sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          error={!!error}
        />
      </div>

      <div className="flex items-center">
        <input
          id="remember"
          type="checkbox"
          className="h-4 w-4 text-[#00d4ff] focus:ring-[#00d4ff] bg-[rgba(0,0,0,0.4)] border-[rgba(0,212,255,0.3)] rounded"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        <label htmlFor="remember" className="ml-2 block text-sm text-gray-300">
          Lembrar-me
        </label>
      </div>

      <Button type="submit" className="w-full" loading={loading} disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
