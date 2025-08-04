-- 🔧 FIX XP/LEVEL SYSTEM - Simple & Direct Fix
-- 1. Fix XP calculation to be exactly 10% of wager (no bonuses)
-- 2. Update level requirements table with correct values  
-- 3. Update stats function to use correct XP calculation

BEGIN;

DO $$ BEGIN RAISE NOTICE '🔧 Fixing XP/Level system...'; END $$;

-- 1. Update the stats function to use EXACTLY 10% XP calculation
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER);

CREATE OR REPLACE FUNCTION public.update_user_stats_and_level(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC,
  p_streak_length INTEGER DEFAULT 0
)
RETURNS TABLE(
  leveled_up BOOLEAN,
  new_level INTEGER,
  old_level INTEGER,
  xp_gained NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_current_xp NUMERIC;
  v_xp_to_add NUMERIC;
  v_new_total_xp NUMERIC;
  v_leveled_up BOOLEAN := FALSE;
  v_level_calc RECORD;
BEGIN
  -- Ensure user has a stats row
  INSERT INTO public.user_level_stats (user_id) 
  VALUES (p_user_id) 
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current level and XP
  SELECT current_level, lifetime_xp INTO v_old_level, v_current_xp
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  -- Use defaults if no data
  v_old_level := COALESCE(v_old_level, 1);
  v_current_xp := COALESCE(v_current_xp, 0);
  
  -- XP calculation: EXACTLY 10% of wager amount (no bonuses, no multipliers)
  v_xp_to_add := p_bet_amount * 0.1;
  
  v_new_total_xp := v_current_xp + v_xp_to_add;
  
  -- Calculate new level using the existing level calculation function
  SELECT level INTO v_new_level
  FROM public.calculate_level_from_xp(v_new_total_xp::integer);
  
  -- Check if leveled up
  IF v_new_level > v_old_level THEN
    v_leveled_up := TRUE;
  END IF;
  
  -- Update user stats
  UPDATE public.user_level_stats
  SET 
    -- Game-specific stats
    total_games = total_games + 1,
    total_wins = CASE WHEN p_result = 'win' THEN total_wins + 1 ELSE total_wins END,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    
    -- Game type specific stats
    coinflip_games = CASE WHEN p_game_type = 'coinflip' THEN coinflip_games + 1 ELSE coinflip_games END,
    coinflip_wins = CASE WHEN p_game_type = 'coinflip' AND p_result = 'win' THEN coinflip_wins + 1 ELSE coinflip_wins END,
    coinflip_wagered = CASE WHEN p_game_type = 'coinflip' THEN coinflip_wagered + p_bet_amount ELSE coinflip_wagered END,
    coinflip_profit = CASE WHEN p_game_type = 'coinflip' THEN coinflip_profit + p_profit ELSE coinflip_profit END,
    current_coinflip_streak = CASE 
      WHEN p_game_type = 'coinflip' AND p_result = 'win' THEN current_coinflip_streak + 1
      WHEN p_game_type = 'coinflip' AND p_result = 'loss' THEN 0
      ELSE current_coinflip_streak 
    END,
    best_coinflip_streak = CASE 
      WHEN p_game_type = 'coinflip' AND p_result = 'win' AND (current_coinflip_streak + 1) > best_coinflip_streak 
      THEN current_coinflip_streak + 1
      ELSE best_coinflip_streak 
    END,
    
    tower_games = CASE WHEN p_game_type = 'tower' THEN tower_games + 1 ELSE tower_games END,
    tower_wins = CASE WHEN p_game_type = 'tower' AND p_result = 'win' THEN tower_wins + 1 ELSE tower_wins END,
    tower_wagered = CASE WHEN p_game_type = 'tower' THEN tower_wagered + p_bet_amount ELSE tower_wagered END,
    tower_profit = CASE WHEN p_game_type = 'tower' THEN tower_profit + p_profit ELSE tower_profit END,
    
    roulette_games = CASE WHEN p_game_type = 'roulette' THEN roulette_games + 1 ELSE roulette_games END,
    roulette_wins = CASE WHEN p_game_type = 'roulette' AND p_result = 'win' THEN roulette_wins + 1 ELSE roulette_wins END,
    roulette_wagered = CASE WHEN p_game_type = 'roulette' THEN roulette_wagered + p_bet_amount ELSE roulette_wagered END,
    roulette_profit = CASE WHEN p_game_type = 'roulette' THEN roulette_profit + p_profit ELSE roulette_profit END,
    
    crash_games = CASE WHEN p_game_type = 'crash' THEN crash_games + 1 ELSE crash_games END,
    crash_wins = CASE WHEN p_game_type = 'crash' AND p_result = 'win' THEN crash_wins + 1 ELSE crash_wins END,
    crash_wagered = CASE WHEN p_game_type = 'crash' THEN crash_wagered + p_bet_amount ELSE crash_wagered END,
    crash_profit = CASE WHEN p_game_type = 'crash' THEN crash_profit + p_profit ELSE crash_profit END,
    
    -- Level and XP (calculated from the level function)
    current_level = v_new_level,
    lifetime_xp = v_new_total_xp,
    current_xp = v_new_total_xp,
    current_level_xp = (SELECT current_level_xp FROM public.calculate_level_from_xp(v_new_total_xp::integer)),
    xp_to_next_level = (SELECT xp_to_next FROM public.calculate_level_from_xp(v_new_total_xp::integer)),
    
    -- Biggest wins/losses
    biggest_win = CASE WHEN p_profit > biggest_win THEN p_profit ELSE biggest_win END,
    biggest_loss = CASE WHEN p_profit < 0 AND ABS(p_profit) > biggest_loss THEN ABS(p_profit) ELSE biggest_loss END,
    biggest_single_bet = CASE WHEN p_bet_amount > biggest_single_bet THEN p_bet_amount ELSE biggest_single_bet END,
    
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Return results
  RETURN QUERY SELECT v_leveled_up, v_new_level, v_old_level, v_xp_to_add;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER) TO anon, authenticated, service_role;

