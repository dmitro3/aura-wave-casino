-- Robust user registration with comprehensive error handling
-- This ensures both profiles and user_level_stats are created properly

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Create a more robust handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  username_text TEXT;
BEGIN
  -- Generate username
  username_text := COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substr(NEW.id::text, 1, 8));
  
  -- Insert into profiles with error handling
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
      badges
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
      ARRAY['welcome']
    );
    
    RAISE NOTICE '✅ Profile created for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Error creating profile for user %: %', NEW.id, SQLERRM;
      RAISE;
  END;
  
  -- Insert into user_level_stats with error handling
  BEGIN
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
      crash_games,
      crash_wins,
      crash_losses,
      crash_profit,
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
    
    RAISE NOTICE '✅ User level stats created for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Error creating user_level_stats for user %: %', NEW.id, SQLERRM;
      RAISE;
  END;
  
  -- Verify both records were created
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'Profile was not created for user: %', NEW.id;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.user_level_stats WHERE user_id = NEW.id) THEN
    RAISE EXCEPTION 'User level stats were not created for user: %', NEW.id;
  END IF;
  
  RAISE NOTICE '✅ User registration completed successfully for user: %', NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Fatal error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$function$;

-- Step 3: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Show final setup
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

-- Step 5: Show current user data (if any)
SELECT 
  'Current user data:' as info,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.user_level_stats) as total_user_stats;