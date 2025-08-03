-- Migration: Enhance stats tracking in update_user_level_stats function
-- This adds tracking for biggest_single_bet, biggest_win, biggest_loss, and streak tracking

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
  v_current_streak INTEGER;
  v_best_streak INTEGER;
  v_current_coinflip_streak INTEGER;
  v_best_coinflip_streak INTEGER;
  v_roulette_best_streak INTEGER;
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

  -- Insert or update user_level_stats with enhanced tracking
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
    biggest_win,
    biggest_loss,
    biggest_single_bet,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_xp_added,  -- Start with the XP from this bet
    1,           -- Start at level 1
    0,           -- Will be calculated below
    651,         -- Default XP to next level
    1,           -- First game
    CASE WHEN p_is_win THEN 1 ELSE 0 END,
    p_bet_amount,
    p_profit,
    CASE WHEN p_profit > 0 THEN p_profit ELSE 0 END,  -- Only positive profits count as wins
    CASE WHEN p_profit < 0 THEN p_profit ELSE 0 END,  -- Only negative profits count as losses
    p_bet_amount,  -- First bet is the biggest so far
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    lifetime_xp = user_level_stats.lifetime_xp + v_xp_added,
    total_games = user_level_stats.total_games + 1,
    total_wins = user_level_stats.total_wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
    total_wagered = user_level_stats.total_wagered + p_bet_amount,
    total_profit = user_level_stats.total_profit + p_profit,
    biggest_win = GREATEST(user_level_stats.biggest_win, CASE WHEN p_profit > 0 THEN p_profit ELSE user_level_stats.biggest_win END),
    biggest_loss = LEAST(user_level_stats.biggest_loss, CASE WHEN p_profit < 0 THEN p_profit ELSE user_level_stats.biggest_loss END),
    biggest_single_bet = GREATEST(user_level_stats.biggest_single_bet, p_bet_amount),
    updated_at = NOW();

  -- Update game-specific stats with enhanced tracking
  IF p_game_type = 'roulette' THEN
    -- Get current roulette streak for roulette games
    SELECT COALESCE(roulette_best_streak, 0) INTO v_roulette_best_streak
    FROM user_level_stats WHERE user_id = p_user_id;
    
    UPDATE user_level_stats SET
      roulette_games = COALESCE(roulette_games, 0) + 1,
      roulette_wins = COALESCE(roulette_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      roulette_wagered = COALESCE(roulette_wagered, 0) + p_bet_amount,
      roulette_profit = COALESCE(roulette_profit, 0) + p_profit,
      roulette_highest_win = GREATEST(COALESCE(roulette_highest_win, 0), CASE WHEN p_profit > 0 THEN p_profit ELSE COALESCE(roulette_highest_win, 0) END),
      roulette_biggest_bet = GREATEST(COALESCE(roulette_biggest_bet, 0), p_bet_amount),
      -- Note: Streak tracking for roulette would require more complex logic to track consecutive wins
      -- For now, we'll keep the existing streak value
      roulette_best_streak = GREATEST(COALESCE(roulette_best_streak, 0), v_roulette_best_streak)
    WHERE user_id = p_user_id;
    
  ELSIF p_game_type = 'coinflip' THEN
    -- Get current coinflip streak values
    SELECT COALESCE(current_coinflip_streak, 0), COALESCE(best_coinflip_streak, 0) 
    INTO v_current_coinflip_streak, v_best_coinflip_streak
    FROM user_level_stats WHERE user_id = p_user_id;
    
    -- Update coinflip streak
    IF p_is_win THEN
      v_current_coinflip_streak := v_current_coinflip_streak + 1;
      v_best_coinflip_streak := GREATEST(v_best_coinflip_streak, v_current_coinflip_streak);
    ELSE
      v_current_coinflip_streak := 0;
    END IF;
    
    UPDATE user_level_stats SET
      coinflip_games = COALESCE(coinflip_games, 0) + 1,
      coinflip_wins = COALESCE(coinflip_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      coinflip_wagered = COALESCE(coinflip_wagered, 0) + p_bet_amount,
      coinflip_profit = COALESCE(coinflip_profit, 0) + p_profit,
      current_coinflip_streak = v_current_coinflip_streak,
      best_coinflip_streak = v_best_coinflip_streak
    WHERE user_id = p_user_id;
    
  ELSIF p_game_type = 'tower' THEN
    UPDATE user_level_stats SET
      tower_games = COALESCE(tower_games, 0) + 1,
      tower_wins = COALESCE(tower_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      tower_wagered = COALESCE(tower_wagered, 0) + p_bet_amount,
      tower_profit = COALESCE(tower_profit, 0) + p_profit
    WHERE user_id = p_user_id;
  END IF;

  -- Update overall win streak tracking
  SELECT COALESCE(current_win_streak, 0), COALESCE(best_win_streak, 0) 
  INTO v_current_streak, v_best_streak
  FROM user_level_stats WHERE user_id = p_user_id;
  
  IF p_is_win THEN
    v_current_streak := v_current_streak + 1;
    v_best_streak := GREATEST(v_best_streak, v_current_streak);
  ELSE
    v_current_streak := 0;
  END IF;
  
  UPDATE user_level_stats SET
    current_win_streak = v_current_streak,
    best_win_streak = v_best_streak
  WHERE user_id = p_user_id;

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
    RAISE LOG 'Error in enhanced update_user_level_stats: %', SQLERRM;
    -- Return safe defaults
    RETURN QUERY SELECT 
      0::NUMERIC(12,3),
      1,
      1,
      FALSE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_level_stats(UUID, TEXT, DECIMAL, DECIMAL, BOOLEAN) TO anon, authenticated, service_role;