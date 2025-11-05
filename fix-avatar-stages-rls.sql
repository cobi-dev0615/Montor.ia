-- Enable RLS and Create Policies for Avatar Stages Table
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/poqjbackapixblcwnmvo/sql
--
-- This allows admins to manage avatar stages in the Content Management page

-- Enable RLS on avatar_stages table
ALTER TABLE public.avatar_stages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view avatar stages" ON public.avatar_stages;
DROP POLICY IF EXISTS "Admins can manage avatar stages" ON public.avatar_stages;

-- Policy: Anyone can view avatar stages (needed for user progress display)
CREATE POLICY "Anyone can view avatar stages"
  ON public.avatar_stages FOR SELECT
  USING (true);

-- Policy: Admins can insert, update, and delete avatar stages
CREATE POLICY "Admins can manage avatar stages"
  ON public.avatar_stages FOR ALL
  USING (public.is_admin_user(auth.uid()));

-- Verify policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'avatar_stages';

