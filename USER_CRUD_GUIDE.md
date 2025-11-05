# User CRUD Operations Guide for Supabase

## Overview

This guide provides complete CRUD (Create, Read, Update, Delete) operations for the `public.users` table in Supabase.

## 📋 Table Structure

The `users` table has the following structure:

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY,              -- References auth.users(id)
  email TEXT UNIQUE NOT NULL,       -- User email
  full_name TEXT,                    -- User's full name
  avatar_level INTEGER DEFAULT 1,    -- Avatar level (1-5)
  avatar_stage TEXT DEFAULT 'seed',  -- Avatar stage (seed, sprout, sapling, tree, oak)
  total_progress INTEGER DEFAULT 0,  -- Total progress points
  consistency_streak INTEGER DEFAULT 0, -- Daily streak count
  last_activity_date DATE,           -- Last activity date
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE    -- Admin flag
);
```

## 🚀 Quick Setup

### Step 1: Create Table

Run the SQL from `user-crud-operations.sql` in Supabase SQL Editor, or use:

```sql
-- See database-setup.sql for complete table creation
```

### Step 2: Enable RLS

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

### Step 3: Create Policies

RLS policies are automatically created in `user-crud-operations.sql`.

## 📝 CRUD Operations

### CREATE (Insert)

#### Basic Insert (After User Signup)

```sql
INSERT INTO public.users (
  id,                    -- User ID from auth.users (REQUIRED)
  email,                 -- User email (REQUIRED)
  full_name,             -- Optional
  avatar_level,          -- Optional (default: 1)
  avatar_stage,          -- Optional (default: 'seed')
  total_progress,        -- Optional (default: 0)
  consistency_streak,    -- Optional (default: 0)
  is_admin               -- Optional (default: FALSE)
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
);
```

#### Minimal Insert (Uses Defaults)

```sql
INSERT INTO public.users (id, email)
VALUES ('user-uuid', 'user@example.com');
```

#### Upsert (Insert or Update)

```sql
INSERT INTO public.users (id, email, full_name)
VALUES ('user-uuid', 'user@example.com', 'John Doe')
ON CONFLICT (id) 
DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
  updated_at = NOW();
```

### READ (Select)

#### Get User by ID

```sql
SELECT * FROM public.users
WHERE id = 'user-uuid-here';
```

#### Get Current User (Authenticated)

```sql
SELECT * FROM public.users
WHERE id = auth.uid();
```

#### Get User by Email

```sql
SELECT * FROM public.users
WHERE email = 'user@example.com';
```

#### Get All Users (Admin Only)

```sql
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
```

#### Search Users

```sql
SELECT 
  id,
  email,
  full_name,
  avatar_level,
  total_progress
FROM public.users
WHERE 
  full_name ILIKE '%search%' OR
  email ILIKE '%search%'
ORDER BY created_at DESC;
```

#### Get User with Auth Status

```sql
SELECT 
  u.*,
  au.email_confirmed_at IS NOT NULL as email_verified,
  au.last_sign_in_at
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.id = 'user-uuid-here';
```

#### Pagination

```sql
SELECT * FROM public.users
ORDER BY created_at DESC
LIMIT 10 OFFSET 0;  -- First page (10 users)
```

### UPDATE

#### Update User Profile

```sql
UPDATE public.users
SET
  full_name = 'Updated Name',
  updated_at = NOW()
WHERE id = 'user-uuid-here';
```

#### Update Progress

```sql
UPDATE public.users
SET
  total_progress = total_progress + 10,
  updated_at = NOW()
WHERE id = 'user-uuid-here';
```

#### Update Streak

```sql
UPDATE public.users
SET
  consistency_streak = consistency_streak + 1,
  last_activity_date = CURRENT_DATE,
  updated_at = NOW()
WHERE id = 'user-uuid-here';
```

#### Update Avatar

```sql
UPDATE public.users
SET
  avatar_level = 2,
  avatar_stage = 'sprout',
  updated_at = NOW()
