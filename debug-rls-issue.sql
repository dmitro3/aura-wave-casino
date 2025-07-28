-- Debug RLS and Function Issues
-- This will help identify why admin check fails even when user is in admin_users table

-- 1. Check if you can see yourself in admin_users table
SELECT 
  'Step 1: Direct Table Access' as step,
  'Can see yourself in admin_users' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as value;

-- 2. Check RLS status
SELECT 
  'Step 2: RLS Status' as step,
  'admin_users has RLS enabled' as info,
  (SELECT relrowsecurity::text FROM pg_class WHERE relname = 'admin_users') as value;

-- 3. Check RLS policies
SELECT 
  'Step 3: RLS Policies' as step,
  'Number of policies' as info,
  (SELECT count(*)::text FROM pg_policies WHERE tablename = 'admin_users') as value;

-- 4. Show all policies on admin_users
SELECT 
  'Step 4: Policy Details' as step,
  policyname as info,
  cmd as value
FROM pg_policies 
WHERE tablename = 'admin_users';

-- 5. Test function with explicit user ID
SELECT 
  'Step 5: Function Test' as step,
  'check_admin_status with explicit ID' as info,
  public.check_admin_status(auth.uid())::text as value;

-- 6. Test function without parameters (uses default)
SELECT 
  'Step 6: Function Test' as step,
  'check_admin_status with default' as info,
  public.check_admin_status()::text as value;

-- 7. Check function definition
SELECT 
  'Step 7: Function Definition' as step,
  'check_admin_status is SECURITY DEFINER' as info,
  (SELECT prosecdef::text FROM pg_proc WHERE proname = 'check_admin_status') as value;

-- 8. Test direct query inside function logic
SELECT 
  'Step 8: Direct Query Test' as step,
  'Direct EXISTS query' as info,
  (SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  ))::text as value;

-- 9. Check your current role and context
SELECT 
  'Step 9: Current Context' as step,
  'Current role' as info,
  auth.role() as value
UNION ALL
SELECT 
  'Step 9: Current Context' as step,
  'Current user ID' as info,
  auth.uid()::text as value;

-- 10. Test with service role context
-- This simulates what the function should see
SELECT 
  'Step 10: Service Role Test' as step,
  'Would work with service role' as info,
  CASE 
    WHEN auth.role() = 'service_role' 
    THEN 'Already service role'
    ELSE 'Not service role - this might be the issue'
  END as value;

-- 11. Show your actual admin record
SELECT 
  'Step 11: Your Admin Record' as step,
  'user_id' as info,
  au.user_id::text as value
FROM public.admin_users au
WHERE au.user_id = auth.uid()
UNION ALL
SELECT 
  'Step 11: Your Admin Record' as step,
  'permissions' as info,
  au.permissions::text as value
FROM public.admin_users au
WHERE au.user_id = auth.uid();

-- 12. Test bypassing RLS temporarily
SELECT 
  'Step 12: Bypass RLS Test' as step,
  'Can access with RLS disabled' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as value;