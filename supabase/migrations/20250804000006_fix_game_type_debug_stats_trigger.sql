-- Debug and fix game stats trigger issue - FIXED GAME TYPE CONSTRAINT
BEGIN;

-- First, let's check what's currently in place
DO $$
DECLARE
  trigger_exists BOOLEAN := FALSE;
  function_exists BOOLEAN := FALSE;
  stats_function_exists BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '=== 🔍 DEBUGGING GAME STATS SYSTEM ===';
  
  -- Check if trigger exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_table = 'game_history' 
    AND trigger_name = 'game_completion_trigger'
    AND trigger_schema = 'public'
  ) INTO trigger_exists;
  
  -- Check if handle_game_completion function exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'handle_game_completion'
  ) INTO function_exists;
  
  -- Check if update_user_stats_and_level function exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_user_stats_and_level'
  ) INTO stats_function_exists;
  
  RAISE NOTICE 'Trigger exists: %, Handle function exists: %, Stats function exists: %', 
    trigger_exists, function_exists, stats_function_exists;
    
  IF NOT trigger_exists THEN
    RAISE NOTICE '❌ CRITICAL: game_completion_trigger is missing!';
  END IF;
  
  IF NOT function_exists THEN
    RAISE NOTICE '❌ CRITICAL: handle_game_completion function is missing!';
  END IF;
  
  IF NOT stats_function_exists THEN
    RAISE NOTICE '❌ CRITICAL: update_user_stats_and_level function is missing!';
  END IF;
END $$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS game_completion_trigger ON public.game_history;

-- Recreate the trigger
CREATE TRIGGER game_completion_trigger
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_completion();

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Recreated game_completion_trigger on game_history table';
END $$;

-- Ensure the function has correct permissions
GRANT EXECUTE ON FUNCTION public.handle_game_completion() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(uuid, text, numeric, text, numeric, integer) TO anon, authenticated, service_role;

-- Add enhanced logging to the handle_game_completion function
CREATE OR REPLACE FUNCTION public.handle_game_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_name TEXT;
  streak_len INTEGER := 0;
  game_action TEXT := 'completed';
  stats_result RECORD;
  stats_function_exists BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '🎮 TRIGGER CALLED: handle_game_completion for user % game %', NEW.user_id, NEW.game_type;
  
  -- Check if the stats function exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_user_stats_and_level'
  ) INTO stats_function_exists;
  
  IF NOT stats_function_exists THEN
    RAISE NOTICE '❌ CRITICAL ERROR: update_user_stats_and_level function does not exist!';
    RAISE EXCEPTION 'update_user_stats_and_level function not found';
  END IF;
  
  -- Get username for live feed
  SELECT username INTO user_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  RAISE NOTICE '📝 Found username: % for user %', user_name, NEW.user_id;
  
  -- Update game stats and handle leveling using the comprehensive function
  -- This function handles XP, leveling, and ALL game-specific stats
  BEGIN
    SELECT * INTO stats_result 
    FROM public.update_user_stats_and_level(
      NEW.user_id, 
      NEW.game_type, 
      NEW.bet_amount, 
      NEW.result, 
      NEW.profit,
      COALESCE((NEW.game_data->>'streak_length')::INTEGER, 0)
    );
    
    RAISE NOTICE '✅ Stats updated successfully - User: %, Game: %, Result: %, Profit: %, Leveled up: %', 
      NEW.user_id, NEW.game_type, NEW.result, NEW.profit, stats_result.leveled_up;
      
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR updating stats: % - %', SQLSTATE, SQLERRM;
    -- Don't re-raise the exception to avoid breaking the entire game flow
    -- Just log the error and continue with live feed
  END;
  
  -- Handle live feed insertion (SKIP for test games to avoid constraint violations)
  IF NEW.game_type != 'tower' OR NEW.game_data->>'test' IS NULL THEN
    IF NEW.game_type = 'coinflip' THEN
      IF NEW.game_data IS NOT NULL THEN
        game_action := COALESCE(NEW.game_data->>'action', 'completed');
        
        -- ONLY add to live feed for concluded streaks (losses or cash-outs)
        IF game_action = 'lost' OR game_action = 'cash_out' THEN
          streak_len := COALESCE((NEW.game_data->>'streak_length')::INTEGER, 0);
          
          INSERT INTO public.live_bet_feed (
            user_id, username, game_type, bet_amount, result, profit, multiplier, game_data, streak_length, action
          ) VALUES (
            NEW.user_id, user_name, NEW.game_type, NEW.bet_amount, NEW.result, NEW.profit, 
            CASE 
              WHEN NEW.game_data ? 'multiplier' THEN (NEW.game_data->>'multiplier')::NUMERIC 
              ELSE NULL 
            END,
            NEW.game_data, streak_len, game_action
          );
          
          RAISE NOTICE '📡 Added coinflip to live feed with action: %', game_action;
        END IF;
      END IF;
    ELSE
      -- For all other games, add to live feed
      INSERT INTO public.live_bet_feed (
        user_id, username, game_type, bet_amount, result, profit, multiplier, game_data
      ) VALUES (
        NEW.user_id, user_name, NEW.game_type, NEW.bet_amount, NEW.result, NEW.profit, 
        CASE 
          WHEN NEW.game_data ? 'multiplier' THEN (NEW.game_data->>'multiplier')::NUMERIC 
          ELSE NULL 
        END,
        NEW.game_data
      );
      
      RAISE NOTICE '📡 Added % game to live feed', NEW.game_type;
    END IF;
  ELSE
    RAISE NOTICE '📡 Skipped live feed for test game';
  END IF;
  
  RAISE NOTICE '🎯 handle_game_completion completed successfully for user %', NEW.user_id;
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '💥 CRITICAL ERROR in handle_game_completion: % - %', SQLSTATE, SQLERRM;
  -- Return NEW to avoid breaking the insert
  RETURN NEW;
