-- Fix Admin Check Function
-- This will create a working admin check function

-- 1. Drop the existing function
DROP FUNCTION IF EXISTS public.check_admin_status(uuid);

-- 2. Create a new function that bypasses RLS issues
CREATE OR REPLACE FUNCTION public.check_admin_status(user_uuid uuid DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Use a direct query that bypasses RLS
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_uuid
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- 3. Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_admin_status(uuid) TO authenticated, service_role;

-- 4. Test the function
SELECT 
  'Function Test' as test,
  public.check_admin_status() as result;

-- 5. Also create a simpler version that doesn't use SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.check_admin_status_simple(user_uuid uuid DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_uuid
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- 6. Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_admin_status_simple(uuid) TO authenticated, service_role;

-- 7. Test both functions
SELECT 
  'SECURITY DEFINER version' as test,
  public.check_admin_status() as result
UNION ALL
SELECT 
  'Simple version' as test,
  public.check_admin_status_simple() as result;

-- 8. Check if RLS is the issue by testing with different contexts
SELECT 
  'Direct query result' as test,
  (SELECT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())) as result
UNION ALL
SELECT 
  'Function result' as test,
  public.check_admin_status() as result;