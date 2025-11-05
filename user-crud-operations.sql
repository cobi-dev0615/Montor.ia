-- User CRUD Operations for Supabase
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/poqjbackapixblcwnmvo/sql

-- ============================================================================
-- STEP 1: CREATE TABLE (if not exists)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop table if exists (use with caution - this deletes all data!)
-- DROP TABLE IF EXISTS public.users CASCADE;

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_level INTEGER DEFAULT 1,
  avatar_stage TEXT DEFAULT 'seed',
  total_progress INTEGER DEFAULT 0,
  consistency_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  
  -- Constraints
  CONSTRAINT valid_avatar_stage CHECK (avatar_stage IN ('seed', 'sprout', 'sapling', 'tree', 'oak')),
  CONSTRAINT valid_avatar_level CHECK (avatar_level >= 1 AND avatar_level <= 5),
  CONSTRAINT valid_progress CHECK (total_progress >= 0),
  CONSTRAINT valid_streak CHECK (consistency_streak >= 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_avatar_level ON public.users(avatar_level);

-- ============================================================================
-- STEP 2: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: CREATE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can create own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Function: Helper to check if user exists in auth.users (for RLS policies)
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

-- Policy: Users can create their own profile
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

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can delete their own profile (optional - usually handled by auth.users deletion)
CREATE POLICY "Users can delete own profile"
  ON public.users FOR DELETE
  USING (auth.uid() = id);

-- Function: Helper to check admin status (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- This function uses SECURITY DEFINER to bypass RLS
  -- and check if a user is an admin without causing recursion
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Admins can view all users
-- Uses helper function to prevent infinite recursion
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (public.is_admin_user(auth.uid()));

-- Policy: Admins can update all users
-- Uses helper function to prevent infinite recursion
CREATE POLICY "Admins can update all users"
  ON public.users FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

-- ============================================================================
-- STEP 4: CREATE TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- ============================================================================
-- STEP 5: CRUD OPERATIONS
-- ============================================================================

-- ============================================================================
-- CREATE (INSERT) Operations
-- ============================================================================

-- Example 1: Insert user profile after signup (basic)
-- Replace 'user-uuid-here' with actual user ID from auth.users
/*
INSERT INTO public.users (
  id,
  email,
  full_name,
  avatar_level,
  avatar_stage,
  total_progress,
  consistency_streak,
  is_admin
)
VALUES (
  'user-uuid-from-auth-users',  -- Must match auth.users.id
  'user@example.com',
  'John Doe',
  1,
  'seed',
  0,
  0,
  FALSE
);
*/

-- Example 2: Insert with minimal required fields (uses defaults)
/*
INSERT INTO public.users (id, email)
VALUES (
  'user-uuid-from-auth-users',
  'user@example.com'
);
-- All other fields will use defaults
*/

-- Example 3: Insert with upsert (insert or update if exists)
/*
INSERT INTO public.users (
  id,
  email,
  full_name,
  avatar_level,
  avatar_stage,
  total_progress,
  consistency_streak,
  is_admin
)
VALUES (
  'user-uuid-from-auth-users',
  'user@example.com',
  'John Doe',
  1,
  'seed',
  0,
  0,
  FALSE
)
ON CONFLICT (id) 
DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
  updated_at = NOW();
*/

-- Example 4: Bulk insert (for testing/admin purposes)
/*
INSERT INTO public.users (id, email, full_name)
VALUES
  ('uuid-1', 'user1@example.com', 'User One'),
  ('uuid-2', 'user2@example.com', 'User Two'),
  ('uuid-3', 'user3@example.com', 'User Three')
ON CONFLICT (id) DO NOTHING;
*/

-- ============================================================================
-- READ (SELECT) Operations
-- ============================================================================

-- Example 1: Get user by ID
/*
SELECT 
  id,
  email,
  full_name,
  avatar_level,
  avatar_stage,
  total_progress,
  consistency_streak,
  last_activity_date,
  created_at,
  updated_at,
  is_admin
FROM public.users
WHERE id = 'user-uuid-here';
*/

-- Example 2: Get user by email
/*
SELECT * FROM public.users
WHERE email = 'user@example.com';
*/

-- Example 3: Get current authenticated user profile
/*
SELECT * FROM public.users
WHERE id = auth.uid();
*/

-- Example 4: Get all users (admin only - requires admin policy)
/*
SELECT 
  id,
  email,
  full_name,
  avatar_level,
  avatar_stage,
  total_progress,
  consistency_streak,
  created_at,
  is_admin
FROM public.users
ORDER BY created_at DESC;
*/

-- Example 5: Get users with pagination
/*
SELECT 
  id,
  email,
  full_name,
  avatar_level,
  total_progress,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10 OFFSET 0;  -- First 10 users
*/

-- Example 6: Search users by name or email
/*
SELECT 
  id,
  email,
  full_name,
  avatar_level,
  total_progress
FROM public.users
WHERE 
  full_name ILIKE '%search-term%' OR
  email ILIKE '%search-term%'
ORDER BY created_at DESC;
*/

-- Example 7: Get users with join to auth.users (verification status)
/*
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.avatar_level,
  u.avatar_stage,
  u.total_progress,
  u.consistency_streak,
  u.created_at,
  au.email_confirmed_at IS NOT NULL as email_verified,
  au.last_sign_in_at
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.id = 'user-uuid-here';
*/

-- Example 8: Get user statistics
/*
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_admin = TRUE) as admin_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_last_month,
  AVG(total_progress) as avg_progress,
  AVG(consistency_streak) as avg_streak
FROM public.users;
*/

-- Example 9: Get top users by progress
/*
SELECT 
  id,
  email,
  full_name,
  avatar_level,
  avatar_stage,
  total_progress,
  consistency_streak
FROM public.users
ORDER BY total_progress DESC
LIMIT 10;
*/

-- ============================================================================
-- UPDATE Operations
-- ============================================================================

-- Example 1: Update user profile (basic)
/*
UPDATE public.users
SET
  full_name = 'Updated Name',
  updated_at = NOW()
WHERE id = 'user-uuid-here';
*/

-- Example 2: Update avatar level and stage
/*
UPDATE public.users
SET
  avatar_level = 2,
  avatar_stage = 'sprout',
  updated_at = NOW()
WHERE id = 'user-uuid-here';
*/

-- Example 3: Update progress
/*
UPDATE public.users
SET
  total_progress = total_progress + 10,
  updated_at = NOW()
WHERE id = 'user-uuid-here';
*/

-- Example 4: Update consistency streak
/*
UPDATE public.users
SET
  consistency_streak = consistency_streak + 1,
  last_activity_date = CURRENT_DATE,
  updated_at = NOW()
WHERE id = 'user-uuid-here';
*/

-- Example 5: Reset streak (if user missed a day)
/*
UPDATE public.users
SET
  consistency_streak = 0,
  updated_at = NOW()
WHERE id = 'user-uuid-here';
*/

-- Example 6: Update multiple fields
/*
UPDATE public.users
SET
  full_name = 'John Doe',
  avatar_level = 3,
  avatar_stage = 'sapling',
  total_progress = 50,
  consistency_streak = 7,
  last_activity_date = CURRENT_DATE,
  updated_at = NOW()
WHERE id = 'user-uuid-here';
*/

-- Example 7: Admin update user (set admin status)
/*
UPDATE public.users
SET
  is_admin = TRUE,
  updated_at = NOW()
WHERE id = 'user-uuid-here';
-- Note: This requires admin privileges and appropriate RLS policy
*/

-- Example 8: Update based on condition
/*
UPDATE public.users
SET
  avatar_level = CASE
    WHEN total_progress >= 100 THEN 5
    WHEN total_progress >= 50 THEN 4
    WHEN total_progress >= 25 THEN 3
    WHEN total_progress >= 10 THEN 2
    ELSE 1
  END,
  avatar_stage = CASE
    WHEN total_progress >= 100 THEN 'oak'
    WHEN total_progress >= 50 THEN 'tree'
    WHEN total_progress >= 25 THEN 'sapling'
    WHEN total_progress >= 10 THEN 'sprout'
    ELSE 'seed'
  END,
  updated_at = NOW()
WHERE id = 'user-uuid-here';
*/

-- ============================================================================
-- DELETE Operations
-- ============================================================================

-- Example 1: Delete user profile (user deletes own account)
/*
DELETE FROM public.users
WHERE id = 'user-uuid-here';
-- Note: This should be done after deleting from auth.users
*/

-- Example 2: Delete user by email
/*
DELETE FROM public.users
WHERE email = 'user@example.com';
*/

-- Example 3: Admin delete user
/*
DELETE FROM public.users
WHERE id = 'user-uuid-here';
-- Note: Requires admin privileges
*/

-- Example 4: Delete inactive users (older than X days)
/*
DELETE FROM public.users
WHERE 
  last_activity_date < CURRENT_DATE - INTERVAL '365 days'
  AND is_admin = FALSE;
-- Use with caution!
*/

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get or create user profile
CREATE OR REPLACE FUNCTION get_or_create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_level INTEGER,
  avatar_stage TEXT,
  total_progress INTEGER,
  consistency_streak INTEGER
) AS $$
BEGIN
  -- Try to get existing profile
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.avatar_level,
    u.avatar_stage,
    u.total_progress,
    u.consistency_streak
  FROM public.users u
  WHERE u.id = user_id;
  
  -- If no profile exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.users (id, email, full_name)
    VALUES (user_id, user_email, user_full_name)
    ON CONFLICT (id) DO NOTHING;
    
    -- Return the newly created profile
    RETURN QUERY
    SELECT 
      u.id,
      u.email,
      u.full_name,
      u.avatar_level,
      u.avatar_stage,
      u.total_progress,
      u.consistency_streak
    FROM public.users u
    WHERE u.id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment user progress
CREATE OR REPLACE FUNCTION increment_user_progress(
  user_id UUID,
  points INTEGER DEFAULT 1
)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET
    total_progress = total_progress + points,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update user streak
CREATE OR REPLACE FUNCTION update_user_streak(
  user_id UUID,
  increment BOOLEAN DEFAULT TRUE
)
RETURNS void AS $$
BEGIN
  IF increment THEN
    UPDATE public.users
    SET
      consistency_streak = consistency_streak + 1,
      last_activity_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE id = user_id;
  ELSE
    UPDATE public.users
    SET
      consistency_streak = 0,
      updated_at = NOW()
    WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update avatar based on progress
CREATE OR REPLACE FUNCTION update_user_avatar(
  user_id UUID
)
RETURNS void AS $$
DECLARE
  user_progress INTEGER;
  new_level INTEGER;
  new_stage TEXT;
BEGIN
  -- Get user's current progress
  SELECT total_progress INTO user_progress
  FROM public.users
  WHERE id = user_id;
  
  -- Determine new level and stage based on progress
  IF user_progress >= 100 THEN
    new_level := 5;
    new_stage := 'oak';
  ELSIF user_progress >= 50 THEN
    new_level := 4;
    new_stage := 'tree';
  ELSIF user_progress >= 25 THEN
    new_level := 3;
    new_stage := 'sapling';
  ELSIF user_progress >= 10 THEN
    new_level := 2;
    new_stage := 'sprout';
  ELSE
    new_level := 1;
    new_stage := 'seed';
  END IF;
  
  -- Update user avatar
  UPDATE public.users
  SET
    avatar_level = new_level,
    avatar_stage = new_stage,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Prevent users from changing their own admin status
-- Updated to allow service role/database owner updates (Supabase table editor, SQL Editor)
CREATE OR REPLACE FUNCTION prevent_self_admin_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if admin status is being changed from FALSE to TRUE
  IF OLD.is_admin = FALSE AND NEW.is_admin = TRUE THEN
    -- Allow if:
    -- 1. auth.uid() is NULL (service role/database owner - Supabase table editor, SQL Editor)
    -- 2. Current user is an admin (admins can grant admin status)
    IF auth.uid() IS NULL THEN
      -- Service role/database owner - allow update (for manual table edits)
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS prevent_admin_change ON public.users;

-- Create trigger to prevent self-admin changes
CREATE TRIGGER prevent_admin_change
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_admin_change();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'users'
) as table_exists;

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users';

-- Check triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'users';

-- Count users
SELECT COUNT(*) as total_users FROM public.users;

-- Summary statistics
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_admin = TRUE) as admin_count,
  COUNT(*) FILTER (WHERE email IS NOT NULL) as users_with_email,
  AVG(total_progress)::INTEGER as avg_progress,
  MAX(total_progress) as max_progress,
  AVG(consistency_streak)::INTEGER as avg_streak,
  MAX(consistency_streak) as max_streak
FROM public.users;

-- ============================================================================
-- COMPLETE SETUP VERIFICATION
-- ============================================================================

SELECT 
  'User CRUD operations setup complete!' as status,
  (SELECT COUNT(*) FROM public.users) as current_user_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'users') as rls_policy_count,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table = 'users') as trigger_count;

