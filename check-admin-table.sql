-- Check Admin Table Access
-- This will help us understand if you're actually in the admin_users table

-- 1. First, let's see all admin users in the table
SELECT 
  'Step 1: All Admin Users' as step,
  'Total admin users' as info,
  (SELECT count(*)::text FROM public.admin_users) as value
UNION ALL
SELECT 
  'Step 1: All Admin Users' as step,
  'Your user ID' as info,
  auth.uid()::text as value;

-- 2. Show all admin users (if we can access the table)
SELECT 
  'Step 2: Admin Users List' as step,
  'user_id' as info,
  au.user_id::text as value
FROM public.admin_users au
UNION ALL
SELECT 
  'Step 2: Admin Users List' as step,
  'permissions' as info,
  au.permissions::text as value
FROM public.admin_users au;

-- 3. Check if you're specifically in the table
SELECT 
  'Step 3: Your Admin Status' as step,
  'Are you in admin_users?' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as value;

-- 4. Try to add yourself if you're not in the table
-- First, let's get your user info
SELECT 
  'Step 4: Your User Info' as step,
  'Your email' as info,
  u.email as value
FROM auth.users u
WHERE u.id = auth.uid()
UNION ALL
SELECT 
  'Step 4: Your User Info' as step,
  'Your created_at' as info,
  u.created_at::text as value
FROM auth.users u
WHERE u.id = auth.uid();

-- 5. Add yourself as admin (uncomment and run if you're not in the table)
-- INSERT INTO public.admin_users (user_id, permissions) 
-- VALUES (auth.uid(), ARRAY['maintenance_control', 'user_management', 'analytics', 'crash_control'])
-- ON CONFLICT (user_id) DO UPDATE SET 
--   permissions = EXCLUDED.permissions,
--   created_at = EXCLUDED.created_at;

-- 6. Test again after adding yourself
SELECT 
  'Step 6: Test After Adding' as step,
  'Are you now an admin?' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as value;

-- 7. Test the function again
SELECT 
  'Step 7: Function Test' as step,
  'check_admin_status() result' as info,
  public.check_admin_status()::text as value;

-- 8. Final comprehensive test
SELECT 
  'Step 8: Final Test' as step,
  'All systems working' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    AND public.check_admin_status()
    THEN 'YES' 
    ELSE 'NO' 
  END as value;