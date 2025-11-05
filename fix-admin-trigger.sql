-- Fix Admin Status Trigger to Allow Manual Updates in Supabase Table Editor
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/poqjbackapixblcwnmvo/sql
-- 
-- This fixes the trigger to allow:
-- 1. Service role/database owner updates (Supabase table editor, SQL Editor)
-- 2. Admin users granting admin status to others
-- 3. Still prevents regular users from granting themselves admin status

-- Drop existing trigger
DROP TRIGGER IF EXISTS prevent_admin_change ON public.users;

-- Updated function that allows service role and admins to update admin status
CREATE OR REPLACE FUNCTION prevent_self_admin_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if admin status is being changed from FALSE to TRUE
  IF OLD.is_admin = FALSE AND NEW.is_admin = TRUE THEN
    -- Allow if:
    -- 1. auth.uid() is NULL (service role/database owner - Supabase table editor, SQL Editor)
    -- 2. Current user is an admin (admins can grant admin status)
    IF auth.uid() IS NULL THEN
      -- Service role/database owner - allow update
      RETURN NEW;
    ELSIF EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
      -- Current user is an admin - allow update
      RETURN NEW;
    ELSE
      -- Regular user trying to grant admin status - block it
      RAISE EXCEPTION 'Only admins can grant admin status';
    END IF;
  END IF;
  
  -- Allow all other updates (including removing admin status)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER prevent_admin_change
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_admin_change();

-- Verify trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'users'
  AND trigger_name = 'prevent_admin_change';

-- Test: This should now work in Supabase table editor
-- UPDATE public.users SET is_admin = TRUE WHERE email = 'your-email@example.com';

