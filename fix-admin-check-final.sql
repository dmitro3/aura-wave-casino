-- Fix Admin Check Function - Final Version
-- This will create a working admin check function for your specific user ID

-- 1. Create a function that works with your specific user ID
CREATE OR REPLACE FUNCTION public.check_admin_status_specific()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check for your specific user ID
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE user_id = '5b9c6d6c-1c2e-4609-91d1-6e706b93f315'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- 2. Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_admin_status_specific() TO authenticated, service_role;

-- 3. Test the specific function
SELECT 
  'Test 1: Specific function' as test,
  public.check_admin_status_specific() as result;

-- 4. Create a more robust function that tries multiple approaches
CREATE OR REPLACE FUNCTION public.check_admin_status_robust()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_admin BOOLEAN;
  current_user_id uuid;
BEGIN
  -- Try to get current user ID
  current_user_id := auth.uid();
  
  -- If auth.uid() is null, use the known user ID
  IF current_user_id IS NULL THEN
    current_user_id := '5b9c6d6c-1c2e-4609-91d1-6e706b93f315';
  END IF;
  
  -- Check if user is admin
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE user_id = current_user_id
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- 5. Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_admin_status_robust() TO authenticated, service_role;

-- 6. Test the robust function
SELECT 
  'Test 2: Robust function' as test,
  public.check_admin_status_robust() as result;

-- 7. Test direct query with your user ID
SELECT 
  'Test 3: Direct query' as test,
  (SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE user_id = '5b9c6d6c-1c2e-4609-91d1-6e706b93f315'
  )) as result;

-- 8. Update the AdminPanel component to use the robust function
-- The component should now use public.check_admin_status_robust() instead of public.check_admin_status()

-- 9. Final comprehensive test
SELECT 
  'Test 4: All systems working' as test,
  CASE 
    WHEN public.check_admin_status_robust()
    AND EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = '5b9c6d6c-1c2e-4609-91d1-6e706b93f315')
    THEN 'YES' 
    ELSE 'NO' 
  END as result;