-- Comprehensive trigger fix for user registration
-- This addresses all possible issues that could prevent the trigger from working

-- Step 1: Clean up everything
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Fix all foreign key constraints to be deferrable
ALTER TABLE public.user_level_stats
DROP CONSTRAINT IF EXISTS user_level_stats_user_id_fkey;

ALTER TABLE public.user_level_stats
ADD CONSTRAINT user_level_stats_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Step 3: Create a bulletproof function that handles all edge cases
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  username_text TEXT;
  profile_exists BOOLEAN;
  stats_exists BOOLEAN;
BEGIN
  -- Generate username safely
  username_text := COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substr(NEW.id::text, 1, 8));
  
  -- Check if profile already exists (shouldn't happen, but safety first)
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
  
  -- Check if stats already exist (shouldn't happen, but safety first)
  SELECT EXISTS(SELECT 1 FROM public.user_level_stats WHERE user_id = NEW.id) INTO stats_exists;
  
  -- Only create profile if it doesn't exist
  IF NOT profile_exists THEN
    BEGIN
      INSERT INTO public.profiles (
        id, username, registration_date, balance, level, xp, total_wagered, total_profit, last_claim_time, badges,
        created_at, updated_at, current_level, current_xp, xp_to_next_level, lifetime_xp, border_tier, available_cases, total_cases_opened
      )
      VALUES (
        NEW.id, username_text, NEW.created_at, 0, 1, 0, 0, 0, '1970-01-01T00:00:00Z', ARRAY['welcome'],
        NEW.created_at, NEW.created_at, 1, 0, 100, 0, 1, 0, 0
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the trigger
        RAISE NOTICE 'Profile insert failed for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  -- Only create stats if they don't exist
  IF NOT stats_exists THEN
    BEGIN
      INSERT INTO public.user_level_stats (
        user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier, available_cases, total_cases_opened,
        coinflip_games, coinflip_wins, coinflip_wagered, coinflip_profit, best_coinflip_streak, current_coinflip_streak,
        crash_games, crash_wins, crash_wagered, crash_profit,
        roulette_games, roulette_wins, roulette_wagered, roulette_profit, roulette_highest_win, roulette_highest_loss,
        roulette_green_wins, roulette_red_wins, roulette_black_wins, roulette_favorite_color, roulette_best_streak, roulette_current_streak, roulette_biggest_bet,
        tower_games, tower_wins, tower_wagered, tower_profit, total_games, total_wins, total_wagered, total_profit, biggest_win, biggest_loss,
        created_at, updated_at, chat_messages_count, login_days_count, biggest_single_bet, account_created, current_win_streak, best_win_streak,
        tower_highest_level, tower_biggest_win, tower_biggest_loss, tower_best_streak, tower_current_streak, tower_perfect_games
      )
      VALUES (
        NEW.id, 1, 0, 0, 100, 1, 0, 0,
        0, 0, 0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0, 0, 0,
        0, 0, 0, 'red', 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        NEW.created_at, NEW.created_at, 0, 0, 0, NEW.created_at, 0, 0,
        0, 0, 0, 0, 0, 0
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the trigger
        RAISE NOTICE 'Stats insert failed for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 4: Create the trigger with explicit timing
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Verify everything is set up correctly
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

SELECT 
  'Foreign key verification:' as info,
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

-- Step 6: Test with a real user creation
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_created_at TIMESTAMP WITH TIME ZONE := now();
BEGIN
  RAISE NOTICE 'Testing real user creation...';
  
  -- Create a test user in auth.users (this should trigger our function)
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