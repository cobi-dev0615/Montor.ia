import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/types/database'

/**
 * Checks if a user has any active goals
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @returns true if user has at least one active goal, false otherwise
 */
export async function hasActiveGoals(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('is_deleted', false)
      .limit(1)

    if (error) {
      console.error('Error checking active goals:', error)
      return false
    }

    return data && data.length > 0
  } catch (error) {
    console.error('Error checking active goals:', error)
    return false
  }
}

