-- 🔧 FIX XP AND STATISTICS TRACKING
-- Restore all XP awarding and statistics tracking functionality

BEGIN;

DO $$ BEGIN RAISE NOTICE '🔧 Fixing XP and statistics tracking system...'; END $$;

-- 1. Create function to award XP based on wager amount
CREATE OR REPLACE FUNCTION public.award_xp_for_wager(p_user_id uuid, p_wager_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_xp_to_award integer;
  v_old_level integer;
  v_new_level integer;
  v_level_result RECORD;
BEGIN
  -- Calculate XP to award (1 XP per $1 wagered, minimum 1 XP)
  v_xp_to_award := GREATEST(FLOOR(p_wager_amount)::integer, 1);
  
  -- Get current level before XP update
  SELECT current_level INTO v_old_level 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  -- Update lifetime XP and current XP
  UPDATE public.user_level_stats
  SET 
    lifetime_xp = COALESCE(lifetime_xp, 0) + v_xp_to_award,
    current_xp = COALESCE(current_xp, 0) + v_xp_to_award,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Recalculate level based on new lifetime XP
  SELECT * INTO v_level_result 
  FROM public.calculate_level_from_xp((
    SELECT lifetime_xp::integer 
    FROM public.user_level_stats 
    WHERE user_id = p_user_id
  ));
  
  -- Update level stats with calculated values
  UPDATE public.user_level_stats
  SET 
    current_level = v_level_result.user_level,
    current_level_xp = v_level_result.current_level_xp,
    xp_to_next_level = v_level_result.xp_to_next,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Get new level after update
  v_new_level := v_level_result.user_level;
  
  -- If user leveled up, create notification
  IF v_old_level IS NOT NULL AND v_new_level > v_old_level THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      p_user_id,
      'level_up',
      'Level Up!',
      format('Congratulations! You reached level %s!', v_new_level),
      jsonb_build_object(
        'old_level', v_old_level,
        'new_level', v_new_level,
        'xp_awarded', v_xp_to_award
      )
    );
  END IF;
  
END;
$function$;

