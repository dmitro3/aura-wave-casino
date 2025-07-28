-- Simple Diagnostic: Find the Exact Issue
-- This will help us understand what's preventing admin access

-- 1. Check if you can access the admin_users table at all
SELECT 
  'Test 1: Can access admin_users table' as test,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users LIMIT 1) 
    THEN 'YES' 
    ELSE 'NO' 
  END as result;

-- 2. Check if you're in the admin_users table
SELECT 
  'Test 2: Are you in admin_users table' as test,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as result;

-- 3. Check your current user ID
SELECT 
  'Test 3: Your user ID' as test,
  auth.uid()::text as result;

-- 4. Check your current role
SELECT 
  'Test 4: Your current role' as test,
  auth.role() as result;

-- 5. Try to add yourself to admin_users table
INSERT INTO public.admin_users (user_id, permissions) 
VALUES (auth.uid(), ARRAY['maintenance_control', 'user_management', 'analytics', 'crash_control'])
ON CONFLICT (user_id) DO UPDATE SET 
  permissions = EXCLUDED.permissions,
  created_at = EXCLUDED.created_at;

-- 6. Check if you're now in the table
SELECT 
  'Test 6: Are you now in admin_users table' as test,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as result;

-- 7. Test the admin check function
SELECT 
  'Test 7: Admin check function result' as test,
  public.check_admin_status()::text as result;

-- 8. Test direct query
SELECT 
  'Test 8: Direct query result' as test,
  (SELECT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))::text as result;

-- 9. Show your admin record
SELECT 
  'Test 9: Your admin record' as test,
  au.user_id::text as result
FROM public.admin_users au
WHERE au.user_id = auth.uid()
UNION ALL
SELECT 
  'Test 9: Your permissions' as test,
  au.permissions::text as result
FROM public.admin_users au
WHERE au.user_id = auth.uid();