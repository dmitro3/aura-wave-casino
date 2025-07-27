-- Fix user_level_stats foreign key constraint
-- The user_id should reference auth.users(id), not public.profiles(id)

-- Step 1: Drop the incorrect foreign key constraint
ALTER TABLE public.user_level_stats 
DROP CONSTRAINT IF EXISTS user_level_stats_user_id_fkey;

-- Step 2: Add the correct foreign key constraint
ALTER TABLE public.user_level_stats 
ADD CONSTRAINT user_level_stats_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Verify the fix
SELECT 
  'Foreign key verification:' as info,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'user_level_stats'
  AND kcu.column_name = 'user_id';

-- Step 4: Test the handle_new_user function
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_username TEXT := 'TestUser_' || substr(test_user_id::text, 1, 8);
  test_created_at TIMESTAMP WITH TIME ZONE := now();
BEGIN
  RAISE NOTICE '🧪 Testing user registration with fixed foreign key...';
  
  -- Create a mock auth.users record
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  VALUES (
    test_user_id,
    'test@example.com',
    'dummy_password',
    now(),
    test_created_at,
    test_created_at,
    jsonb_build_object('username', test_username)
  );
  
  RAISE NOTICE '✅ Test user created in auth.users';
  
  -- Clean up test data
  DELETE FROM auth.users WHERE id = test_user_id;
  
  RAISE NOTICE '🧹 Test data cleaned up';
  RAISE NOTICE '✅ Foreign key constraint fixed successfully';
END $$;

-- Step 5: Show current user data
SELECT 
  'Current user data:' as info,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.user_level_stats) as total_user_stats;