-- Fix Authentication Issue
-- The problem is that auth.uid() is returning null, meaning you're not authenticated

-- 1. Check your current authentication status
SELECT 
  'Step 1: Auth Status' as step,
  'auth.uid() result' as info,
  CASE 
    WHEN auth.uid() IS NULL THEN 'NULL - Not authenticated'
    ELSE auth.uid()::text
  END as value
UNION ALL
SELECT 
  'Step 1: Auth Status' as step,
  'auth.role() result' as info,
  CASE 
    WHEN auth.role() IS NULL THEN 'NULL - Not authenticated'
    ELSE auth.role()
  END as value;

-- 2. Find your user ID manually
SELECT 
  'Step 2: Find Your User' as step,
  'Your email' as info,
  u.email as value
FROM auth.users u
WHERE u.email = 'your-email@example.com'  -- Replace with your actual email
UNION ALL
SELECT 
  'Step 2: Find Your User' as step,
  'Your user ID' as info,
  u.id::text as value
FROM auth.users u
WHERE u.email = 'your-email@example.com';  -- Replace with your actual email

-- 3. Add yourself as admin using your actual user ID
-- Replace 'YOUR_ACTUAL_USER_ID' with the ID from step 2
-- INSERT INTO public.admin_users (user_id, permissions) 
-- VALUES ('YOUR_ACTUAL_USER_ID', ARRAY['maintenance_control', 'user_management', 'analytics', 'crash_control'])
-- ON CONFLICT (user_id) DO UPDATE SET 
--   permissions = EXCLUDED.permissions,
--   created_at = EXCLUDED.created_at;

-- 4. Alternative: Add yourself by email
-- This will find your user ID by email and add you as admin
-- INSERT INTO public.admin_users (user_id, permissions) 
-- SELECT 
--   u.id,
--   ARRAY['maintenance_control', 'user_management', 'analytics', 'crash_control']
-- FROM auth.users u
-- WHERE u.email = 'your-email@example.com'  -- Replace with your actual email
-- ON CONFLICT (user_id) DO UPDATE SET 
--   permissions = EXCLUDED.permissions,
--   created_at = EXCLUDED.created_at;

-- 5. Test if you're now an admin (using your actual user ID)
-- Replace 'YOUR_ACTUAL_USER_ID' with the ID from step 2
-- SELECT 
--   'Step 5: Test Admin Status' as step,
--   'Are you an admin?' as info,
--   CASE 
--     WHEN EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = 'YOUR_ACTUAL_USER_ID') 
--     THEN 'YES' 
--     ELSE 'NO' 
--   END as value;

-- 6. Show all admin users
SELECT 
  'Step 6: All Admin Users' as step,
  'user_id' as info,
  au.user_id::text as value
FROM public.admin_users au
UNION ALL
SELECT 
  'Step 6: All Admin Users' as step,
  'permissions' as info,
  au.permissions::text as value
FROM public.admin_users au;