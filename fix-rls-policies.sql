-- Fix RLS Policies for Admin Access
-- This will fix the RLS policies that are blocking admin access

-- 1. First, let's see what policies currently exist
SELECT 
  'Current Policies' as step,
  policyname as info,
  cmd as value
FROM pg_policies 
WHERE tablename = 'admin_users';

-- 2. Drop all existing policies on admin_users
DROP POLICY IF EXISTS "Authenticated users can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Service role can manage admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Anyone can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow all authenticated users to view admin_users" ON public.admin_users;

-- 3. Temporarily disable RLS to test
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- 4. Test if you can see your admin record now
SELECT 
  'Step 4: Test without RLS' as step,
  'Can see admin record' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as value;

-- 5. Show your admin record
SELECT 
  'Step 5: Your Admin Record' as step,
  'user_id' as info,
  au.user_id::text as value
FROM public.admin_users au
WHERE au.user_id = auth.uid()
UNION ALL
SELECT 
  'Step 5: Your Admin Record' as step,
  'permissions' as info,
  au.permissions::text as value
FROM public.admin_users au
WHERE au.user_id = auth.uid();

-- 6. Re-enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 7. Create a simple policy that allows all authenticated users to view
CREATE POLICY "Allow authenticated users to view admin_users" 
ON public.admin_users 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 8. Create a policy for service role to manage
CREATE POLICY "Allow service role to manage admin_users" 
ON public.admin_users 
FOR ALL 
USING (auth.role() = 'service_role');

-- 9. Test the new policies
SELECT 
  'Step 9: Test with new policies' as step,
  'Can see admin record' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as value;

-- 10. Test the function again
SELECT 
  'Step 10: Function test' as step,
  'check_admin_status result' as info,
  public.check_admin_status()::text as value;

-- 11. Test direct query
SELECT 
  'Step 11: Direct query test' as step,
  'Direct EXISTS query' as info,
  (SELECT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))::text as value;

-- 12. Final comprehensive test
SELECT 
  'Step 12: Final Test' as step,
  'All systems working' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    AND public.check_admin_status()
    THEN 'YES' 
    ELSE 'NO' 
  END as value;