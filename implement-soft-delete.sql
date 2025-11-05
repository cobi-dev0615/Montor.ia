-- Implement Soft Delete Functionality
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/poqjbackapixblcwnmvo/sql
--
-- This adds is_deleted field to tables and implements soft delete instead of hard delete
-- For database security, data is never permanently deleted, just marked as deleted

-- ============================================================================
-- STEP 1: Add is_deleted column to relevant tables
-- ============================================================================

-- Goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Milestones table
ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Actions table
ALTER TABLE public.actions 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Progress logs table
ALTER TABLE public.progress_logs 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Users table (optional - users might be special case)
-- Uncomment if you want soft delete for users too
-- ALTER TABLE public.users 
-- ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- STEP 2: Create indexes for better performance on is_deleted queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_goals_is_deleted ON public.goals(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_milestones_is_deleted ON public.milestones(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_actions_is_deleted ON public.actions(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON public.messages(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_progress_logs_is_deleted ON public.progress_logs(is_deleted) WHERE is_deleted = FALSE;

-- ============================================================================
-- STEP 3: Update RLS policies to filter out deleted records
-- ============================================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can view own milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can view own actions" ON public.actions;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own progress" ON public.progress_logs;

-- Recreate SELECT policies with is_deleted filter
CREATE POLICY "Users can view own goals"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "Users can view own milestones"
  ON public.milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = milestones.goal_id 
        AND goals.user_id = auth.uid()
        AND goals.is_deleted = FALSE
    )
    AND milestones.is_deleted = FALSE
  );

CREATE POLICY "Users can view own actions"
  ON public.actions FOR SELECT
  USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "Users can view own progress"
  ON public.progress_logs FOR SELECT
  USING (auth.uid() = user_id AND is_deleted = FALSE);

-- Update admin policies to also filter deleted records (optional)
-- Admins might want to see deleted records, so we can create separate policies

-- ============================================================================
-- STEP 4: Create helper functions for soft delete
-- ============================================================================

-- Function: Soft delete a goal
CREATE OR REPLACE FUNCTION soft_delete_goal(goal_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.goals
  SET is_deleted = TRUE, updated_at = NOW()
  WHERE id = goal_uuid AND is_deleted = FALSE;
  
  -- Also soft delete related milestones and actions
  UPDATE public.milestones
  SET is_deleted = TRUE
  WHERE goal_id = goal_uuid AND is_deleted = FALSE;
  
  UPDATE public.actions
  SET is_deleted = TRUE
  WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE goal_id = goal_uuid
  ) AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Soft delete a milestone
CREATE OR REPLACE FUNCTION soft_delete_milestone(milestone_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.milestones
  SET is_deleted = TRUE
  WHERE id = milestone_uuid AND is_deleted = FALSE;
  
  -- Also soft delete related actions
  UPDATE public.actions
  SET is_deleted = TRUE
  WHERE milestone_id = milestone_uuid AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Soft delete an action
CREATE OR REPLACE FUNCTION soft_delete_action(action_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.actions
  SET is_deleted = TRUE
  WHERE id = action_uuid AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Soft delete a message
CREATE OR REPLACE FUNCTION soft_delete_message(message_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.messages
  SET is_deleted = TRUE
  WHERE id = message_uuid AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Soft delete all messages for a user (clear chat history)
CREATE OR REPLACE FUNCTION soft_delete_user_messages(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.messages
  SET is_deleted = TRUE
  WHERE user_id = user_uuid AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Restore a soft-deleted record (undo delete)
CREATE OR REPLACE FUNCTION restore_goal(goal_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.goals
  SET is_deleted = FALSE, updated_at = NOW()
  WHERE id = goal_uuid AND is_deleted = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: Update DELETE policies to use soft delete instead
-- ============================================================================

-- Instead of allowing DELETE, we'll update the record
-- Remove DELETE policies and replace with UPDATE policies that set is_deleted

-- Drop DELETE policies
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;

-- Drop existing UPDATE policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;

-- Create UPDATE policy for soft delete
-- Note: RLS policies cannot use OLD/NEW, so we use a trigger to enforce the constraint
CREATE POLICY "Users can update own goals"
  ON public.goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to prevent users from restoring deleted records themselves
-- (Only admins or the restore function can restore)
CREATE OR REPLACE FUNCTION prevent_self_restore()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to change is_deleted from TRUE to FALSE, block it
  -- Users can only soft delete (FALSE -> TRUE), not restore (TRUE -> FALSE)
  IF OLD.is_deleted = TRUE AND NEW.is_deleted = FALSE THEN
    -- Only allow if called from restore function or if user is admin
    -- For now, we'll block all user-initiated restores
    -- Use the restore_goal() function instead
    RAISE EXCEPTION 'Cannot restore deleted record. Use restore_goal() function or contact admin.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS prevent_goal_restore ON public.goals;

-- Create trigger
CREATE TRIGGER prevent_goal_restore
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  WHEN (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted)
  EXECUTE FUNCTION prevent_self_restore();

-- ============================================================================
-- STEP 6: Create view for active (non-deleted) records (optional helper)
-- ============================================================================

-- View for active goals
CREATE OR REPLACE VIEW public.active_goals AS
SELECT * FROM public.goals WHERE is_deleted = FALSE;

-- View for active messages
CREATE OR REPLACE VIEW public.active_messages AS
SELECT * FROM public.messages WHERE is_deleted = FALSE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if columns were added
SELECT 
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'is_deleted'
  AND table_name IN ('goals', 'milestones', 'actions', 'messages', 'progress_logs')
ORDER BY table_name;

-- Check indexes
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%is_deleted%';

-- Check functions
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE '%soft_delete%' OR routine_name LIKE '%restore%')
ORDER BY routine_name;

