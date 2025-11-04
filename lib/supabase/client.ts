import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/types/database'

export function createSupabaseClient() {
  return createClientComponentClient<Database>()
}