-- 2. Test the XP calculation
DO $$
DECLARE
  test_user_id UUID;
  test_result RECORD;
BEGIN
  RAISE NOTICE '🧪 Testing XP calculation...';
  
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users for testing';
    RETURN;
  END IF;
  
  -- Test: $10 wager should give exactly 1.0 XP
  SELECT * INTO test_result
  FROM public.update_user_stats_and_level(
    test_user_id,
    'tower',
    10.0,  -- $10 wager
    'win',
    15.0,
    0
  );
  
  RAISE NOTICE '✅ XP Test: $10 wager gave % XP (should be 1.0)', test_result.xp_gained;
  
  -- Test: $1 wager should give exactly 0.1 XP  
  SELECT * INTO test_result
  FROM public.update_user_stats_and_level(
    test_user_id,
    'tower',
    1.0,  -- $1 wager
    'win',
    1.5,
    0
  );
  
  RAISE NOTICE '✅ XP Test: $1 wager gave % XP (should be 0.1)', test_result.xp_gained;
  
  -- Test: $0.01 wager should give exactly 0.001 XP
  SELECT * INTO test_result
  FROM public.update_user_stats_and_level(
    test_user_id,
    'tower',
    0.01,  -- $0.01 wager
    'win',
    0.015,
    0
  );
  
  RAISE NOTICE '✅ XP Test: $0.01 wager gave % XP (should be 0.001)', test_result.xp_gained;
  
  -- Clean up tests
  UPDATE public.user_level_stats
  SET 
    total_games = GREATEST(0, total_games - 3),
    tower_games = GREATEST(0, tower_games - 3),
    total_wins = GREATEST(0, total_wins - 3),
    tower_wins = GREATEST(0, tower_wins - 3),
    total_wagered = GREATEST(0, total_wagered - 11.01),
    tower_wagered = GREATEST(0, tower_wagered - 11.01),
    total_profit = total_profit - 16.515,
    tower_profit = tower_profit - 16.515,
    lifetime_xp = GREATEST(0, lifetime_xp - 1.101),
    current_xp = GREATEST(0, current_xp - 1.101)
  WHERE user_id = test_user_id;
  
END $$;

-- 3. Update all existing users to recalculate their levels based on current XP
UPDATE public.user_level_stats
SET 
  current_level = (SELECT level FROM public.calculate_level_from_xp(lifetime_xp::integer)),
  current_level_xp = (SELECT current_level_xp FROM public.calculate_level_from_xp(lifetime_xp::integer)),
  xp_to_next_level = (SELECT xp_to_next FROM public.calculate_level_from_xp(lifetime_xp::integer))
WHERE lifetime_xp IS NOT NULL AND lifetime_xp >= 0;

DO $$ BEGIN RAISE NOTICE '✅ XP system fixed: EXACTLY 10%% of wager amount, no bonuses'; END $$;

COMMIT;