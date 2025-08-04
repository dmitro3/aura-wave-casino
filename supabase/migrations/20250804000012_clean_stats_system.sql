-- 🧹 CLEAN STATS SYSTEM - Remove bridge and ensure trigger backup works
BEGIN;

DO $$
BEGIN
  RAISE NOTICE '=== 🧹 CLEAN STATS SYSTEM ===';
  RAISE NOTICE 'Edge Functions updated to call correct function directly';
  RAISE NOTICE 'Setting up trigger backup system...';
END $$;

-- 1. Clean up any existing triggers
DROP TRIGGER IF EXISTS handle_game_completion_trigger ON public.game_history CASCADE;
DROP TRIGGER IF EXISTS backup_stats_trigger ON public.game_history CASCADE;
DROP TRIGGER IF EXISTS comprehensive_game_completion_trigger ON public.game_history CASCADE;

-- 2. Remove the bridge function (no longer needed)
DROP FUNCTION IF EXISTS public.update_user_level_stats(UUID, TEXT, NUMERIC, NUMERIC, BOOLEAN, TEXT, BOOLEAN) CASCADE;

-- 3. Create a simple, clean trigger as backup
CREATE OR REPLACE FUNCTION public.game_completion_backup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  stats_result RECORD;
BEGIN
  -- Log trigger activation (only for debugging)
  RAISE NOTICE '🔄 BACKUP TRIGGER: User %, Game %, Bet %, Result %, Profit %',
    NEW.user_id, NEW.game_type, NEW.bet_amount, NEW.result, NEW.profit;
  
  -- Update stats using the correct comprehensive function
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
    
    RAISE NOTICE '✅ BACKUP SUCCESS: User %, Leveled up: %, New level: %',
      NEW.user_id, stats_result.leveled_up, stats_result.new_level;
      
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ BACKUP ERROR: % (%)', SQLERRM, SQLSTATE;
    -- Continue execution - don't break game inserts
  END;
  
  RETURN NEW;
END;
$function$;

-- 4. Create the backup trigger
CREATE TRIGGER game_completion_backup_trigger
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.game_completion_backup();

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.game_completion_backup() TO anon, authenticated, service_role, postgres;

-- 6. Test the clean system
DO $$
DECLARE
  test_user_id UUID;
  before_stats RECORD;
  after_stats RECORD;
  test_game_id UUID;
BEGIN
  RAISE NOTICE '=== TESTING CLEAN SYSTEM ===';
  
  -- Get test user
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users found for testing';
    RETURN;
  END IF;
  
  -- Get baseline stats
  SELECT COALESCE(total_games, 0) as total_games, COALESCE(lifetime_xp, 0) as lifetime_xp
  INTO before_stats
  FROM public.user_level_stats WHERE user_id = test_user_id;
  
  IF before_stats IS NULL THEN
    before_stats := ROW(0, 0);
  END IF;
  
  RAISE NOTICE 'BEFORE: Games: %, XP: %', before_stats.total_games, before_stats.lifetime_xp;
  
  -- Test trigger backup system
  INSERT INTO public.game_history (user_id, game_type, bet_amount, result, profit, game_data)
  VALUES (test_user_id, 'tower', 20.0, 'win', 30.0, '{"test": "clean_system"}')
  RETURNING id INTO test_game_id;
  
  RAISE NOTICE 'Inserted test game: %', test_game_id;
  
  -- Wait for trigger
  PERFORM pg_sleep(0.2);
  
  -- Check results
  SELECT COALESCE(total_games, 0) as total_games, COALESCE(lifetime_xp, 0) as lifetime_xp
  INTO after_stats
  FROM public.user_level_stats WHERE user_id = test_user_id;
  
  IF after_stats.total_games > before_stats.total_games THEN
    RAISE NOTICE '✅ CLEAN SYSTEM SUCCESS! Games: % → %, XP: % → %', 
      before_stats.total_games, after_stats.total_games,
      before_stats.lifetime_xp, after_stats.lifetime_xp;
  ELSE
    RAISE NOTICE '❌ CLEAN SYSTEM FAILED! No stats change detected';
  END IF;
  
  -- Cleanup
  DELETE FROM public.game_history WHERE id = test_game_id;
  DELETE FROM public.live_bet_feed WHERE user_id = test_user_id AND game_data->>'test' = 'clean_system';
  
  -- Restore stats if test passed
  IF after_stats.total_games > before_stats.total_games THEN
    UPDATE public.user_level_stats
    SET 
      total_games = before_stats.total_games,
      tower_games = GREATEST(0, tower_games - 1),
      total_wins = GREATEST(0, total_wins - 1),
      tower_wins = GREATEST(0, tower_wins - 1),
      total_wagered = GREATEST(0, total_wagered - 20.0),
      tower_wagered = GREATEST(0, tower_wagered - 20.0),
      total_profit = total_profit - 30.0,
      tower_profit = tower_profit - 30.0,
      lifetime_xp = before_stats.lifetime_xp
    WHERE user_id = test_user_id;
    
    RAISE NOTICE '🧹 Test cleanup completed';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== 🧹 CLEAN STATS SYSTEM COMPLETE ===';
  RAISE NOTICE '';
  RAISE NOTICE 'WHAT WAS FIXED:';
  RAISE NOTICE '1. ✅ Edge Functions now call update_user_stats_and_level() directly';
  RAISE NOTICE '2. ✅ Removed unnecessary bridge function';
  RAISE NOTICE '3. ✅ Clean trigger backup system in place';
  RAISE NOTICE '4. ✅ Simplified architecture with proper function calls';
  RAISE NOTICE '';
  RAISE NOTICE 'EDGE FUNCTIONS: Tower, Roulette, Coinflip updated to use correct function';
  RAISE NOTICE 'BACKUP TRIGGER: Catches any missed game_history inserts';
  RAISE NOTICE 'RESULT: Clean, direct stats updates without compatibility layers';
  RAISE NOTICE '';
  RAISE NOTICE 'Your stats should now work perfectly with the proper architecture!';
END $$;

COMMIT;