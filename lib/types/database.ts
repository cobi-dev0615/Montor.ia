export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_level: number
          avatar_stage: string
          total_progress: number
          consistency_streak: number
          last_activity_date: string | null
          created_at: string
          updated_at: string
          is_admin: boolean
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_level?: number
          avatar_stage?: string
          total_progress?: number
          consistency_streak?: number
          last_activity_date?: string | null
          created_at?: string
          updated_at?: string
          is_admin?: boolean
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_level?: number
          avatar_stage?: string
          total_progress?: number
          consistency_streak?: number
          last_activity_date?: string | null
          created_at?: string
          updated_at?: string
          is_admin?: boolean
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          main_goal: string
          status: 'active' | 'completed' | 'paused'
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          main_goal: string
          status?: 'active' | 'completed' | 'paused'
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          main_goal?: string
          status?: 'active' | 'completed' | 'paused'
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          user_id: string
          goal_id: string | null
          role: 'user' | 'assistant' | 'system'
          content: string
          is_deleted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_id?: string | null
          role: 'user' | 'assistant' | 'system'
          content: string
          is_deleted?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string | null
          role?: 'user' | 'assistant' | 'system'
          content?: string
          is_deleted?: boolean
          created_at?: string
        }
      }
      // Add other tables as needed
    }
  }
}
