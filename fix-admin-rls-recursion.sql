-- Fix Infinite Recursion in Admin RLS Policies
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/poqjbackapixblcwnmvo/sql
--
-- Problem: The admin RLS policy checks the users table to verify admin status,
-- which causes infinite recursion because it triggers RLS again.
--
-- Solution: Use a SECURITY DEFINER function to check admin status without recursion.

-- Step 1: Create helper function to check admin status (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- This function uses SECURITY DEFINER to bypass RLS
  -- and check if a user is an admin
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

-- Step 3: Recreate admin policies using the helper function
-- This prevents infinite recursion because the function uses SECURITY DEFINER
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update all users"
  ON public.users FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

-- Verify policies were created
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND policyname LIKE '%admin%';

-- Test: This should now work without recursion
-- SELECT * FROM public.users WHERE id = 'your-user-id';

