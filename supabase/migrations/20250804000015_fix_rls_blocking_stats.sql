-- 🔧 FIX RLS BLOCKING STATS FUNCTION
-- RLS policies are preventing update_user_stats_and_level from working

BEGIN;

DO $$ BEGIN RAISE NOTICE '🔧 Fixing RLS blocking stats function...'; END $$;

-- 1. Check if the function exists and what security it has
DO $$
DECLARE
  func_security TEXT;
BEGIN
  SELECT prosecdef::text INTO func_security
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'update_user_stats_and_level';
  
  RAISE NOTICE 'Current function security: %', COALESCE(func_security, 'NOT FOUND');
END $$;

-- 2. Recreate the function with SECURITY DEFINER to bypass RLS
-- First, let's see what the function looks like
DO $$
DECLARE
  func_definition TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO func_definition
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'update_user_stats_and_level';
  
  IF func_definition IS NOT NULL THEN
    RAISE NOTICE '✅ Function found, will recreate with proper security';
  ELSE
    RAISE NOTICE '❌ Function not found!';
  END IF;
END $$;

-- 3. If the function doesn't have SECURITY DEFINER, we need to alter it or recreate it
-- Let's alter the existing function to use SECURITY DEFINER
DO $$
BEGIN
  -- First check if function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'update_user_stats_and_level'
  ) THEN
    -- Drop and recreate with proper security
    DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER);
    RAISE NOTICE '🗑️ Dropped existing function to recreate with proper security';
  END IF;
END $$;

-- 4. Recreate the function with SECURITY DEFINER and proper SET search_path
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
SECURITY DEFINER  -- This bypasses RLS
SET search_path TO 'public', 'pg_temp'  -- Security measure
AS $function$
DECLARE
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_current_xp NUMERIC;
  v_xp_to_add NUMERIC;
  v_new_total_xp NUMERIC;
  v_leveled_up BOOLEAN := FALSE;
  v_user_exists BOOLEAN := FALSE;
BEGIN
  -- Ensure user has a stats row
  INSERT INTO public.user_level_stats (user_id) 
  VALUES (p_user_id) 
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current level and XP
  SELECT current_level, lifetime_xp INTO v_old_level, v_current_xp
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  -- Calculate XP to add (base amount based on bet)
  v_xp_to_add := GREATEST(1, p_bet_amount * 0.1);
  
  -- Bonus XP for wins
  IF p_result = 'win' THEN
    v_xp_to_add := v_xp_to_add * 1.5;
  END IF;
  
  -- Bonus XP for streaks
  IF p_streak_length > 0 THEN
    v_xp_to_add := v_xp_to_add * (1 + (p_streak_length * 0.1));
  END IF;
  
  v_new_total_xp := v_current_xp + v_xp_to_add;
  
  -- Calculate new level
  SELECT public.calculate_level_from_xp_new(v_new_total_xp) INTO v_new_level;
  
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
    
    -- Level and XP
    current_level = v_new_level,
    lifetime_xp = v_new_total_xp,
    current_xp = v_new_total_xp,
    
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

-- 5. Grant proper permissions to all roles
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER) TO anon, authenticated, service_role;

-- 6. Test the function again
DO $$
DECLARE
  test_user_id UUID;
  before_games INTEGER;
  after_games INTEGER;
  test_result RECORD;
BEGIN
  RAISE NOTICE '🧪 Testing fixed function...';
  
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users for testing';
    RETURN;
  END IF;
  
  -- Get baseline
  SELECT COALESCE(total_games, 0) INTO before_games
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  -- Test function
  SELECT * INTO test_result
  FROM public.update_user_stats_and_level(
    test_user_id,
    'tower',
    25.0,
    'win',
    37.5,
    0
  );
  
  -- Check result
  SELECT COALESCE(total_games, 0) INTO after_games
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  IF after_games > before_games THEN
    RAISE NOTICE '🎉 SUCCESS! Function now works - Games: % → %, XP gained: %', 
      before_games, after_games, test_result.xp_gained;
    
    -- Restore for clean test
    UPDATE public.user_level_stats
    SET 
      total_games = before_games,
      tower_games = GREATEST(0, tower_games - 1),
      total_wins = GREATEST(0, total_wins - 1),
      tower_wins = GREATEST(0, tower_wins - 1),
      total_wagered = GREATEST(0, total_wagered - 25.0),
      tower_wagered = GREATEST(0, tower_wagered - 25.0),
      total_profit = total_profit - 37.5,
      tower_profit = tower_profit - 37.5,
      lifetime_xp = lifetime_xp - test_result.xp_gained,
      current_xp = current_xp - test_result.xp_gained
    WHERE user_id = test_user_id;
    
  ELSE
    RAISE NOTICE '❌ FAILED! Function still not working';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE '✅ RLS bypass fix applied to update_user_stats_and_level function'; END $$;

COMMIT;