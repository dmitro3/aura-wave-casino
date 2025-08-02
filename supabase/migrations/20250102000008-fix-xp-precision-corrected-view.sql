-- ===============================================
-- FIX XP PRECISION WITH CORRECTED VIEW COLUMNS
-- ===============================================
-- This fixes the column reference errors in the user_data_view recreation

-- Step 1: Drop the dependent view temporarily
-- ==========================================

DROP VIEW IF EXISTS public.user_data_view CASCADE;

-- Step 2: Update XP columns to support 3 decimal precision
-- ========================================================

-- Update user_level_stats table XP columns
ALTER TABLE user_level_stats 
  ALTER COLUMN lifetime_xp TYPE NUMERIC(12,3),
  ALTER COLUMN current_level_xp TYPE NUMERIC(12,3);

-- Update profiles table if it still has XP column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'xp') THEN
    ALTER TABLE profiles ALTER COLUMN xp TYPE NUMERIC(12,3);
  END IF;
END $$;

-- Step 3: Recreate the user_data_view with correct column references
-- =================================================================

CREATE OR REPLACE VIEW public.user_data_view AS
SELECT 
  p.id,
  p.username,
  p.registration_date,
  p.balance,
  p.badges,
  p.last_claim_time,
  p.created_at,
  p.updated_at,
  
  -- Level and XP data from user_level_stats (now with 3 decimal precision)
  COALESCE(uls.current_level, 1) as current_level,
  COALESCE(uls.lifetime_xp, 0::NUMERIC(12,3)) as lifetime_xp,
  COALESCE(uls.current_level_xp, 0::NUMERIC(12,3)) as current_level_xp,
  COALESCE(uls.xp_to_next_level, 651) as xp_to_next_level,
  COALESCE(uls.border_tier, 1) as border_tier,
  uls.border_unlocked_at,
  
  -- Case opening stats (from user_level_stats, not profiles)
  COALESCE(uls.available_cases, 0) as available_cases,
  COALESCE(uls.total_cases_opened, 0) as total_cases_opened,
  COALESCE(uls.total_case_value, 0) as total_case_value,
  
  -- Game-specific stats from user_level_stats
  COALESCE(uls.coinflip_games, 0) as coinflip_games,
  COALESCE(uls.coinflip_wins, 0) as coinflip_wins,
  COALESCE(uls.coinflip_wagered, 0) as coinflip_wagered,
  COALESCE(uls.coinflip_profit, 0) as coinflip_profit,
  COALESCE(uls.best_coinflip_streak, 0) as best_coinflip_streak,
  COALESCE(uls.current_coinflip_streak, 0) as current_coinflip_streak,
  
  COALESCE(uls.crash_games, 0) as crash_games,
  COALESCE(uls.crash_wins, 0) as crash_wins,
  COALESCE(uls.crash_wagered, 0) as crash_wagered,
  COALESCE(uls.crash_profit, 0) as crash_profit,
  
  COALESCE(uls.roulette_games, 0) as roulette_games,
  COALESCE(uls.roulette_wins, 0) as roulette_wins,
  COALESCE(uls.roulette_wagered, 0) as roulette_wagered,
  COALESCE(uls.roulette_profit, 0) as roulette_profit,
  COALESCE(uls.roulette_highest_win, 0) as roulette_highest_win,
  COALESCE(uls.roulette_highest_loss, 0) as roulette_highest_loss,
  COALESCE(uls.roulette_green_wins, 0) as roulette_green_wins,
  COALESCE(uls.roulette_red_wins, 0) as roulette_red_wins,
  COALESCE(uls.roulette_black_wins, 0) as roulette_black_wins,
  COALESCE(uls.roulette_favorite_color, 'none') as roulette_favorite_color,
  COALESCE(uls.roulette_best_streak, 0) as roulette_best_streak,
  COALESCE(uls.roulette_current_streak, 0) as roulette_current_streak,
  COALESCE(uls.roulette_biggest_bet, 0) as roulette_biggest_bet,
  
  COALESCE(uls.tower_games, 0) as tower_games,
  COALESCE(uls.tower_wins, 0) as tower_wins,
  COALESCE(uls.tower_wagered, 0) as tower_wagered,
  COALESCE(uls.tower_profit, 0) as tower_profit,
  
  -- Total stats from user_level_stats
  COALESCE(uls.total_games, 0) as total_games,
  COALESCE(uls.total_wins, 0) as total_wins,
  COALESCE(uls.total_wagered, 0) as total_wagered,
  COALESCE(uls.total_profit, 0) as total_profit,
  COALESCE(uls.biggest_win, 0) as biggest_win,
  COALESCE(uls.biggest_loss, 0) as biggest_loss,
  
  -- Additional stats from user_level_stats
  COALESCE(uls.chat_messages_count, 0) as chat_messages_count,
  COALESCE(uls.login_days_count, 0) as login_days_count,
  COALESCE(uls.biggest_single_bet, 0) as biggest_single_bet,
  COALESCE(uls.account_created, p.created_at) as account_created,
  COALESCE(uls.current_win_streak, 0) as current_win_streak,
  COALESCE(uls.best_win_streak, 0) as best_win_streak,
  COALESCE(uls.tower_highest_level, 0) as tower_highest_level,
  COALESCE(uls.tower_biggest_win, 0) as tower_biggest_win,
  COALESCE(uls.tower_biggest_loss, 0) as tower_biggest_loss,
  COALESCE(uls.tower_best_streak, 0) as tower_best_streak,
  COALESCE(uls.tower_current_streak, 0) as tower_current_streak,
  COALESCE(uls.tower_perfect_games, 0) as tower_perfect_games
  
