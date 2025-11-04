import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/types/database'

/**
 * Creates a Supabase client for server-side operations (Server Components, API Routes)
 * This client has access to the user's session via cookies
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerComponentClient<Database>({ cookies: () => cookieStore })
}

/**
 * Gets the current user session from server-side
 */
export async function getServerSession() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Gets the current user from server-side
 */
export async function getServerUser() {
  const session = await getServerSession()
  if (!session) return null

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

