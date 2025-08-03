-- UNAMBIGUOUS REGISTRATION FIX
-- Based on the actual database schema provided

-- Step 1: Complete cleanup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile_manual(UUID, TEXT) CASCADE;

-- Step 2: Create trigger function with no ambiguity
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  target_username TEXT;
BEGIN
  RAISE NOTICE '[TRIGGER] 🚀 Registration triggered for: %', NEW.id;
  
  -- Generate username
  target_username := COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substr(NEW.id::text, 1, 8));
  RAISE NOTICE '[TRIGGER] 👤 Username: %', target_username;
  
  -- Create profiles record (id references auth.users.id)
  BEGIN
    INSERT INTO public.profiles (
      id, username, registration_date, balance, 
      last_claim_time, badges, created_at, updated_at
    )
    VALUES (
      NEW.id, target_username, NEW.created_at, 0, 
      '1970-01-01T00:00:00Z', ARRAY['welcome'], NEW.created_at, NEW.created_at
    );
    RAISE NOTICE '[TRIGGER] ✅ Profile created';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '[TRIGGER] ❌ Profile failed: %', SQLERRM;
  END;
  
  -- Create user_level_stats record (user_id references auth.users.id)
  BEGIN
    INSERT INTO public.user_level_stats (
      user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier,
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
    RAISE NOTICE '[TRIGGER] ✅ Stats created';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '[TRIGGER] ❌ Stats failed: %', SQLERRM;
  END;
  
  RAISE NOTICE '[TRIGGER] 📊 Registration complete for: %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[TRIGGER] 💥 CRITICAL ERROR: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- Step 3: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Create manual function with completely different parameter names
CREATE OR REPLACE FUNCTION public.create_user_profile_manual(user_id UUID, username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  target_user_uuid UUID := user_id;  -- Copy to avoid any ambiguity
  target_user_name TEXT := username; -- Copy to avoid any ambiguity
  profile_exists BOOLEAN := FALSE;
  stats_exists BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '[MANUAL] 🔧 Manual creation for: %', target_user_uuid;
  
  -- Check existing records using fully qualified names
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p WHERE p.id = target_user_uuid
  ) INTO profile_exists;
  
  SELECT EXISTS(
    SELECT 1 FROM public.user_level_stats uls WHERE uls.user_id = target_user_uuid
  ) INTO stats_exists;
  
  RAISE NOTICE '[MANUAL] 📊 Existing: Profile=%, Stats=%', profile_exists, stats_exists;
  
  -- Create profile if missing
  IF NOT profile_exists THEN
    BEGIN
      INSERT INTO public.profiles (
        id, username, registration_date, balance,
        last_claim_time, badges, created_at, updated_at
      )
      VALUES (
        target_user_uuid, target_user_name, NOW(), 0,
        '1970-01-01T00:00:00Z', ARRAY['welcome'], NOW(), NOW()
      );
      RAISE NOTICE '[MANUAL] ✅ Profile created';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '[MANUAL] ❌ Profile failed: %', SQLERRM;
        RETURN FALSE;
    END;
  END IF;
  
  -- Create stats if missing
  IF NOT stats_exists THEN
    BEGIN
      INSERT INTO public.user_level_stats (
        user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier,
        available_cases, total_cases_opened, coinflip_games, coinflip_wins, coinflip_wagered, coinflip_profit,
        crash_games, crash_wins, crash_wagered, crash_profit, roulette_games, roulette_wins, roulette_wagered, roulette_profit,
        roulette_highest_win, roulette_highest_loss, roulette_green_wins, roulette_red_wins, roulette_black_wins, roulette_favorite_color,
        tower_games, tower_wins, tower_wagered, tower_profit, total_games, total_wins, total_wagered, total_profit,
        biggest_win, biggest_loss, chat_messages_count, login_days_count, biggest_single_bet, account_created,
        current_win_streak, best_win_streak, tower_highest_level, tower_biggest_win, tower_biggest_loss,
        tower_best_streak, tower_current_streak, tower_perfect_games, created_at, updated_at
      )
      VALUES (
        target_user_uuid, 1, 0, 0, 651, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'none',
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, NOW(), 0, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW()
      );
      RAISE NOTICE '[MANUAL] ✅ Stats created';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '[MANUAL] ❌ Stats failed: %', SQLERRM;
        RETURN FALSE;
    END;
  END IF;
  
  RAISE NOTICE '[MANUAL] 🎯 Completed: Profile=%s, Stats=%s', 
    CASE WHEN NOT profile_exists THEN 'CREATED' ELSE 'EXISTS' END,
    CASE WHEN NOT stats_exists THEN 'CREATED' ELSE 'EXISTS' END;
  
  RETURN TRUE;
END;
$function$;

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile_manual(UUID, TEXT) TO anon, authenticated, service_role;

-- Step 6: Verification
DO $$
DECLARE
  trigger_count INTEGER := 0;
  function_count INTEGER := 0;
  manual_function_count INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO trigger_count FROM pg_trigger WHERE tgname = 'on_auth_user_created';
  SELECT COUNT(*) INTO function_count FROM pg_proc WHERE proname = 'handle_new_user';  
  SELECT COUNT(*) INTO manual_function_count FROM pg_proc WHERE proname = 'create_user_profile_manual';
  
  RAISE NOTICE '🔧 UNAMBIGUOUS REGISTRATION FIX DEPLOYED';
  RAISE NOTICE '📊 Components: Trigger=%, Function=%, Manual=%', trigger_count, function_count, manual_function_count;
  
  IF trigger_count = 0 OR function_count = 0 OR manual_function_count = 0 THEN
    RAISE EXCEPTION 'DEPLOYMENT FAILED: Missing components!';
  END IF;
  
  RAISE NOTICE '✅ ALL COMPONENTS VERIFIED AND ACTIVE';
  RAISE NOTICE '🚀 Ready for user registration testing';
END $$;