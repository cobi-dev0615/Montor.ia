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
        setMessage('Email de verificação enviado! Verifique sua caixa de entrada.')
      }
    } catch (err) {
      setMessage('Falha ao reenviar email. Tente novamente.')
    } finally {
      setResending(false)
    }
  }

  return (
    <Card className="max-w-md w-full">
      <div className="text-center">
        {verified ? (
          <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[rgba(34,197,94,0.2)] border border-[rgba(34,197,94,0.3)] mb-4">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">
              Email Verificado!
            </h1>
            <p className="text-gray-400 mb-6">
              Seu email foi verificado. Redirecionando para o dashboard...
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[rgba(0,212,255,0.2)] border border-[rgba(0,212,255,0.3)] mb-4">
              <Mail className="h-8 w-8 text-[#00d4ff]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">
              Verifique Seu Email
            </h1>
            <p className="text-gray-400 mb-6">
              Enviamos um link de verificação para
            </p>
            {email && (
              <p className="text-sm font-medium text-[#00d4ff] mb-6 break-all">
                {email}
              </p>
            )}
            <div className="bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.3)] rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-[#00d4ff] mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-gray-300">
                  <p className="font-medium mb-1 text-gray-100">Verifique sua caixa de entrada</p>
                  <p className="text-gray-400">
                    Clique no link de verificação no email para ativar sua conta.
                    Se você não o encontrar, verifique sua pasta de spam.
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
                {resending ? 'Enviando...' : 'Reenviar Email de Verificação'}
              </Button>
              {message && (
                <p className={`text-sm ${
                  message.includes('sent') || message.includes('enviado') ? 'text-green-400' : 'text-red-400'
                }`}>
                  {message}
                </p>
              )}
              <Link href="/login" className="block text-sm text-[#00d4ff] hover:text-[#00ffff] hover:underline transition-colors">
                Voltar para Login
              </Link>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}

