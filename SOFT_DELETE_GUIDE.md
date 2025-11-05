# Soft Delete Implementation Guide

## Overview

This project implements **soft delete** functionality instead of hard deletes. When data is "deleted", it's not actually removed from the database. Instead, the `is_deleted` field is set to `TRUE`, preserving data for security and audit purposes.

## Tables with Soft Delete

The following tables have `is_deleted` field:

- ✅ `goals` - User goals
- ✅ `milestones` - Goal milestones
- ✅ `actions` - Micro-actions
- ✅ `messages` - Chat messages
- ✅ `progress_logs` - Progress tracking logs

**Note:** The `users` table does NOT have `is_deleted` because user deletion is handled by Supabase Auth.

## Database Schema

Each table now includes:
```sql
is_deleted BOOLEAN DEFAULT FALSE
```

## How Soft Delete Works

### 1. Instead of DELETE, use UPDATE

**❌ Hard Delete (DON'T USE):**
```sql
DELETE FROM public.goals WHERE id = 'goal-id';
```

**✅ Soft Delete (USE THIS):**
```sql
UPDATE public.goals 
SET is_deleted = TRUE, updated_at = NOW()
WHERE id = 'goal-id';
```

### 2. RLS Policies Automatically Filter Deleted Records

All SELECT policies now include `AND is_deleted = FALSE`:
- Users can only see non-deleted records
- Deleted records are automatically hidden from queries

### 3. Helper Functions

Use these functions for soft delete operations:

```sql
-- Soft delete a goal (also deletes related milestones and actions)
SELECT soft_delete_goal('goal-uuid');

-- Soft delete a milestone (also deletes related actions)
SELECT soft_delete_milestone('milestone-uuid');

-- Soft delete an action
SELECT soft_delete_action('action-uuid');

-- Soft delete a message
SELECT soft_delete_message('message-uuid');

-- Soft delete all user messages (clear chat history)
SELECT soft_delete_user_messages('user-uuid');

-- Restore a deleted goal
SELECT restore_goal('goal-uuid');
```

## Frontend Implementation

### Delete a Goal

```typescript
// Instead of: supabase.from('goals').delete().eq('id', goalId)
// Use:
await supabase
  .from('goals')
  .update({ is_deleted: true, updated_at: new Date().toISOString() })
  .eq('id', goalId)
```

### Query Records (Automatically Filters Deleted)

```typescript
// Regular queries automatically exclude deleted records
const { data } = await supabase
  .from('goals')
  .select('*')
  .eq('user_id', userId)
// RLS policy automatically adds: AND is_deleted = FALSE
```

### View Deleted Records (Admin Only)

If you need to view deleted records for admin purposes:

```typescript
// This would require a special admin policy
const { data } = await supabase
  .from('goals')
  .select('*')
  .eq('is_deleted', true) // Only works if admin policy allows it
```

## Benefits

1. **Data Preservation**: Data is never lost, can be recovered
2. **Audit Trail**: See what was deleted and when
3. **Referential Integrity**: Foreign keys remain valid
4. **Recovery**: Can restore accidentally deleted data
5. **Analytics**: Can analyze deleted vs active records

## Migration Steps

1. **Run the SQL migration** (`implement-soft-delete.sql`)
   - Adds `is_deleted` columns to tables
   - Creates indexes for performance
   - Updates RLS policies
   - Creates helper functions

2. **Update existing delete operations** in your code:
   - Replace `.delete()` with `.update({ is_deleted: true })`
   - Update components that perform deletions

3. **Test the implementation**:
   - Delete a goal → verify it's hidden
   - Check that deleted records don't appear in lists
   - Verify RLS policies work correctly

## Example: Updating Delete Operations

### Before (Hard Delete):
```typescript
const handleDelete = async (goalId: string) => {
  await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)
}
```

### After (Soft Delete):
```typescript
const handleDelete = async (goalId: string) => {
  await supabase
    .from('goals')
    .update({ 
      is_deleted: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', goalId)
}
```

## Admin Operations

Admins can view deleted records if needed (requires additional policy):

```sql
-- Policy for admins to view deleted records
CREATE POLICY "Admins can view deleted records"
  ON public.goals FOR SELECT
  USING (
    public.is_admin_user(auth.uid()) AND
    is_deleted = TRUE
  );
```

## Restoring Deleted Records

To restore a deleted record:

```sql
-- Restore a goal
SELECT restore_goal('goal-uuid');

-- Or manually:
UPDATE public.goals
SET is_deleted = FALSE, updated_at = NOW()
WHERE id = 'goal-uuid' AND is_deleted = TRUE;
```

## Performance

Indexes are created on `is_deleted` for efficient queries:
- Partial indexes: `WHERE is_deleted = FALSE` (only index active records)
- Fast filtering of deleted records

## Important Notes

1. **Foreign Keys**: Keep `ON DELETE CASCADE` for actual database cleanup (if needed)
2. **Queries**: Always filter by `is_deleted = FALSE` when querying (or rely on RLS)
3. **Restore**: Users cannot restore their own deleted records (requires admin or special function)
4. **Cascade**: Soft deleting a goal also soft deletes related milestones and actions (via helper function)

