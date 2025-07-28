-- Check if the trigger and function exist and are working properly
SELECT 
  'Current triggers' as info,
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if the function exists
SELECT 
  'Function exists' as info,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Test if we can create a profile manually
DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
  test_username text := 'TestUser' || substr(test_user_id::text, 1, 8);
BEGIN
  RAISE NOTICE 'Testing profile creation with user ID: %', test_user_id;
  
  -- Try to create a profile manually to test the logic
  INSERT INTO public.profiles (
    id,
    username,
    balance,
    total_wagered,
    total_profit,
    created_at,
    updated_at
  ) VALUES (
    test_user_id,
    test_username,
    1000,
    0,
    0,
    now(),
    now()
  );
  
  -- Try to create user_level_stats
  INSERT INTO public.user_level_stats (
    user_id,
    current_level,
    current_level_xp,
    lifetime_xp,
    xp_to_next_level,
    created_at,
    updated_at
  ) VALUES (
    test_user_id,
    1,
    0,
    0,
    1000,
    now(),
    now()
  );
  
  RAISE NOTICE 'Manual profile creation successful!';
  
  -- Clean up test data
  DELETE FROM public.user_level_stats WHERE user_id = test_user_id;
  DELETE FROM public.profiles WHERE id = test_user_id;
  
  RAISE NOTICE 'Test cleanup completed';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test error: %', SQLERRM;
  -- Try cleanup even if there was an error
  BEGIN
    DELETE FROM public.user_level_stats WHERE user_id = test_user_id;
    DELETE FROM public.profiles WHERE id = test_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Cleanup error: %', SQLERRM;
  END;
END $$;

-- Recreate the trigger with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  username_val text;
  profile_created boolean := false;
  stats_created boolean := false;
BEGIN
  RAISE NOTICE 'Trigger fired for new user: %', NEW.id;
  
  -- Generate a unique username
  username_val := 'User' || substr(NEW.id::text, 1, 8);
  
  -- Create profile first
  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      balance,
      total_wagered,
      total_profit,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      username_val,
      1000, -- Starting balance
      0,
      0,
      now(),
      now()
    );
    profile_created := true;
    RAISE NOTICE 'Profile created for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW; -- Don't block user creation
  END;
  
  -- Create user_level_stats after profile is created
  IF profile_created THEN
    BEGIN
      INSERT INTO public.user_level_stats (
        user_id,
        current_level,
        current_level_xp,
        lifetime_xp,
        xp_to_next_level,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        1, -- Starting level
        0, -- Current level XP
        0, -- Lifetime XP
        1000, -- XP to next level
        now(),
        now()
      );
      stats_created := true;
      RAISE NOTICE 'User level stats created for user: %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create user_level_stats for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RAISE NOTICE 'User setup completed. Profile: %, Stats: %', profile_created, stats_created;
  RETURN NEW;
END;
$$;

-- Create the trigger to handle new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify the trigger was created
SELECT 
  'Trigger verification' as info,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

SELECT 'Setup completed successfully' as status;