-- 2. Create function to update game statistics
CREATE OR REPLACE FUNCTION public.update_game_statistics(
  p_user_id uuid,
  p_game_type text,
  p_bet_amount numeric,
  p_profit numeric,
  p_is_win boolean,
  p_additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_streak_field text;
  v_best_streak_field text;
  v_current_streak integer := 0;
  v_best_streak integer := 0;
BEGIN
  -- Ensure user_level_stats record exists
  INSERT INTO public.user_level_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Determine streak field names based on game type
  CASE p_game_type
    WHEN 'coinflip' THEN
      v_streak_field := 'current_coinflip_streak';
      v_best_streak_field := 'best_coinflip_streak';
    WHEN 'roulette' THEN
      v_streak_field := 'roulette_current_streak';
      v_best_streak_field := 'roulette_best_streak';
    WHEN 'tower' THEN
      v_streak_field := 'tower_current_streak';
      v_best_streak_field := 'tower_best_streak';
    ELSE
      v_streak_field := 'current_win_streak';
      v_best_streak_field := 'best_win_streak';
  END CASE;
  
  -- Update base statistics for all games
  UPDATE public.user_level_stats
  SET 
    total_games = COALESCE(total_games, 0) + 1,
    total_wagered = COALESCE(total_wagered, 0) + p_bet_amount,
    total_profit = COALESCE(total_profit, 0) + p_profit,
    total_wins = CASE WHEN p_is_win THEN COALESCE(total_wins, 0) + 1 ELSE total_wins END,
    biggest_win = CASE WHEN p_profit > COALESCE(biggest_win, 0) THEN p_profit ELSE biggest_win END,
    biggest_loss = CASE WHEN p_profit < COALESCE(biggest_loss, 0) THEN p_profit ELSE biggest_loss END,
    biggest_single_bet = CASE WHEN p_bet_amount > COALESCE(biggest_single_bet, 0) THEN p_bet_amount ELSE biggest_single_bet END,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Update game-specific statistics
  CASE p_game_type
    WHEN 'coinflip' THEN
      UPDATE public.user_level_stats
      SET 
        coinflip_games = COALESCE(coinflip_games, 0) + 1,
        coinflip_wagered = COALESCE(coinflip_wagered, 0) + p_bet_amount,
        coinflip_profit = COALESCE(coinflip_profit, 0) + p_profit,
        coinflip_wins = CASE WHEN p_is_win THEN COALESCE(coinflip_wins, 0) + 1 ELSE coinflip_wins END,
        current_coinflip_streak = CASE WHEN p_is_win THEN COALESCE(current_coinflip_streak, 0) + 1 ELSE 0 END,
        best_coinflip_streak = CASE 
          WHEN p_is_win AND (COALESCE(current_coinflip_streak, 0) + 1) > COALESCE(best_coinflip_streak, 0) 
          THEN COALESCE(current_coinflip_streak, 0) + 1 
          ELSE best_coinflip_streak 
        END
      WHERE user_id = p_user_id;
      
    WHEN 'crash' THEN
      UPDATE public.user_level_stats
      SET 
        crash_games = COALESCE(crash_games, 0) + 1,
        crash_wagered = COALESCE(crash_wagered, 0) + p_bet_amount,
        crash_profit = COALESCE(crash_profit, 0) + p_profit,
        crash_wins = CASE WHEN p_is_win THEN COALESCE(crash_wins, 0) + 1 ELSE crash_wins END
      WHERE user_id = p_user_id;
      
    WHEN 'roulette' THEN
      UPDATE public.user_level_stats
      SET 
        roulette_games = COALESCE(roulette_games, 0) + 1,
        roulette_wagered = COALESCE(roulette_wagered, 0) + p_bet_amount,
        roulette_profit = COALESCE(roulette_profit, 0) + p_profit,
        roulette_wins = CASE WHEN p_is_win THEN COALESCE(roulette_wins, 0) + 1 ELSE roulette_wins END,
        roulette_highest_win = CASE WHEN p_profit > COALESCE(roulette_highest_win, 0) THEN p_profit ELSE roulette_highest_win END,
        roulette_highest_loss = CASE WHEN p_profit < COALESCE(roulette_highest_loss, 0) THEN p_profit ELSE roulette_highest_loss END,
        roulette_biggest_bet = CASE WHEN p_bet_amount > COALESCE(roulette_biggest_bet, 0) THEN p_bet_amount ELSE roulette_biggest_bet END,
        roulette_current_streak = CASE WHEN p_is_win THEN COALESCE(roulette_current_streak, 0) + 1 ELSE 0 END,
        roulette_best_streak = CASE 
          WHEN p_is_win AND (COALESCE(roulette_current_streak, 0) + 1) > COALESCE(roulette_best_streak, 0) 
          THEN COALESCE(roulette_current_streak, 0) + 1 
          ELSE roulette_best_streak 
        END,
        -- Update color-specific wins for roulette
        roulette_green_wins = CASE 
          WHEN p_is_win AND (p_additional_data->>'bet_color') = 'green' 
          THEN COALESCE(roulette_green_wins, 0) + 1 
          ELSE roulette_green_wins 
        END,
        roulette_red_wins = CASE 
          WHEN p_is_win AND (p_additional_data->>'bet_color') = 'red' 
          THEN COALESCE(roulette_red_wins, 0) + 1 
          ELSE roulette_red_wins 
        END,
        roulette_black_wins = CASE 
          WHEN p_is_win AND (p_additional_data->>'bet_color') = 'black' 
          THEN COALESCE(roulette_black_wins, 0) + 1 
          ELSE roulette_black_wins 
        END
      WHERE user_id = p_user_id;
      
    WHEN 'tower' THEN
      UPDATE public.user_level_stats
      SET 
        tower_games = COALESCE(tower_games, 0) + 1,
        tower_wagered = COALESCE(tower_wagered, 0) + p_bet_amount,
        tower_profit = COALESCE(tower_profit, 0) + p_profit,
        tower_wins = CASE WHEN p_is_win THEN COALESCE(tower_wins, 0) + 1 ELSE tower_wins END,
        tower_biggest_win = CASE WHEN p_profit > COALESCE(tower_biggest_win, 0) THEN p_profit ELSE tower_biggest_win END,
        tower_biggest_loss = CASE WHEN p_profit < COALESCE(tower_biggest_loss, 0) THEN p_profit ELSE tower_biggest_loss END,
        tower_current_streak = CASE WHEN p_is_win THEN COALESCE(tower_current_streak, 0) + 1 ELSE 0 END,
        tower_best_streak = CASE 
          WHEN p_is_win AND (COALESCE(tower_current_streak, 0) + 1) > COALESCE(tower_best_streak, 0) 
          THEN COALESCE(tower_current_streak, 0) + 1 
          ELSE tower_best_streak 
        END,
        tower_highest_level = CASE 
          WHEN (p_additional_data->>'highest_level')::integer > COALESCE(tower_highest_level, 0) 
          THEN (p_additional_data->>'highest_level')::integer 
          ELSE tower_highest_level 
        END,
        -- Update difficulty-specific completions
        tower_easy_completions = CASE 
          WHEN p_is_win AND (p_additional_data->>'difficulty') = 'easy' 
          THEN COALESCE(tower_easy_completions, 0) + 1 
          ELSE tower_easy_completions 
        END,
        tower_medium_completions = CASE 
          WHEN p_is_win AND (p_additional_data->>'difficulty') = 'medium' 
          THEN COALESCE(tower_medium_completions, 0) + 1 
          ELSE tower_medium_completions 
        END,
        tower_hard_completions = CASE 
          WHEN p_is_win AND (p_additional_data->>'difficulty') = 'hard' 
          THEN COALESCE(tower_hard_completions, 0) + 1 
          ELSE tower_hard_completions 
        END,
        tower_extreme_completions = CASE 
          WHEN p_is_win AND (p_additional_data->>'difficulty') = 'extreme' 
          THEN COALESCE(tower_extreme_completions, 0) + 1 
          ELSE tower_extreme_completions 
        END,
        tower_perfect_games = CASE 
          WHEN p_is_win AND (p_additional_data->>'is_perfect')::boolean 
          THEN COALESCE(tower_perfect_games, 0) + 1 
          ELSE tower_perfect_games 
        END
      WHERE user_id = p_user_id;
  END CASE;
  
  -- Update overall win streak
  UPDATE public.user_level_stats
  SET 
    current_win_streak = CASE WHEN p_is_win THEN COALESCE(current_win_streak, 0) + 1 ELSE 0 END,
    best_win_streak = CASE 
      WHEN p_is_win AND (COALESCE(current_win_streak, 0) + 1) > COALESCE(best_win_streak, 0) 
      THEN COALESCE(current_win_streak, 0) + 1 
      ELSE best_win_streak 
    END
  WHERE user_id = p_user_id;
  
END;
$function$;

-- 3. Create trigger function for automatic XP and stats tracking
CREATE OR REPLACE FUNCTION public.handle_game_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_is_win boolean;
  v_game_data jsonb;
BEGIN
  -- Determine if this was a win based on profit
  v_is_win := NEW.profit > 0;
  
  -- Prepare additional game data
  v_game_data := COALESCE(NEW.game_data, '{}'::jsonb);
  
  -- Award XP for the wager
  PERFORM public.award_xp_for_wager(NEW.user_id, NEW.bet_amount);
  
  -- Update game statistics
  PERFORM public.update_game_statistics(
    NEW.user_id,
    NEW.game_type,
    NEW.bet_amount,
    NEW.profit,
    v_is_win,
    v_game_data
  );
  
  RETURN NEW;
END;
$function$;

-- 4. Create triggers for automatic tracking on game completion
DROP TRIGGER IF EXISTS trigger_game_history_xp_and_stats ON public.game_history;
CREATE TRIGGER trigger_game_history_xp_and_stats
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_completion();

-- 5. Create trigger function for roulette bets
CREATE OR REPLACE FUNCTION public.handle_roulette_bet_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_is_win boolean;
  v_game_data jsonb;
BEGIN
  -- Only process when bet is completed (has actual_payout set)
  IF NEW.actual_payout IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Determine if this was a win
  v_is_win := COALESCE(NEW.is_winner, false);
  
  -- Prepare game data with bet color
  v_game_data := jsonb_build_object('bet_color', NEW.bet_color);
  
  -- Award XP for the wager
  PERFORM public.award_xp_for_wager(NEW.user_id, NEW.bet_amount);
  
  -- Update game statistics
  PERFORM public.update_game_statistics(
    NEW.user_id,
    'roulette',
    NEW.bet_amount,
    NEW.profit,
    v_is_win,
    v_game_data
  );
  
  RETURN NEW;
END;
$function$;

-- 6. Create trigger for roulette bets
DROP TRIGGER IF EXISTS trigger_roulette_bets_xp_and_stats ON public.roulette_bets;
CREATE TRIGGER trigger_roulette_bets_xp_and_stats
  AFTER UPDATE ON public.roulette_bets
  FOR EACH ROW
  WHEN (NEW.actual_payout IS DISTINCT FROM OLD.actual_payout AND NEW.actual_payout IS NOT NULL)
  EXECUTE FUNCTION public.handle_roulette_bet_completion();

-- 7. Create trigger function for crash bets
CREATE OR REPLACE FUNCTION public.handle_crash_bet_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_is_win boolean;
  v_game_data jsonb;
BEGIN
  -- Only process when bet status changes to completed state
  IF NEW.status NOT IN ('cashed_out', 'lost') OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Determine if this was a win
  v_is_win := NEW.status = 'cashed_out' AND NEW.profit > 0;
  
  -- Prepare game data
  v_game_data := jsonb_build_object(
    'cashed_out_at', NEW.cashed_out_at,
    'auto_cashout_at', NEW.auto_cashout_at
  );
  
  -- Award XP for the wager
  PERFORM public.award_xp_for_wager(NEW.user_id, NEW.bet_amount);
  
  -- Update game statistics
  PERFORM public.update_game_statistics(
    NEW.user_id,
    'crash',
    NEW.bet_amount,
    COALESCE(NEW.profit, 0),
    v_is_win,
    v_game_data
  );
  
  RETURN NEW;
END;
$function$;

-- 8. Create trigger for crash bets
DROP TRIGGER IF EXISTS trigger_crash_bets_xp_and_stats ON public.crash_bets;
CREATE TRIGGER trigger_crash_bets_xp_and_stats
  AFTER UPDATE ON public.crash_bets
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('cashed_out', 'lost'))
  EXECUTE FUNCTION public.handle_crash_bet_completion();

