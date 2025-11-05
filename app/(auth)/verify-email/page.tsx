'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Mail, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createSupabaseClient()

  // Check verification status
  useEffect(() => {
    const checkVerification = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email_confirmed_at) {
          setVerified(true)
          // Profile should already exist from registration, but ensure it exists
          const { error: profileError } = await supabase
            .from('users')
            .upsert({
              id: user.id,
              email: user.email!,
              full_name: user.user_metadata?.full_name || null,
              avatar_level: 1,
              avatar_stage: 'seed',
              total_progress: 0,
              consistency_streak: 0,
              is_admin: false,
            }, {
              onConflict: 'id'
            })

          if (profileError && profileError.code !== '23505') {
            console.error('Error ensuring profile exists:', profileError)
          }

          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        }
      }
    }

    // Check immediately
    checkVerification()

    // Listen for auth state changes (email verification)
    // This triggers when user clicks the verification link in email
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user?.email_confirmed_at) {
            setVerified(true)
            // Ensure profile exists
            await supabase
              .from('users')
              .upsert({
                id: user.id,
                email: user.email!,
                full_name: user.user_metadata?.full_name || null,
                avatar_level: 1,
                avatar_stage: 'seed',
                total_progress: 0,
                consistency_streak: 0,
                is_admin: false,
              }, {
                onConflict: 'id'
              })
            checkVerification()
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase])

  const handleResendEmail = async () => {
    if (!email) return

    setResending(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
        },
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Verification email sent! Please check your inbox.')
      }
    } catch (err) {
      setMessage('Failed to resend email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50 px-6 py-12">
      <Card className="max-w-md w-full">
        <div className="text-center">
          {verified ? (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Email Verified!
              </h1>
              <p className="text-gray-600 mb-6">
                Your email has been verified. Redirecting to dashboard...
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 mb-4">
                <Mail className="h-8 w-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Verify Your Email
              </h1>
              <p className="text-gray-600 mb-6">
                We've sent a verification link to
              </p>
              {email && (
                <p className="text-sm font-medium text-primary-600 mb-6 break-all">
                  {email}
                </p>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Check your inbox</p>
                    <p className="text-blue-700">
                      Click the verification link in the email to activate your account.
                      If you don't see it, check your spam folder.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Button
                  onClick={handleResendEmail}
                  variant="outline"
                  className="w-full"
                  loading={resending}
                  disabled={resending}
                >
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </Button>
                {message && (
                  <p className={`text-sm ${
                    message.includes('sent') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {message}
                  </p>
                )}
                <Link href="/login" className="block text-sm text-primary-600 hover:underline">
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

