'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup'
import { Shield, CheckCircle, AlertCircle } from 'lucide-react'

export function TwoFactorSection() {
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    checkMFAStatus()
  }, [])

  const checkMFAStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Check if user has 2FA enabled
        const { data: factors } = await supabase.auth.mfa.listFactors()
        setMfaEnabled(factors?.totp && factors.totp.length > 0 ? true : false)
      }
    } catch (err) {
      console.error('Error checking MFA status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = factors?.totp?.[0]

      if (totpFactor) {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({
          factorId: totpFactor.id,
        })

        if (unenrollError) {
          setError(unenrollError.message)
        } else {
          setMfaEnabled(false)
        }
      }
    } catch (err) {
      setError('Failed to disable 2FA. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSetupComplete = () => {
    setShowSetup(false)
    checkMFAStatus()
  }

  if (showSetup) {
    return (
      <TwoFactorSetup
        onComplete={handleSetupComplete}
        onCancel={() => setShowSetup(false)}
      />
    )
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              mfaEnabled ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Shield className={`h-5 w-5 ${
                mfaEnabled ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600">
                {mfaEnabled
                  ? 'Add an extra layer of security to your account'
                  : 'Protect your account with an additional security layer'}
              </p>
            </div>
          </div>
          {mfaEnabled && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Enabled</span>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          {mfaEnabled ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium mb-1">2FA is active</p>
                    <p className="text-green-700">
                      Your account is protected. You'll need to enter a code from your authenticator app each time you sign in.
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleDisable2FA}
                loading={loading}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Disable 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">2FA is not enabled</p>
                    <p className="text-blue-700">
                      Enable two-factor authentication to add an extra layer of security to your account.
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setShowSetup(true)}
                loading={loading}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Enable 2FA
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