-- 9. Create trigger function for tower games
CREATE OR REPLACE FUNCTION public.handle_tower_game_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_is_win boolean;
  v_game_data jsonb;
  v_is_perfect boolean;
BEGIN
  -- Only process when game status changes to completed state
  IF NEW.status NOT IN ('cashed_out', 'lost') OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Determine if this was a win
  v_is_win := NEW.status = 'cashed_out' AND NEW.final_payout > NEW.bet_amount;
  
  -- Check if it was a perfect game (reached max level)
  v_is_perfect := NEW.current_level >= NEW.max_level;
  
  -- Prepare game data
  v_game_data := jsonb_build_object(
    'difficulty', NEW.difficulty,
    'highest_level', NEW.current_level,
    'max_level', NEW.max_level,
    'is_perfect', v_is_perfect,
    'final_multiplier', NEW.current_multiplier
  );
  
  -- Award XP for the wager
  PERFORM public.award_xp_for_wager(NEW.user_id, NEW.bet_amount);
  
  -- Update game statistics
  PERFORM public.update_game_statistics(
    NEW.user_id,
    'tower',
    NEW.bet_amount,
    COALESCE(NEW.final_payout, 0) - NEW.bet_amount,
    v_is_win,
    v_game_data
  );
  
  RETURN NEW;