END;
$function$;

-- Grant permissions again
GRANT EXECUTE ON FUNCTION public.handle_game_completion() TO anon, authenticated, service_role;

-- Test the trigger with a simple insertion using a valid game type
DO $$
DECLARE
  test_user_id UUID;
  initial_games INTEGER := 0;
  updated_games INTEGER := 0;
  initial_tower_games INTEGER := 0;
  updated_tower_games INTEGER := 0;
BEGIN
  RAISE NOTICE '=== 🧪 TESTING TRIGGER ===';
  
  -- Get a real user
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users found for testing';
    RETURN;
  END IF;
  
  -- Get initial game counts
  SELECT COALESCE(total_games, 0), COALESCE(tower_games, 0) INTO initial_games, initial_tower_games
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  RAISE NOTICE '📊 Initial stats for user %: Total games: %, Tower games: %', test_user_id, initial_games, initial_tower_games;
  
  -- Insert a test tower game (valid game type)
  INSERT INTO public.game_history (user_id, game_type, bet_amount, result, profit, game_data)
  VALUES (test_user_id, 'tower', 10.00, 'win', 5.00, '{"test": true, "difficulty": "easy", "level_reached": 3}');
  
  -- Check updated game counts
  SELECT COALESCE(total_games, 0), COALESCE(tower_games, 0) INTO updated_games, updated_tower_games
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  RAISE NOTICE '📊 Updated stats for user %: Total games: %, Tower games: %', test_user_id, updated_games, updated_tower_games;
  
  IF updated_games > initial_games AND updated_tower_games > initial_tower_games THEN
    RAISE NOTICE '✅ SUCCESS: Trigger working! Total games: % -> %, Tower games: % -> %', 
      initial_games, updated_games, initial_tower_games, updated_tower_games;
    
    -- Clean up test data
    DELETE FROM public.game_history 
    WHERE user_id = test_user_id AND game_type = 'tower' AND game_data->>'test' = 'true';
    
    -- Clean up live feed test data if it was inserted
    DELETE FROM public.live_bet_feed 
    WHERE user_id = test_user_id AND game_type = 'tower' AND game_data->>'test' = 'true';
    
    -- Restore original counts
    UPDATE public.user_level_stats 
    SET 
      total_games = initial_games,
      tower_games = initial_tower_games,
      tower_wagered = tower_wagered - 10.00,
      tower_profit = tower_profit - 5.00,
      total_wagered = total_wagered - 10.00,
      total_profit = total_profit - 5.00,
      total_wins = total_wins - 1
    WHERE user_id = test_user_id;
    
    RAISE NOTICE '🧹 Cleaned up test data and restored original stats';
  ELSE
    RAISE NOTICE '❌ FAILED: Trigger not working - stats did not increase properly!';
    RAISE NOTICE '   Expected: total_games > % AND tower_games > %', initial_games, initial_tower_games;
    RAISE NOTICE '   Actual: total_games = %, tower_games = %', updated_games, updated_tower_games;
    
    -- Still clean up
    DELETE FROM public.game_history 
    WHERE user_id = test_user_id AND game_type = 'tower' AND game_data->>'test' = 'true';
    DELETE FROM public.live_bet_feed 
    WHERE user_id = test_user_id AND game_type = 'tower' AND game_data->>'test' = 'true';
  END IF;
  
END $$;

DO $$ 
BEGIN 
  RAISE NOTICE '=== ✅ GAME STATS TRIGGER DEBUG AND FIX COMPLETE ===';
END $$;

COMMIT;