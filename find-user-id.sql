-- Find Your Correct User ID
-- Run this to get your proper UUID

-- Show all users with their IDs
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC;

-- If you know your email, you can filter by it:
-- SELECT 
--   id,
--   email,
--   created_at
-- FROM auth.users 
-- WHERE email = 'your-email@example.com';

-- Example of a valid UUID format:
-- 123e4567-e89b-12d3-a456-426614174000