END;
$function$;

-- 10. Create trigger for tower games
DROP TRIGGER IF EXISTS trigger_tower_games_xp_and_stats ON public.tower_games;
CREATE TRIGGER trigger_tower_games_xp_and_stats
  AFTER UPDATE ON public.tower_games
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('cashed_out', 'lost'))
  EXECUTE FUNCTION public.handle_tower_game_completion();

-- 11. Grant permissions
GRANT EXECUTE ON FUNCTION public.award_xp_for_wager(uuid, numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_game_statistics(uuid, text, numeric, numeric, boolean, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_game_completion() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_roulette_bet_completion() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_crash_bet_completion() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_tower_game_completion() TO anon, authenticated, service_role;

-- 12. Test the XP awarding system
DO $$
DECLARE
  test_user_id uuid;
  test_result RECORD;
BEGIN
  RAISE NOTICE '🧪 Testing XP and statistics tracking...';
  
  -- Get a test user (or create one for testing)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test XP awarding
    PERFORM public.award_xp_for_wager(test_user_id, 100);
    
    -- Check the result
    SELECT current_level, lifetime_xp, current_level_xp, xp_to_next_level 
    INTO test_result
    FROM public.user_level_stats 
    WHERE user_id = test_user_id;
    
    RAISE NOTICE 'Test user XP update: Level %, Lifetime XP %, Current XP %, To Next %', 
      test_result.current_level, test_result.lifetime_xp, test_result.current_level_xp, test_result.xp_to_next_level;
  ELSE
    RAISE NOTICE 'No test users found - XP system ready for use';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE '✅ XP and statistics tracking system fully restored!'; END $$;

COMMIT;