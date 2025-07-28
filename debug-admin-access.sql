-- Debug Admin Access Issues
-- This script will help identify what's preventing admin access

-- 1. Check if you're actually in the admin_users table
SELECT 
  'Step 1: Check admin_users table' as step,
  'Your user ID' as info,
  auth.uid()::text as value
UNION ALL
SELECT 
  'Step 1: Check admin_users table' as step,
  'Admin users count' as info,
  (SELECT count(*)::text FROM public.admin_users) as value
UNION ALL
SELECT 
  'Step 1: Check admin_users table' as step,
  'Your admin record exists' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as value;

-- 2. Check RLS policies
SELECT 
  'Step 2: RLS Policies' as step,
  'admin_users table has RLS' as info,
  (SELECT relrowsecurity::text FROM pg_class WHERE relname = 'admin_users') as value
UNION ALL
SELECT 
  'Step 2: RLS Policies' as step,
  'Number of policies on admin_users' as info,
  (SELECT count(*)::text FROM pg_policies WHERE tablename = 'admin_users') as value;

-- 3. Check your current role and permissions
SELECT 
  'Step 3: Current User' as step,
  'Current role' as info,
  auth.role() as value
UNION ALL
SELECT 
  'Step 3: Current User' as step,
  'Current user ID' as info,
  auth.uid()::text as value;

-- 4. Test direct table access (bypassing RLS)
SELECT 
  'Step 4: Direct Table Access' as step,
  'Can access admin_users directly' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as value;

-- 5. Check function permissions
SELECT 
  'Step 5: Function Permissions' as step,
  'check_admin_status function exists' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'check_admin_status') 
    THEN 'YES' 
    ELSE 'NO' 
  END as value
UNION ALL
SELECT 
  'Step 5: Function Permissions' as step,
  'check_admin_status is SECURITY DEFINER' as info,
  (SELECT prosecdef::text FROM pg_proc WHERE proname = 'check_admin_status') as value;

-- 6. Test function execution
SELECT 
  'Step 6: Function Test' as step,
  'check_admin_status result' as info,
  public.check_admin_status()::text as value;

-- 7. Check if you can see your admin record with profile join
SELECT 
  'Step 7: Profile Join Test' as step,
  'Can join with profiles' as info,
  CASE 
    WHEN EXISTS(
      SELECT 1 
      FROM public.admin_users au
      JOIN public.profiles p ON au.user_id = p.id
      WHERE au.user_id = auth.uid()
    ) 
    THEN 'YES' 
    ELSE 'NO' 
  END as value;

-- 8. Show your actual admin record (if it exists)
SELECT 
  'Step 8: Your Admin Record' as step,
  'user_id' as info,
  au.user_id::text as value
FROM public.admin_users au
WHERE au.user_id = auth.uid()
UNION ALL
SELECT 
  'Step 8: Your Admin Record' as step,
  'permissions' as info,
  au.permissions::text as value
FROM public.admin_users au
WHERE au.user_id = auth.uid()
UNION ALL
SELECT 
  'Step 8: Your Admin Record' as step,
  'created_at' as info,
  au.created_at::text as value
FROM public.admin_users au
WHERE au.user_id = auth.uid();

-- 9. Test maintenance functions
SELECT 
  'Step 9: Maintenance Functions' as step,
  'get_maintenance_status exists' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_maintenance_status') 
    THEN 'YES' 
    ELSE 'NO' 
  END as value
UNION ALL
SELECT 
  'Step 9: Maintenance Functions' as step,
  'toggle_maintenance_mode exists' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'toggle_maintenance_mode') 
    THEN 'YES' 
    ELSE 'NO' 
  END as value;

-- 10. Final comprehensive test
SELECT 
  'Step 10: Final Test' as step,
  'All systems working' as info,
  CASE 
    WHEN public.check_admin_status() 
    AND public.has_admin_permission('maintenance_control') 
    AND EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_maintenance_status')
    THEN 'YES' 
    ELSE 'NO' 
  END as value;