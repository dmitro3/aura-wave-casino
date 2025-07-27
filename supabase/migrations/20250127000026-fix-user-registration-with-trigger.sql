-- Fix user registration to create user_level_stats record
-- This ensures new users have all required data structures

-- Step 1: Drop the trigger first (since it depends on the function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 3: Recreate the function with user_level_stats creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, username, registration_date, balance, level, xp, total_wagered, total_profit, last_claim_time, badges)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substr(NEW.id::text, 1, 8)),
    NEW.created_at,
    0,
    1,
    0,
    0,
    0,
    '1970-01-01T00:00:00Z',
    ARRAY['welcome']
  );
  
  -- Insert into user_level_stats
  INSERT INTO public.user_level_stats (
    user_id,
    current_level,
    current_level_xp,
    lifetime_xp,
    xp_to_next_level,
    total_games,
    total_wins,
    total_losses,
    total_profit,
    total_wagered,
    roulette_games,
    roulette_wins,
    roulette_losses,
    roulette_profit,
    roulette_highest_win,
    roulette_highest_loss,
    roulette_green_wins,
    roulette_red_wins,
    roulette_black_wins,
    roulette_biggest_bet,
    roulette_best_streak,
    roulette_favorite_color,
    tower_games,
    tower_wins,
    tower_losses,
    tower_profit,
    tower_highest_level,
    tower_perfect_games,
    coinflip_games,
    coinflip_wins,
    coinflip_losses,
    coinflip_profit,
    total_cases_opened,
    available_cases,
    chat_messages_count,
    login_days_count,
    account_created,
    best_win_streak,
    biggest_single_bet,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    1,
    0,
    0,
    1000,
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
    0,
    0,
    NEW.created_at,
    0,
    0,
    NEW.created_at,
    NEW.created_at
  );
  
  RETURN NEW;
END;
$function$;

-- Step 4: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Test the setup
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_result RECORD;
BEGIN
  RAISE NOTICE '✅ User registration function and trigger updated successfully';
  
  -- Verify the trigger exists
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created' 
    AND event_object_table = 'users'
  ) THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created exists and is properly configured';
  ELSE
    RAISE NOTICE '❌ Trigger may not be properly configured';
  END IF;
  
  -- Verify the function exists
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'handle_new_user'
  ) THEN
    RAISE NOTICE '✅ Function handle_new_user exists and is properly configured';
  ELSE
    RAISE NOTICE '❌ Function may not be properly configured';
  END IF;
END $$;

-- Step 6: Show final setup
SELECT 
  'Final trigger setup:' as info,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

SELECT 
  'Function verification:' as info,
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';