WHERE id = 'user-uuid-here';
```

#### Update Multiple Fields

```sql
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
```

#### Auto-Update Avatar Based on Progress

```sql
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
```

### DELETE

#### Delete User Profile

```sql
DELETE FROM public.users
WHERE id = 'user-uuid-here';
```

**Note:** Usually done after deleting from `auth.users`.

#### Delete by Email

```sql
DELETE FROM public.users
WHERE email = 'user@example.com';
```

## 🔧 Helper Functions

### Get or Create User Profile

```sql
SELECT * FROM get_or_create_user_profile(
  'user-uuid',
  'user@example.com',
  'John Doe'  -- Optional
);
```

### Increment User Progress

```sql
SELECT increment_user_progress('user-uuid', 10);  -- Add 10 points
```

### Update User Streak

```sql
-- Increment streak
SELECT update_user_streak('user-uuid', TRUE);

-- Reset streak
SELECT update_user_streak('user-uuid', FALSE);
```

### Update Avatar Based on Progress

```sql
SELECT update_user_avatar('user-uuid');
```

## 🔒 Security (RLS Policies)

The following RLS policies are created:

1. **Users can view own profile** - Users can SELECT their own profile
2. **Users can create own profile** - Users can INSERT their own profile
3. **Users can update own profile** - Users can UPDATE their own profile (except admin status)
4. **Users can delete own profile** - Users can DELETE their own profile
5. **Admins can view all users** - Admins can SELECT all users
6. **Admins can update all users** - Admins can UPDATE all users

## 🎯 Common Use Cases

### User Registration Flow

1. User signs up via `supabase.auth.signUp()`
2. Get user ID from response: `data.user.id`
3. Insert profile:
   ```sql
   INSERT INTO public.users (id, email, full_name)
   VALUES (user_id, user_email, user_full_name);
   ```

### Update User After Activity

```sql
UPDATE public.users
SET
  total_progress = total_progress + 5,
  consistency_streak = consistency_streak + 1,
  last_activity_date = CURRENT_DATE,
  updated_at = NOW()
WHERE id = auth.uid();
```

### Get User Dashboard Data

```sql
SELECT 
  id,
  email,
  full_name,
  avatar_level,
  avatar_stage,
  total_progress,
  consistency_streak,
  last_activity_date
FROM public.users
WHERE id = auth.uid();
```

### Admin: Get All Users with Stats

```sql
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.avatar_level,
  u.total_progress,
  u.consistency_streak,
  u.created_at,
  au.email_confirmed_at IS NOT NULL as email_verified
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
ORDER BY u.created_at DESC;
```

## 📊 Verification Queries

### Check Table Exists

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'users'
);
```

### Check Table Structure

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;
```

### Check RLS Policies

```sql
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users';
```

### Get Statistics

```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_admin = TRUE) as admin_count,
  AVG(total_progress)::INTEGER as avg_progress,
  MAX(total_progress) as max_progress,
  AVG(consistency_streak)::INTEGER as avg_streak
FROM public.users;
```

## 🐛 Troubleshooting

### Table Not Created

1. Run `user-crud-operations.sql` in Supabase SQL Editor
2. Check for errors in the SQL Editor
3. Verify you have the correct permissions

### RLS Blocking Operations

1. Check if RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'users';`
2. Verify policies exist: See "Check RLS Policies" above
3. Ensure user is authenticated: `SELECT auth.uid();`

### Cannot Insert User

1. Verify user exists in `auth.users` first
2. Check that user ID matches `auth.users.id`
3. Ensure email is unique
4. Verify RLS policy allows INSERT

### Cannot Update User

1. Check RLS policies allow UPDATE
2. Verify user is updating their own profile (or is admin)
3. Ensure user ID matches `auth.uid()`

## 📚 Complete SQL File

For complete SQL operations, see: `user-crud-operations.sql`

This file includes:
- ✅ Table creation
- ✅ RLS setup
- ✅ All CRUD operations
- ✅ Helper functions
- ✅ Verification queries

## 🎓 Best Practices

1. **Always use user ID from `auth.users`** - Never generate your own UUID
2. **Use upsert for profile creation** - Handles duplicates gracefully
3. **Update `updated_at` manually** - Or rely on trigger
4. **Check RLS policies** - Ensure operations are allowed
5. **Use helper functions** - For complex operations
6. **Validate data** - Check constraints before inserting
7. **Use transactions** - For multiple related operations
8. **Index frequently queried columns** - Already included in setup

## 🔗 Related Files

- `database-setup.sql` - Complete database schema
- `user-crud-operations.sql` - Complete CRUD SQL operations
- `lib/types/database.ts` - TypeScript type definitions

