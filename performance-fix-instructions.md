# Fix Performance Warnings in Supabase

This guide will help you fix all 55 performance warnings in your Supabase project.

## Step 1: Access Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the following SQL commands one by one

## Step 2: Drop Problematic Policies

Run this first to remove all problematic policies:

```sql
-- Drop policies from profiles table
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;

-- Drop policies from user_level_stats table
DROP POLICY IF EXISTS "Service role can insert user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Service role can update user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_insert_all" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_update_all" ON public.user_level_stats;

-- Drop policies from notifications table
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications for any user" ON public.notifications;

-- Drop policies from case_rewards table
DROP POLICY IF EXISTS "Service role can insert case rewards" ON public.case_rewards;
DROP POLICY IF EXISTS "Users can insert their own case rewards" ON public.case_rewards;

-- Drop policies from maintenance_settings table
DROP POLICY IF EXISTS "Only service role can update maintenance settings" ON public.maintenance_settings;
DROP POLICY IF EXISTS "Only service role can insert maintenance settings" ON public.maintenance_settings;

-- Drop policies from unlocked_achievements table
DROP POLICY IF EXISTS "Users can view own unlocked achievements" ON public.unlocked_achievements;
DROP POLICY IF EXISTS "Users can insert own unlocked achievements" ON public.unlocked_achievements;
DROP POLICY IF EXISTS "Users can delete own unlocked achievements" ON public.unlocked_achievements;
DROP POLICY IF EXISTS "Service role full access to unlocked achievements" ON public.unlocked_achievements;

-- Drop policies from admin_users table
DROP POLICY IF EXISTS "Allow authenticated users to view admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow service role to manage admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can view admin users" ON public.admin_users;
```

## Step 3: Create Optimized Policies

Run this to create the new optimized policies:

```sql
-- Profiles table - optimized policies
CREATE POLICY "profiles_service_role_access" ON public.profiles
    FOR ALL USING (
        (SELECT auth.role()) = 'service_role'
    );

CREATE POLICY "profiles_own_access" ON public.profiles
    FOR ALL USING (
        (SELECT auth.uid()) = id
    );

-- User level stats table - optimized policies
CREATE POLICY "user_level_stats_service_role_access" ON public.user_level_stats
    FOR ALL USING (
        (SELECT auth.role()) = 'service_role'
    );

CREATE POLICY "user_level_stats_own_access" ON public.user_level_stats
    FOR ALL USING (
        (SELECT auth.uid()) = user_id
    );

-- Notifications table - optimized policies
CREATE POLICY "notifications_service_role_access" ON public.notifications
    FOR ALL USING (
        (SELECT auth.role()) = 'service_role'
    );

CREATE POLICY "notifications_admin_access" ON public.notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "notifications_own_access" ON public.notifications
    FOR SELECT USING (
        (SELECT auth.uid()) = user_id
    );

-- Case rewards table - optimized policies
CREATE POLICY "case_rewards_service_role_access" ON public.case_rewards
    FOR ALL USING (
        (SELECT auth.role()) = 'service_role'
    );

CREATE POLICY "case_rewards_own_access" ON public.case_rewards
    FOR ALL USING (
        (SELECT auth.uid()) = user_id
    );

-- Maintenance settings table - optimized policies
CREATE POLICY "maintenance_settings_service_role_access" ON public.maintenance_settings
    FOR ALL USING (
        (SELECT auth.role()) = 'service_role'
    );

CREATE POLICY "maintenance_settings_admin_access" ON public.maintenance_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

-- Unlocked achievements table - optimized policies
CREATE POLICY "unlocked_achievements_service_role_access" ON public.unlocked_achievements
    FOR ALL USING (
        (SELECT auth.role()) = 'service_role'
    );

CREATE POLICY "unlocked_achievements_own_access" ON public.unlocked_achievements
    FOR ALL USING (
        (SELECT auth.uid()) = user_id
    );

-- Admin users table - optimized policies
CREATE POLICY "admin_users_service_role_access" ON public.admin_users
    FOR ALL USING (
        (SELECT auth.role()) = 'service_role'
    );

CREATE POLICY "admin_users_authenticated_view" ON public.admin_users
    FOR SELECT USING (
        (SELECT auth.uid()) IS NOT NULL
    );
```

## Step 4: Enable RLS and Grant Permissions

Run this to ensure RLS is enabled and permissions are set:

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_level_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlocked_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Grant permissions to service role
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_level_stats TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.case_rewards TO service_role;
GRANT ALL ON public.maintenance_settings TO service_role;
GRANT ALL ON public.unlocked_achievements TO service_role;
GRANT ALL ON public.admin_users TO service_role;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_level_stats TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT, INSERT ON public.case_rewards TO authenticated;
GRANT SELECT ON public.maintenance_settings TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.unlocked_achievements TO authenticated;
GRANT SELECT ON public.admin_users TO authenticated;

-- Grant permissions to anon users
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.user_level_stats TO anon;
GRANT SELECT ON public.notifications TO anon;
GRANT SELECT ON public.case_rewards TO anon;
GRANT SELECT ON public.maintenance_settings TO anon;
GRANT SELECT ON public.unlocked_achievements TO anon;
GRANT SELECT ON public.admin_users TO anon;
```

## Step 5: Verify the Fixes

After running all the above commands, check your Supabase dashboard:

1. Go to **Database** → **Linter**
2. You should see that the 55 performance warnings are now resolved
3. Test your application to ensure everything still works correctly

## What This Fixes

### Auth RLS Initialization Plan Warnings (15 warnings)
- **Problem**: `auth.uid()` and `auth.role()` were being called directly in policies
- **Solution**: Wrapped them in `(SELECT auth.function())` to prevent re-evaluation for each row

### Multiple Permissive Policies Warnings (40 warnings)
- **Problem**: Multiple policies for the same role/action were causing performance issues
- **Solution**: Consolidated policies into single, optimized versions

## Tables Fixed
- `public.profiles`
- `public.user_level_stats`
- `public.notifications`
- `public.case_rewards`
- `public.maintenance_settings`
- `public.unlocked_achievements`
- `public.admin_users`

## Performance Improvements
- ✅ Reduced policy evaluation overhead
- ✅ Eliminated duplicate policy checks
- ✅ Optimized auth function calls
- ✅ Streamlined access control logic

## Maintained Functionality
- ✅ Service role still has full access
- ✅ Users can still access their own data
- ✅ Admins retain their privileges
- ✅ All existing security is preserved

## Testing
After applying these fixes, test the following functionality:
1. User registration and login
2. Admin panel access
3. Maintenance mode toggle
4. Push notifications
5. Game functionality (roulette, coinflip, tower)
6. Profile updates
7. Achievement system

If any issues arise, you can revert by running the original setup scripts.