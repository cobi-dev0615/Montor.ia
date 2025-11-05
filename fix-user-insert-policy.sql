-- Fix User INSERT Policy for Signup Flow
-- Run this in Supabase SQL Editor to fix the RLS policy violation during signup
-- This allows users to create their profile during signup even without an active session

-- Step 1: Create a helper function to check if user exists in auth.users
-- This function uses SECURITY DEFINER to bypass RLS and access auth.users
CREATE OR REPLACE FUNCTION public.user_exists_in_auth(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists in auth.users
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create own profile" ON public.users;

-- Step 3: Create new INSERT policy that handles signup flow
-- This policy allows:
-- 1. Authenticated users creating their own profile (auth.uid() = id)
-- 2. Users creating their profile during signup (user exists in auth.users but no session yet)
CREATE POLICY "Users can create own profile"
  ON public.users FOR INSERT
  WITH CHECK (
    -- Case 1: User is authenticated and creating their own profile
    (auth.uid() IS NOT NULL AND auth.uid() = id)
    OR
    -- Case 2: User exists in auth.users (signup case - no active session yet)
    -- Uses the helper function to check auth.users (which requires SECURITY DEFINER)
    public.user_exists_in_auth(id)
  );

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND policyname = 'Users can create own profile';

