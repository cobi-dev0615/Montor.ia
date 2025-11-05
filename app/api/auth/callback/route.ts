import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const type = requestUrl.searchParams.get('type') // 'signup' or 'recovery'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Exchange code for session (this verifies the email)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session && data.user) {
      const user = data.user

      // Create user profile if it doesn't exist (using upsert to handle both new and existing)
      // This ensures the profile exists even if it was created during signup
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
          onConflict: 'id',
          // Only update email if it changed (for email change flows)
          ignoreDuplicates: false
        })

      if (profileError) {
        console.error('Error creating/updating profile:', profileError)
        // Don't fail the auth flow if profile creation fails - user can still access
      }

      // Email is now verified and session is active
      // Redirect to the specified page or dashboard
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    } else if (error) {
      console.error('Error exchanging code for session:', error)
      // Redirect to login with error
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
    }
  }

  // If no code or error, redirect to login
  return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
}

