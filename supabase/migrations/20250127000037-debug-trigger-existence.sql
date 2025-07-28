-- Debug trigger existence and functionality
-- This will help us understand if the trigger is even being created

-- Check if trigger exists
SELECT 
  'Trigger check:' as info,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if function exists
SELECT 
  'Function check:' as info,
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Check foreign key constraints
SELECT 
  'Foreign key check:' as info,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  tc.deferrable,
  tc.initially_deferred
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'user_level_stats' OR tc.table_name = 'profiles')
  AND (kcu.column_name = 'user_id' OR kcu.column_name = 'id');

-- Check current user count
SELECT 
  'Current data:' as info,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.user_level_stats) as total_user_stats;

-- Test the function manually with a mock user
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_created_at TIMESTAMP WITH TIME ZONE := now();
  test_result BOOLEAN;
BEGIN
  RAISE NOTICE 'Testing handle_new_user function manually...';
  
  -- Test the function directly
  BEGIN
    -- Create a mock NEW record
    PERFORM public.handle_new_user() FROM (
      SELECT 
        test_user_id as id,
        'test@example.com' as email,
        test_created_at as created_at,
        jsonb_build_object('username', 'TestUser') as raw_user_meta_data
    ) AS mock_new;
    
    test_result := TRUE;
    RAISE NOTICE '✅ Function executed without error';
  EXCEPTION
    WHEN OTHERS THEN
      test_result := FALSE;
      RAISE NOTICE '❌ Function failed: %', SQLERRM;
  END;
  
  -- Check if profile was created
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
    RAISE NOTICE '✅ Profile created successfully';
  ELSE
    RAISE NOTICE '❌ Profile was NOT created';
  END IF;
  
  -- Check if stats were created
  IF EXISTS (SELECT 1 FROM public.user_level_stats WHERE user_id = test_user_id) THEN
    RAISE NOTICE '✅ Stats created successfully';
  ELSE
    RAISE NOTICE '❌ Stats were NOT created';
  END IF;
  
  -- Clean up test data
  DELETE FROM public.profiles WHERE id = test_user_id;
  DELETE FROM public.user_level_stats WHERE user_id = test_user_id;
  
  RAISE NOTICE 'Test completed';
END $$;