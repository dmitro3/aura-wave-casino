-- FINAL REGISTRATION FIX
-- Fix trigger not firing and ambiguous user_id reference

-- Step 1: Complete cleanup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile_manual(UUID, TEXT) CASCADE;

-- Step 2: Create registration function (simplified trigger condition)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  username_text TEXT;
  profile_created BOOLEAN := FALSE;
  stats_created BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '[TRIGGER] 🚀 handle_new_user triggered for user: %', NEW.id;
  
  -- Generate username
  username_text := COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substr(NEW.id::text, 1, 8));
  RAISE NOTICE '[TRIGGER] 👤 Generated username: %', username_text;
  
  -- Create profile record
  BEGIN
    INSERT INTO public.profiles (
      id, username, registration_date, balance, level, xp, total_wagered, total_profit, 
      last_claim_time, badges, created_at, updated_at
    )
    VALUES (
      NEW.id, username_text, NEW.created_at, 0, 1, 0, 0, 0, 
      '1970-01-01T00:00:00Z', ARRAY['welcome'], NEW.created_at, NEW.created_at
    );
    
    profile_created := TRUE;
    RAISE NOTICE '[TRIGGER] ✅ Profile created successfully for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      profile_created := FALSE;
      RAISE NOTICE '[TRIGGER] ❌ FAILED to create profile for user %: % - %', NEW.id, SQLERRM, SQLSTATE;
  END;
  
  -- Create user_level_stats record
  BEGIN
    INSERT INTO public.user_level_stats (
      user_id, current_level, current_level_xp, lifetime_xp, xp_to_next_level, border_tier,
      available_cases, total_cases_opened, coinflip_games, coinflip_wins, coinflip_wagered, coinflip_profit,
      crash_games, crash_wins, crash_wagered, crash_profit, roulette_games, roulette_wins, roulette_wagered, roulette_profit,
      roulette_highest_win, roulette_highest_loss, roulette_green_wins, roulette_red_wins, roulette_black_wins, roulette_favorite_color,
      tower_games, tower_wins, tower_wagered, tower_profit, total_games, total_wins, total_wagered, total_profit,
      biggest_win, biggest_loss, chat_messages_count, login_days_count, biggest_single_bet, account_created,
      current_win_streak, best_win_streak, tower_highest_level, tower_biggest_win, tower_biggest_loss,
      tower_best_streak, tower_current_streak, tower_perfect_games, created_at, updated_at
    )
    VALUES (
      NEW.id, 1, 0, 0, 651, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'none',
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, NEW.created_at, 0, 0, 0, 0, 0, 0, 0, 0, NEW.created_at, NEW.created_at
    );
    
    stats_created := TRUE;
    RAISE NOTICE '[TRIGGER] ✅ User level stats created successfully for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      stats_created := FALSE;
      RAISE NOTICE '[TRIGGER] ❌ FAILED to create user_level_stats for user %: % - %', NEW.id, SQLERRM, SQLSTATE;
  END;
  
  RAISE NOTICE '[TRIGGER] 📊 Final status for user %: Profile=%, Stats=%', NEW.id, profile_created, stats_created;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[TRIGGER] 💥 CRITICAL ERROR in handle_new_user for user %: % - %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$function$;

