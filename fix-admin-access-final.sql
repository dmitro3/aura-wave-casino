-- Final Admin Access Fix
-- This script works with your actual database schema

-- 1. First, let's check current admin users
SELECT * FROM public.admin_users;

-- 2. Enable RLS on admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own admin status" ON public.admin_users;
DROP POLICY IF EXISTS "Service role can manage admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Anyone can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Authenticated users can view admin users" ON public.admin_users;

-- 4. Create proper RLS policies for admin_users
CREATE POLICY "Authenticated users can view admin users" 
ON public.admin_users 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage admin users" 
ON public.admin_users 
FOR ALL 
USING (auth.role() = 'service_role');

-- 5. Grant necessary permissions
GRANT ALL ON public.admin_users TO authenticated, service_role;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- 6. Add yourself as admin (replace YOUR_USER_ID with your actual user ID)
-- First, find your user ID:
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Then add yourself (uncomment and replace YOUR_USER_ID):
-- INSERT INTO public.admin_users (user_id, permissions) 
-- VALUES ('YOUR_USER_ID', ARRAY['maintenance_control', 'user_management', 'analytics', 'crash_control'])
-- ON CONFLICT (user_id) DO UPDATE SET 
--   permissions = EXCLUDED.permissions,
--   created_at = EXCLUDED.created_at;

-- 7. Test admin access
-- This should return your admin status if you're added:
SELECT 
  au.user_id,
  au.permissions,
  au.created_at,
  p.username
FROM public.admin_users au
JOIN public.profiles p ON au.user_id = p.id
WHERE au.user_id = auth.uid();

-- 8. Fix maintenance settings permissions
GRANT ALL ON public.maintenance_settings TO authenticated, service_role;

-- 9. Create a robust admin check function that works with your schema
CREATE OR REPLACE FUNCTION public.check_admin_status(user_uuid uuid DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- 10. Create a function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_admin_permission(permission_name text, user_uuid uuid DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_permissions text[];
BEGIN
  SELECT permissions INTO user_permissions
  FROM public.admin_users 
  WHERE user_id = user_uuid;
  
  RETURN permission_name = ANY(user_permissions);
END;
$$;

-- 11. Test the functions
SELECT public.check_admin_status();
SELECT public.has_admin_permission('maintenance_control');

-- 12. Ensure maintenance functions exist and work
-- Check if maintenance functions exist
SELECT 
  proname,
  prosecdef
FROM pg_proc 
WHERE proname IN ('toggle_maintenance_mode', 'get_maintenance_status');

-- 13. Test maintenance status
SELECT public.get_maintenance_status();

-- 14. If maintenance functions don't exist, create them
-- (This should already be done from your maintenance-mode-setup.sql)
-- But let's verify the maintenance_settings table has data
INSERT INTO public.maintenance_settings (is_maintenance_mode, maintenance_message, maintenance_title)
VALUES (false, 'Website is currently under maintenance. Please check back soon.', 'Under Maintenance')
ON CONFLICT DO NOTHING;

-- 15. Final test - check everything works
SELECT 
  'Admin Check' as test,
  public.check_admin_status() as result
UNION ALL
SELECT 
  'Maintenance Control Permission' as test,
  public.has_admin_permission('maintenance_control') as result
UNION ALL
SELECT 
  'Maintenance Status' as test,
  (public.get_maintenance_status() ->> 'is_maintenance_mode')::boolean as result;