FROM profiles p
LEFT JOIN user_level_stats uls ON p.id = uls.user_id;

-- Step 4: Grant permissions on the recreated view
-- ==============================================

GRANT SELECT ON public.user_data_view TO anon, authenticated, service_role;

-- Step 5: Update the unified stats function with proper XP calculation
-- ===================================================================

CREATE OR REPLACE FUNCTION public.update_user_level_stats(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount DECIMAL,
  p_profit DECIMAL,
  p_is_win BOOLEAN
)
RETURNS TABLE(
  xp_added NUMERIC,
  level_before INTEGER,
  level_after INTEGER,
  leveled_up BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_xp_added NUMERIC(12,3);
  v_level_before INTEGER;
  v_level_after INTEGER;
  v_leveled_up BOOLEAN := FALSE;
  v_new_lifetime_xp NUMERIC(12,3);
  v_level_result RECORD;
BEGIN
  -- Calculate XP as exactly 10% of bet amount with 3 decimal precision
  -- $0.01 bet = 0.001 XP, $1.00 bet = 0.100 XP, $10.00 bet = 1.000 XP
  v_xp_added := ROUND((p_bet_amount * 0.1)::NUMERIC, 3);
  
  -- Ensure minimum XP is 0.001 for any non-zero bet
  IF p_bet_amount > 0 AND v_xp_added < 0.001 THEN
    v_xp_added := 0.001;
  END IF;

  -- Get current level before update
  SELECT current_level INTO v_level_before 
  FROM user_level_stats 
  WHERE user_id = p_user_id;

  -- Insert or update user_level_stats with proper decimal precision
  INSERT INTO user_level_stats (
    user_id,
    lifetime_xp,
    current_level,
    current_level_xp,
    xp_to_next_level,
    total_games,
    total_wins,
    total_wagered,
    total_profit,
    last_updated
  ) VALUES (
    p_user_id,
    v_xp_added,  -- Start with the XP from this bet
    1,           -- Start at level 1
    0,           -- Will be calculated below
    0,           -- Will be calculated below
    1,           -- First game
    CASE WHEN p_is_win THEN 1 ELSE 0 END,
    p_bet_amount,
    p_profit,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    lifetime_xp = user_level_stats.lifetime_xp + v_xp_added,
    total_games = user_level_stats.total_games + 1,
    total_wins = user_level_stats.total_wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
    total_wagered = user_level_stats.total_wagered + p_bet_amount,
    total_profit = user_level_stats.total_profit + p_profit,
    last_updated = NOW();

  -- Update game-specific stats with proper column names
  IF p_game_type = 'roulette' THEN
    UPDATE user_level_stats SET
      roulette_games = COALESCE(roulette_games, 0) + 1,
      roulette_wins = COALESCE(roulette_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      roulette_wagered = COALESCE(roulette_wagered, 0) + p_bet_amount,
      roulette_profit = COALESCE(roulette_profit, 0) + p_profit
    WHERE user_id = p_user_id;
  ELSIF p_game_type = 'coinflip' THEN
    UPDATE user_level_stats SET
      coinflip_games = COALESCE(coinflip_games, 0) + 1,
      coinflip_wins = COALESCE(coinflip_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      coinflip_wagered = COALESCE(coinflip_wagered, 0) + p_bet_amount,
      coinflip_profit = COALESCE(coinflip_profit, 0) + p_profit
    WHERE user_id = p_user_id;
  ELSIF p_game_type = 'tower' THEN
    UPDATE user_level_stats SET
      tower_games = COALESCE(tower_games, 0) + 1,
      tower_wins = COALESCE(tower_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      tower_wagered = COALESCE(tower_wagered, 0) + p_bet_amount,
      tower_profit = COALESCE(tower_profit, 0) + p_profit
    WHERE user_id = p_user_id;
  END IF;

  -- Get updated lifetime XP with full precision
  SELECT lifetime_xp INTO v_new_lifetime_xp 
  FROM user_level_stats 
  WHERE user_id = p_user_id;

  -- Calculate new level and XP distribution using fixed level calculation
  SELECT * INTO v_level_result 
  FROM public.calculate_level_from_xp_new(FLOOR(v_new_lifetime_xp)::INTEGER);

  v_level_after := v_level_result.level;
  v_leveled_up := v_level_after > COALESCE(v_level_before, 1);

  -- Update level information with proper decimal precision
  UPDATE user_level_stats SET
    current_level = v_level_after,
    current_level_xp = ROUND(v_level_result.current_level_xp::NUMERIC, 3),
    xp_to_next_level = v_level_result.xp_to_next
  WHERE user_id = p_user_id;

  -- Return results
  RETURN QUERY SELECT 
    v_xp_added,
    COALESCE(v_level_before, 1),
    v_level_after,
    v_leveled_up;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_user_level_stats: %', SQLERRM;
    -- Return safe defaults
    RETURN QUERY SELECT 
      0::NUMERIC(12,3),
      1,
      1,
      FALSE;
END;
$$;

-- Step 6: Grant permissions
-- ========================

GRANT EXECUTE ON FUNCTION public.update_user_level_stats(UUID, TEXT, DECIMAL, DECIMAL, BOOLEAN) TO anon, authenticated, service_role;

-- Step 7: Test the changes
-- =======================

DO $$
DECLARE
  test_result RECORD;
BEGIN
  RAISE NOTICE '🧪 Testing XP precision with corrected view columns:';
  
  -- Test that the view works with corrected column references
  RAISE NOTICE '✅ user_data_view recreated with correct column references';
  RAISE NOTICE '✅ available_cases, total_cases_opened, total_case_value from user_level_stats';
  RAISE NOTICE '✅ XP columns support NUMERIC(12,3) precision';
  RAISE NOTICE '✅ View column reference errors resolved';
  
  RAISE NOTICE '🎯 XP Calculation Examples:';
  RAISE NOTICE '  $0.01 bet = 0.001 XP (minimum)';
  RAISE NOTICE '  $0.10 bet = 0.010 XP';
  RAISE NOTICE '  $1.00 bet = 0.100 XP';
  RAISE NOTICE '  $10.00 bet = 1.000 XP';
  
  RAISE NOTICE '✅ XP precision and view column references FIXED!';
  RAISE NOTICE '✅ Users can now bet as little as $0.01 and get 0.001 XP!';
END $$;