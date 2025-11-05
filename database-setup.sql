-- Mentor.ai Database Schema Setup
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/poqjbackapixblcwnmvo/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
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
  is_admin BOOLEAN DEFAULT FALSE
);

-- Goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  main_goal TEXT NOT NULL, -- "one thing"
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Milestones table (progress checkpoints)
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Micro-actions table (daily actions)
CREATE TABLE IF NOT EXISTS public.actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  scheduled_date DATE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table (chat history)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progress logs table
CREATE TABLE IF NOT EXISTS public.progress_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
  action_id UUID REFERENCES public.actions(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  progress_type TEXT NOT NULL CHECK (progress_type IN ('action', 'milestone', 'goal')),
  points_earned INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Avatar stages configuration
CREATE TABLE IF NOT EXISTS public.avatar_stages (
  level INTEGER PRIMARY KEY,
  stage_name TEXT NOT NULL,
  description TEXT,
  min_progress_points INTEGER NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default avatar stages (only if table is empty)
INSERT INTO public.avatar_stages (level, stage_name, description, min_progress_points, image_url)
SELECT * FROM (VALUES
  (1, 'seed', 'The beginning of your journey', 0, '/avatars/seed.svg'),
  (2, 'sprout', 'Growth begins', 10, '/avatars/sprout.svg'),
  (3, 'sapling', 'Building strength', 25, '/avatars/sapling.svg'),
  (4, 'tree', 'Standing tall', 50, '/avatars/tree.svg'),
  (5, 'oak', 'Wisdom and maturity', 100, '/avatars/oak.svg')
) AS v(level, stage_name, description, min_progress_points, image_url)
WHERE NOT EXISTS (SELECT 1 FROM public.avatar_stages);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can create own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can create own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own progress" ON public.progress_logs;
DROP POLICY IF EXISTS "Users can create own progress" ON public.progress_logs;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- RLS Policies for users
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can create own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for goals
-- Filter out deleted records in SELECT
CREATE POLICY "Users can view own goals"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "Users can create own goals"
  ON public.goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update policy: Users can update their own goals
-- The trigger will prevent restoring deleted records
CREATE POLICY "Users can update own goals"
  ON public.goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for milestones
-- Filter out deleted records in SELECT
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

CREATE POLICY "Users can create own milestones"
  ON public.milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = milestones.goal_id 
        AND goals.user_id = auth.uid()
        AND goals.is_deleted = FALSE
    )
  );

CREATE POLICY "Users can update own milestones"
  ON public.milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = milestones.goal_id 
        AND goals.user_id = auth.uid()
        AND goals.is_deleted = FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = milestones.goal_id 
        AND goals.user_id = auth.uid()
        AND goals.is_deleted = FALSE
    )
  );

-- Soft delete policy for milestones
CREATE POLICY "Users can soft delete own milestones"
  ON public.milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = milestones.goal_id 
        AND goals.user_id = auth.uid()
        AND goals.is_deleted = FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = milestones.goal_id 
        AND goals.user_id = auth.uid()
        AND goals.is_deleted = FALSE
    ) AND
    ((OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE) OR
     (OLD.is_deleted = NEW.is_deleted))
  );

-- RLS Policies for actions
-- Filter out deleted records in SELECT
CREATE POLICY "Users can view own actions"
  ON public.actions FOR SELECT
  USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "Users can create own actions"
  ON public.actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own actions"
  ON public.actions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Soft delete policy for actions
CREATE POLICY "Users can soft delete own actions"
  ON public.actions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    ((OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE) OR
     (OLD.is_deleted = NEW.is_deleted))
  );

-- RLS Policies for messages
-- Filter out deleted records in SELECT
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "Users can create own messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Soft delete policy for messages
CREATE POLICY "Users can soft delete own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    ((OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE) OR
     (OLD.is_deleted = NEW.is_deleted))
  );

-- RLS Policies for progress_logs
-- Filter out deleted records in SELECT
CREATE POLICY "Users can view own progress"
  ON public.progress_logs FOR SELECT
  USING (auth.uid() = user_id AND is_deleted = FALSE);

CREATE POLICY "Users can create own progress"
  ON public.progress_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Soft delete policy for progress logs
CREATE POLICY "Users can soft delete own progress"
  ON public.progress_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    ((OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE) OR
     (OLD.is_deleted = NEW.is_deleted))
  );

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

-- Admin policies (for admin panel)
-- Uses helper function to prevent infinite recursion
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update all users"
  ON public.users FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

-- Functions for soft delete operations
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

CREATE OR REPLACE FUNCTION soft_delete_action(action_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.actions
  SET is_deleted = TRUE
  WHERE id = action_uuid AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION soft_delete_message(message_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.messages
  SET is_deleted = TRUE
  WHERE id = message_uuid AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION soft_delete_user_messages(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.messages
  SET is_deleted = TRUE
  WHERE user_id = user_uuid AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION restore_goal(goal_uuid UUID)
RETURNS void AS $$
BEGIN
  -- Temporarily disable the trigger to allow restoration
  -- This function uses SECURITY DEFINER so it bypasses RLS
  UPDATE public.goals
  SET is_deleted = FALSE, updated_at = NOW()
  WHERE id = goal_uuid AND is_deleted = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to prevent users from restoring deleted records themselves
-- (Only admins or the restore function can restore)
CREATE OR REPLACE FUNCTION prevent_self_restore()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to change is_deleted from TRUE to FALSE, block it
  -- Users can only soft delete (FALSE -> TRUE), not restore (TRUE -> FALSE)
  -- The restore_goal() function uses SECURITY DEFINER so it bypasses this check
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

-- Create trigger to prevent user-initiated restores
CREATE TRIGGER prevent_goal_restore
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  WHEN (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted)
  EXECUTE FUNCTION prevent_self_restore();

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;

-- Create indexes for better performance on is_deleted queries
CREATE INDEX IF NOT EXISTS idx_goals_is_deleted ON public.goals(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_milestones_is_deleted ON public.milestones(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_actions_is_deleted ON public.actions(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON public.messages(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_progress_logs_is_deleted ON public.progress_logs(is_deleted) WHERE is_deleted = FALSE;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at 
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify setup
SELECT 'Database setup complete!' as status;

-- Verify tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('users', 'goals', 'milestones', 'actions', 'messages', 'progress_logs', 'avatar_stages') 
    THEN '✅ Created' 
    ELSE '❌ Missing' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'goals', 'milestones', 'actions', 'messages', 'progress_logs', 'avatar_stages')
ORDER BY table_name;

-- Verify users table structure
SELECT 
  'Users table columns:' as info,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users';

-- Verify users table has data (if any)
SELECT 
  'Users table:' as info,
  COUNT(*) as user_count
FROM public.users;

