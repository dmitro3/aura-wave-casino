-- Detailed Debug: Find the Exact Issue
-- This will show us exactly where the admin access is failing

-- 1. Check if you're actually in the admin_users table
SELECT 
  'Step 1: Check admin_users table' as step,
  'Your user ID' as info,
  auth.uid()::text as value
UNION ALL
SELECT 
  'Step 1: Check admin_users table' as step,
  'Total admin users' as info,
  (SELECT count(*)::text FROM public.admin_users) as value
UNION ALL
SELECT 
  'Step 1: Check admin_users table' as step,
  'Your record exists' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as value;

-- 2. Check RLS status and policies
SELECT 
  'Step 2: RLS Status' as step,
  'RLS enabled' as info,
  (SELECT relrowsecurity::text FROM pg_class WHERE relname = 'admin_users') as value
UNION ALL
SELECT 
  'Step 2: RLS Status' as step,
  'Number of policies' as info,
  (SELECT count(*)::text FROM pg_policies WHERE tablename = 'admin_users') as value;

-- 3. Show all policies on admin_users
SELECT 
  'Step 3: Policy Details' as step,
  policyname as info,
  cmd as value
FROM pg_policies 
WHERE tablename = 'admin_users';

-- 4. Test with RLS disabled
SELECT 
  'Step 4: Test without RLS' as step,
  'Can access without RLS' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as value;

-- 5. Test with RLS enabled
SELECT 
  'Step 5: Test with RLS' as step,
  'Can access with RLS' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as value;

-- 6. Check your current role and context
SELECT 
  'Step 6: Current Context' as step,
  'Current role' as info,
  auth.role() as value
UNION ALL
SELECT 
  'Step 6: Current Context' as step,
  'Current user ID' as info,
  auth.uid()::text as value;

-- 7. Test function execution
SELECT 
  'Step 7: Function Test' as step,
  'check_admin_status() result' as info,
  public.check_admin_status()::text as value;

-- 8. Test function with explicit user ID
SELECT 
  'Step 8: Function with explicit ID' as step,
  'check_admin_status(auth.uid()) result' as info,
  public.check_admin_status(auth.uid())::text as value;

-- 9. Show your actual admin record (if accessible)
SELECT 
  'Step 9: Your Admin Record' as step,
  'user_id' as info,
  au.user_id::text as value
FROM public.admin_users au
WHERE au.user_id = auth.uid()
UNION ALL
SELECT 
  'Step 9: Your Admin Record' as step,
  'permissions' as info,
  au.permissions::text as value
FROM public.admin_users au
WHERE au.user_id = auth.uid();

-- 10. Test each condition separately
SELECT 
  'Step 10: Individual Tests' as step,
  'Direct EXISTS query' as info,
  (SELECT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))::text as value
UNION ALL
SELECT 
  'Step 10: Individual Tests' as step,
  'Function result' as info,
  public.check_admin_status()::text as value
UNION ALL
SELECT 
  'Step 10: Individual Tests' as step,
  'Both conditions met' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    AND public.check_admin_status()
    THEN 'YES' 
    ELSE 'NO' 
  END as value;

-- 11. Check if the issue is with the function or the direct query
SELECT 
  'Step 11: Root Cause Analysis' as step,
  'Direct query works' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    THEN 'YES' 
    ELSE 'NO' 
  END as value
UNION ALL
SELECT 
  'Step 11: Root Cause Analysis' as step,
  'Function works' as info,
  CASE 
    WHEN public.check_admin_status()
    THEN 'YES' 
    ELSE 'NO' 
  END as value;