-- Step 3: Create trigger WITHOUT WHEN condition (to ensure it always fires)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Fix manual function with proper parameter naming
CREATE OR REPLACE FUNCTION public.create_user_profile_manual(target_user_id UUID, target_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  profile_exists BOOLEAN := FALSE;
  stats_exists BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '[MANUAL] 🔧 Manual profile creation requested for user: %', target_user_id;
  
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = target_user_id) INTO profile_exists;
  RAISE NOTICE '[MANUAL] 👤 Profile exists: %', profile_exists;
  
  -- Check if stats already exist  
  SELECT EXISTS(SELECT 1 FROM public.user_level_stats WHERE user_level_stats.user_id = target_user_id) INTO stats_exists;
  RAISE NOTICE '[MANUAL] 📊 Stats exist: %', stats_exists;
  
  -- Create profile if missing
  IF NOT profile_exists THEN
    BEGIN
      INSERT INTO public.profiles (
        id, username, registration_date, balance, level, xp, total_wagered, total_profit, 
        last_claim_time, badges, created_at, updated_at
      )
      VALUES (
        target_user_id, target_username, NOW(), 0, 1, 0, 0, 0, '1970-01-01T00:00:00Z', 
        ARRAY['welcome'], NOW(), NOW()
      );
      RAISE NOTICE '[MANUAL] ✅ Profile created successfully';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '[MANUAL] ❌ Failed to create profile: % - %', SQLERRM, SQLSTATE;
        RETURN FALSE;
    END;
  END IF;
  
  -- Create stats if missing
  IF NOT stats_exists THEN
    BEGIN
      INSERT INTO public.user_level_stats (
        user_id, current_level, current_level_xp, lifetime_xp, xp_to_next_level, border_tier,
        available_cases, total_cases_opened, coinflip_games, coinflip_wins, coinflip_wagered, coinflip_profit,
        crash_games, crash_wins, crash_wagered, crash_profit, roulette_games, roulette_wins, roulette_wagered, roulette_profit,
        roulette_highest_win, roulette_highest_loss, roulette_green_wins, roulette_red_wins, roulette_black_wins, roulette_favorite_color,
        tower_games, tower_wins, tower_wagered, tower_profit, total_games, total_wins, total_wagered, total_profit,
        biggest_win, biggest_loss, chat_messages_count, login_days_count, biggest_single_bet, account_created,
        current_win_streak, best_win_streak, tower_highest_level, tower_biggest_win, tower_biggest_loss,
        tower_best_streak, tower_current_streak, tower_perfect_games, created_at, updated_at
      )
      VALUES (
        target_user_id, 1, 0, 0, 651, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'none',
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, NOW(), 0, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW()
      );
      RAISE NOTICE '[MANUAL] ✅ Stats created successfully';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '[MANUAL] ❌ Failed to create stats: % - %', SQLERRM, SQLSTATE;
        RETURN FALSE;
    END;
  END IF;
  
  RAISE NOTICE '[MANUAL] 🎯 Manual creation completed successfully';
  RETURN TRUE;
END;
$function$;

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile_manual(UUID, TEXT) TO anon, authenticated, service_role;

-- Step 6: Enable logging to see trigger activity
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Step 7: Verification with mandatory success
DO $$
DECLARE
  trigger_count INTEGER := 0;
  function_count INTEGER := 0;
  manual_function_count INTEGER := 0;
BEGIN
  -- Count triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger 
  WHERE tgname = 'on_auth_user_created';
  
  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc 
  WHERE proname = 'handle_new_user';
  
  SELECT COUNT(*) INTO manual_function_count
  FROM pg_proc 
  WHERE proname = 'create_user_profile_manual';
  
  RAISE NOTICE '🔧 FINAL REGISTRATION FIX COMPLETED';
  RAISE NOTICE '📊 Triggers created: %', trigger_count;
  RAISE NOTICE '📊 handle_new_user functions: %', function_count;  
  RAISE NOTICE '📊 Manual creation functions: %', manual_function_count;
  
  -- Mandatory verification
  IF trigger_count = 0 THEN
    RAISE EXCEPTION 'FATAL: Trigger was not created!';
  END IF;
  
  IF function_count = 0 THEN
    RAISE EXCEPTION 'FATAL: handle_new_user function was not created!';
  END IF;
  
  IF manual_function_count = 0 THEN
    RAISE EXCEPTION 'FATAL: Manual function was not created!';
  END IF;
  
  RAISE NOTICE '✅ ALL COMPONENTS VERIFIED SUCCESSFULLY';
  RAISE NOTICE '🚀 Trigger REMOVED WHEN condition - will fire on ALL inserts';
  RAISE NOTICE '🔧 Manual function FIXED ambiguous user_id reference';
  RAISE NOTICE '📝 Database logging ENABLED to see trigger activity';
END $$;