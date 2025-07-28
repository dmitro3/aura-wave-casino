-- Fix trigger debugging and ensure user registration works
-- This adds extensive logging to see exactly what's happening

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create a debugged handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  username_text TEXT;
  profile_insert_result BOOLEAN;
  stats_insert_result BOOLEAN;
BEGIN
  -- Log the function call
  RAISE NOTICE 'handle_new_user called for user: %', NEW.id;
  RAISE NOTICE 'User email: %', NEW.email;
  RAISE NOTICE 'User metadata: %', NEW.raw_user_meta_data;
  
  -- Generate username
  username_text := COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substr(NEW.id::text, 1, 8));
  RAISE NOTICE 'Generated username: %', username_text;
  
  -- Insert into profiles
  BEGIN
    INSERT INTO public.profiles (
      id, 
      username, 
      registration_date, 
      balance, 
      level, 
      xp, 
      total_wagered, 
      total_profit, 
      last_claim_time, 
      badges,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      username_text,
      NEW.created_at,
      0,
      1,
      0,
      0,
      0,
      '1970-01-01T00:00:00Z',
      ARRAY['welcome'],
      NEW.created_at,
      NEW.created_at
    );
    profile_insert_result := TRUE;
    RAISE NOTICE 'Profile insert successful for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      profile_insert_result := FALSE;
      RAISE NOTICE 'Profile insert failed for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Insert into user_level_stats
  BEGIN
    INSERT INTO public.user_level_stats (
      user_id,
      current_level,
      current_level_xp,
      lifetime_xp,
      xp_to_next_level,
      border_tier,
      available_cases,
      total_cases_opened,
      coinflip_games,
      coinflip_wins,
      coinflip_wagered,
      coinflip_profit,
      crash_games,
      crash_wins,
      crash_wagered,
      crash_profit,
      roulette_games,
      roulette_wins,
      roulette_wagered,
      roulette_profit,
      roulette_highest_win,
      roulette_highest_loss,
      roulette_green_wins,
      roulette_red_wins,
      roulette_black_wins,
      roulette_favorite_color,
      tower_games,
      tower_wins,
      tower_wagered,
      tower_profit,
      total_games,
      total_wins,
      total_wagered,
      total_profit,
      biggest_win,
      biggest_loss,
      chat_messages_count,
      login_days_count,
      biggest_single_bet,
      account_created,
      current_win_streak,
      best_win_streak,
      tower_highest_level,
      tower_biggest_win,
      tower_biggest_loss,
      tower_best_streak,
      tower_current_streak,
      tower_perfect_games,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      1,
      0,
      0,
      100,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      'red',
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      NEW.created_at,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      NEW.created_at,
      NEW.created_at
    );
    stats_insert_result := TRUE;
    RAISE NOTICE 'Stats insert successful for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      stats_insert_result := FALSE;
      RAISE NOTICE 'Stats insert failed for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Log final result
  RAISE NOTICE 'handle_new_user completed for user %: profile=%s, stats=%s', 
    NEW.id, 
    CASE WHEN profile_insert_result THEN 'SUCCESS' ELSE 'FAILED' END,
    CASE WHEN stats_insert_result THEN 'SUCCESS' ELSE 'FAILED' END;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Critical error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Test the function manually
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_created_at TIMESTAMP WITH TIME ZONE := now();
BEGIN
  RAISE NOTICE 'Testing handle_new_user function...';
  
  -- Create a test user
  INSERT INTO auth.users (
    id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    created_at, 
    updated_at, 
    raw_user_meta_data
  )
  VALUES (
    test_user_id,
    'test@example.com',
    'dummy_password',
    test_created_at,
    test_created_at,
    test_created_at,
    jsonb_build_object('username', 'TestUser')
  );
  
  RAISE NOTICE 'Test user created with ID: %', test_user_id;
  
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
  DELETE FROM auth.users WHERE id = test_user_id;
  RAISE NOTICE 'Test completed and cleaned up';
END $$;

-- Step 5: Show verification
SELECT 
  'Trigger verification:' as info,
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

SELECT 
  'Function verification:' as info,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';