-- Add Admin User Script
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users table

-- First, let's see all users to find your ID
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- To add yourself as admin, run this (replace YOUR_USER_ID with your actual user ID):
-- INSERT INTO public.admin_users (user_id, permissions) 
-- VALUES ('YOUR_USER_ID', ARRAY['maintenance_control', 'user_management', 'analytics']);

-- Example (uncomment and modify):
-- INSERT INTO public.admin_users (user_id, permissions) 
-- VALUES ('123e4567-e89b-12d3-a456-426614174000', ARRAY['maintenance_control', 'user_management', 'analytics']);

-- To check if you're already an admin:
-- SELECT * FROM public.admin_users WHERE user_id = 'YOUR_USER_ID';

-- To remove admin access:
-- DELETE FROM public.admin_users WHERE user_id = 'YOUR_USER_ID';