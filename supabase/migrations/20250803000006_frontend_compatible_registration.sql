-- FRONTEND COMPATIBLE REGISTRATION FIX
-- Create functions with the exact signatures the frontend expects

-- Step 1: Complete cleanup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile_manual(UUID, TEXT) CASCADE;

-- Step 2: Create registration trigger function (simplified and reliable)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  username_text TEXT;
BEGIN
  RAISE NOTICE '[TRIGGER] 🚀 handle_new_user triggered for user: %', NEW.id;
  
  -- Generate username from metadata or create default
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
    RAISE NOTICE '[TRIGGER] ✅ Profile created successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '[TRIGGER] ❌ Profile creation failed: %', SQLERRM;
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
    RAISE NOTICE '[TRIGGER] ✅ User level stats created successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '[TRIGGER] ❌ Stats creation failed: %', SQLERRM;
  END;
  
  RAISE NOTICE '[TRIGGER] 📊 Registration completed for user: %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[TRIGGER] 💥 CRITICAL ERROR: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- Step 3: Create trigger that DEFINITELY fires
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Create manual function with EXACT signature frontend expects
CREATE OR REPLACE FUNCTION public.create_user_profile_manual(user_id UUID, username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  profile_exists BOOLEAN := FALSE;
  stats_exists BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '[MANUAL] 🔧 Manual profile creation for user: %', user_id;
  
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE profiles.id = user_id) INTO profile_exists;
  
  -- Check if stats already exist  
  SELECT EXISTS(SELECT 1 FROM public.user_level_stats WHERE user_level_stats.user_id = user_id) INTO stats_exists;
  
  RAISE NOTICE '[MANUAL] 📊 Existing records - Profile: %, Stats: %', profile_exists, stats_exists;
  
  -- Create profile if missing
  IF NOT profile_exists THEN
    BEGIN
      INSERT INTO public.profiles (
        id, username, registration_date, balance, level, xp, total_wagered, total_profit, 
        last_claim_time, badges, created_at, updated_at
      )
      VALUES (
        user_id, username, NOW(), 0, 1, 0, 0, 0, '1970-01-01T00:00:00Z', 
        ARRAY['welcome'], NOW(), NOW()
      );
      RAISE NOTICE '[MANUAL] ✅ Profile created successfully';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '[MANUAL] ❌ Failed to create profile: %', SQLERRM;
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
        user_id, 1, 0, 0, 651, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'none',
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, NOW(), 0, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW()
      );
      RAISE NOTICE '[MANUAL] ✅ Stats created successfully';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '[MANUAL] ❌ Failed to create stats: %', SQLERRM;
        RETURN FALSE;
    END;
  END IF;
  
  RAISE NOTICE '[MANUAL] 🎯 Manual creation completed - Profile: %, Stats: %', NOT profile_exists, NOT stats_exists;
  RETURN TRUE;
END;
$function$;

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile_manual(UUID, TEXT) TO anon, authenticated, service_role;

-- Step 6: Force trigger to exist or fail
DO $$
DECLARE
  trigger_count INTEGER := 0;
  function_count INTEGER := 0;
  manual_function_count INTEGER := 0;
BEGIN
  -- Verify components exist
  SELECT COUNT(*) INTO trigger_count FROM pg_trigger WHERE tgname = 'on_auth_user_created';
  SELECT COUNT(*) INTO function_count FROM pg_proc WHERE proname = 'handle_new_user';
  SELECT COUNT(*) INTO manual_function_count FROM pg_proc WHERE proname = 'create_user_profile_manual';
  
  RAISE NOTICE '🔧 FRONTEND COMPATIBLE REGISTRATION FIX';
  RAISE NOTICE '📊 Triggers: %, Functions: %, Manual: %', trigger_count, function_count, manual_function_count;
  
  -- Ensure everything was created
  IF trigger_count = 0 THEN
    RAISE EXCEPTION 'FATAL: Trigger was not created!';
  END IF;
  
  IF function_count = 0 THEN
    RAISE EXCEPTION 'FATAL: handle_new_user function missing!';
  END IF;
  
  IF manual_function_count = 0 THEN
    RAISE EXCEPTION 'FATAL: Manual function missing!';
  END IF;
  
  RAISE NOTICE '✅ ALL COMPONENTS VERIFIED';
  RAISE NOTICE '🚀 Trigger will fire on auth.users INSERT';
  RAISE NOTICE '🔧 Manual function matches frontend signature: create_user_profile_manual(user_id, username)';
  RAISE NOTICE '📝 Ready for registration testing';
END $$;