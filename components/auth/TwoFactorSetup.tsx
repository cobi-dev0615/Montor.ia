'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Shield, CheckCircle, AlertCircle, Copy, QrCode } from 'lucide-react'

interface TwoFactorSetupProps {
  onComplete?: () => void
  onCancel?: () => void
}

export function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (step === 'setup') {
      initialize2FA()
    } else if (step === 'verify' && factorId && !challengeId) {
      createChallenge()
    }
  }, [step, factorId, challengeId])

  const createChallenge = async () => {
    if (!factorId) return

    try {
      const { data, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId,
      })

      if (challengeError) {
        setError(challengeError.message || 'Failed to create challenge')
        return
      }

      if (data) {
        setChallengeId(data.id)
      }
    } catch (err) {
      setError('Failed to create challenge. Please try again.')
    }
  }

  const initialize2FA = async () => {
    setLoading(true)
    setError(null)

    try {
      // Start 2FA enrollment
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      })

      if (enrollError) {
        setError(enrollError.message)
        setLoading(false)
        return
      }

      if (data && data.totp) {
        setQrCode(data.totp.qr_code || null)
        setSecret(data.totp.secret || null)
        setFactorId(data.id)
        setStep('verify')
      }
    } catch (err) {
      setError('Failed to initialize 2FA. Please try again.')
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (!factorId) {
        setError('Factor ID is missing. Please restart the setup.')
        setLoading(false)
        return
      }

      if (!challengeId) {
        setError('Challenge ID is missing. Please wait a moment and try again.')
        setLoading(false)
        return
      }

      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeId,
        code: verificationCode,
      })

      if (verifyError) {
        setError(verifyError.message || 'Invalid code. Please try again.')
        setLoading(false)
        return
      }

      if (data) {
        // 2FA successfully enabled
        setStep('complete')
        if (onComplete) {
          setTimeout(() => {
            onComplete()
          }, 2000)
        }
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
      setLoading(false)
    }
  }

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret)
      // You could show a toast notification here
    }
  }

  if (step === 'complete') {
    return (
      <Card>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Two-Factor Authentication Enabled
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Your account is now protected with 2FA. You'll need to enter a code from your authenticator app each time you sign in.
          </p>
          {onComplete && (
            <Button onClick={onComplete} className="w-full">
              Done
            </Button>
          )}
        </div>
      </Card>
    )
  }

  if (step === 'verify') {
    return (
      <Card>
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-4">
              <Shield className="h-6 w-6 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Verify Setup
            </h2>
            <p className="text-sm text-gray-600">
              Enter the 6-digit code from your authenticator app to complete setup
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setVerificationCode(value)
                  setError(null)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-2xl font-semibold tracking-widest"
                placeholder="000000"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleVerify}
                className="flex-1"
                loading={loading}
                disabled={loading || verificationCode.length !== 6}
              >
                Verify & Enable
              </Button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-4">
            <Shield className="h-6 w-6 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Enable Two-Factor Authentication
          </h2>
          <p className="text-sm text-gray-600">
            Add an extra layer of security to your account
          </p>
        </div>

        {loading && !qrCode && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Setting up 2FA...</p>
          </div>
        )}

        {qrCode && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 flex justify-center">
              <img
                src={qrCode}
                alt="QR Code for 2FA"
                className="w-48 h-48"
              />
            </div>

            {secret && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manual Entry Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={secret}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copySecret}
                    className="px-4"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Use this code if you can't scan the QR code
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700">
                    <li>Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.)</li>
                    <li>Enter the 6-digit code from the app to verify</li>
                    <li>Keep your authenticator app secure - you'll need it to sign in</li>
                  </ol>
                </div>
              </div>
            </div>

            {onCancel && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

