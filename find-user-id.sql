-- Find Your User ID
-- This will show all users so you can find your user ID

-- 1. Show all users in the database
SELECT 
  'All Users' as info,
  u.id::text as user_id,
  u.email as email,
  u.created_at as created_at
FROM auth.users u
ORDER BY u.created_at DESC;

-- 2. Show users with profiles (these are the ones who have signed up)
SELECT 
  'Users with Profiles' as info,
  p.id::text as user_id,
  p.username as username,
  u.email as email,
  p.created_at as created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;

-- 3. Show recent users (last 10)
SELECT 
  'Recent Users' as info,
  u.id::text as user_id,
  u.email as email,
  u.created_at as created_at
FROM auth.users u
ORDER BY u.created_at DESC
LIMIT 10;

-- 4. Check if you're already in admin_users
SELECT 
  'Current Admin Users' as info,
  au.user_id::text as user_id,
  au.permissions as permissions,
  au.created_at as created_at
FROM public.admin_users au;