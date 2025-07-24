-- Fix the case creation system to use 'pending' rarity for unopened cases
CREATE OR REPLACE FUNCTION public.update_user_stats_and_level(p_user_id uuid, p_game_type text, p_bet_amount numeric, p_result text, p_profit numeric, p_streak_length integer DEFAULT 0)
RETURNS TABLE(leveled_up boolean, new_level integer, old_level integer, cases_earned integer, border_tier_changed boolean, new_border_tier integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  current_stats RECORD;
  new_xp INTEGER;
  level_calc RECORD;
  old_level_val INTEGER;
  new_level_val INTEGER;
  old_border_tier INTEGER;
  new_border_tier_val INTEGER;
  cases_to_add INTEGER := 0;
  did_level_up BOOLEAN := false;
  border_changed BOOLEAN := false;
  i INTEGER;
  is_win BOOLEAN;
  case_rarity TEXT;
BEGIN
  -- Determine if this is a win
  is_win := (p_result = 'win' OR p_result = 'cash_out') AND p_profit > 0;
  
  -- Get current stats
  SELECT * INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  -- If no stats exist, create them
  IF current_stats IS NULL THEN
    INSERT INTO public.user_level_stats (user_id) VALUES (p_user_id);
    SELECT * INTO current_stats FROM public.user_level_stats WHERE user_id = p_user_id;
  END IF;
  
  old_level_val := current_stats.current_level;
  old_border_tier := current_stats.border_tier;
  
  -- Calculate new XP (1 XP per $1 wagered)
  new_xp := current_stats.lifetime_xp + p_bet_amount::INTEGER;
  
  -- Calculate new level using improved function
  SELECT * INTO level_calc FROM public.calculate_level_from_xp_new(new_xp);
  new_level_val := level_calc.level;
  
  -- Check if leveled up and calculate cases (ONE CASE PER LEVEL UP, max level 1000)
  IF new_level_val > old_level_val AND new_level_val <= 1000 THEN
    did_level_up := true;
    
    -- Calculate cases earned (ONE per level up from old_level + 1 to new_level)
    FOR i IN (old_level_val + 1)..new_level_val LOOP
      cases_to_add := cases_to_add + 1;
      
      -- Determine case rarity based on level for display purposes only
      -- Every 25 levels: Legendary
      -- Every 10 levels (but not 25): Epic  
      -- All other levels: Common
      IF i % 25 = 0 THEN
        case_rarity := 'legendary';
      ELSIF i % 10 = 0 THEN
        case_rarity := 'epic';
      ELSE
        case_rarity := 'common';
      END IF;
      
      -- Create case reward entry with 'pending' rarity (actual rarity determined on opening)
      INSERT INTO public.case_rewards (user_id, level_unlocked, rarity, reward_amount)
      VALUES (p_user_id, i, 'pending', 0);
      
      -- Create individual notification for each case
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        p_user_id,
        'level_reward_case',
        'Level ' || i || ' Case Earned!',
        'You''ve unlocked a ' || case_rarity || ' case for reaching level ' || i || '!',
        jsonb_build_object(
          'level', i,
          'case_rarity', case_rarity,
          'old_level', old_level_val,
          'new_level', new_level_val
        )
      );
    END LOOP;
  END IF;
  
  -- Calculate new border tier
  SELECT tier INTO new_border_tier_val
  FROM public.border_tiers
  WHERE new_level_val >= min_level AND new_level_val <= max_level;
  
  IF new_border_tier_val IS NULL THEN
    new_border_tier_val := old_border_tier;
  END IF;
  
  border_changed := new_border_tier_val != old_border_tier;
  
  -- Update comprehensive stats
  UPDATE public.user_level_stats 
  SET 
    -- Level data
    current_level = new_level_val,
    lifetime_xp = new_xp,
    current_level_xp = level_calc.current_level_xp,
    xp_to_next_level = level_calc.xp_to_next,
    
    -- Border data
    border_tier = new_border_tier_val,
    border_unlocked_at = CASE 
      WHEN border_changed THEN now() 
      ELSE border_unlocked_at 
    END,
    
    -- Case data
    available_cases = available_cases + cases_to_add,
    
    -- Game-specific stats
    coinflip_games = CASE WHEN p_game_type = 'coinflip' THEN coinflip_games + 1 ELSE coinflip_games END,
    coinflip_wins = CASE WHEN p_game_type = 'coinflip' AND is_win THEN coinflip_wins + 1 ELSE coinflip_wins END,
    coinflip_wagered = CASE WHEN p_game_type = 'coinflip' THEN coinflip_wagered + p_bet_amount ELSE coinflip_wagered END,
    coinflip_profit = CASE WHEN p_game_type = 'coinflip' THEN coinflip_profit + p_profit ELSE coinflip_profit END,
    
    crash_games = CASE WHEN p_game_type = 'crash' THEN crash_games + 1 ELSE crash_games END,
    crash_wins = CASE WHEN p_game_type = 'crash' AND is_win THEN crash_wins + 1 ELSE crash_wins END,
    crash_wagered = CASE WHEN p_game_type = 'crash' THEN crash_wagered + p_bet_amount ELSE crash_wagered END,
    crash_profit = CASE WHEN p_game_type = 'crash' THEN crash_profit + p_profit ELSE crash_profit END,
    
    roulette_games = CASE WHEN p_game_type = 'roulette' THEN roulette_games + 1 ELSE roulette_games END,
    roulette_wins = CASE WHEN p_game_type = 'roulette' AND is_win THEN roulette_wins + 1 ELSE roulette_wins END,
    roulette_wagered = CASE WHEN p_game_type = 'roulette' THEN roulette_wagered + p_bet_amount ELSE roulette_wagered END,
    roulette_profit = CASE WHEN p_game_type = 'roulette' THEN roulette_profit + p_profit ELSE roulette_profit END,
    
    tower_games = CASE WHEN p_game_type = 'tower' THEN tower_games + 1 ELSE tower_games END,
    tower_wins = CASE WHEN p_game_type = 'tower' AND is_win THEN tower_wins + 1 ELSE tower_wins END,
    tower_wagered = CASE WHEN p_game_type = 'tower' THEN tower_wagered + p_bet_amount ELSE tower_wagered END,
    tower_profit = CASE WHEN p_game_type = 'tower' THEN tower_profit + p_profit ELSE tower_profit END,
    
    -- Overall stats
    total_games = total_games + 1,
    total_wins = CASE WHEN is_win THEN total_wins + 1 ELSE total_wins END,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    
    -- Streak tracking for coinflip
    current_coinflip_streak = CASE 
      WHEN p_game_type = 'coinflip' AND is_win THEN current_coinflip_streak + 1
      WHEN p_game_type = 'coinflip' AND NOT is_win THEN 0
      ELSE current_coinflip_streak
    END,
    best_coinflip_streak = CASE 
      WHEN p_game_type = 'coinflip' AND is_win AND (current_coinflip_streak + 1) > best_coinflip_streak 
      THEN current_coinflip_streak + 1
      ELSE best_coinflip_streak
    END,
    
    -- Win/loss tracking
    biggest_win = CASE WHEN p_profit > biggest_win THEN p_profit ELSE biggest_win END,
    biggest_loss = CASE WHEN p_profit < 0 AND ABS(p_profit) > biggest_loss THEN ABS(p_profit) ELSE biggest_loss END,
    
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Create general level up notification (ONLY if user leveled up)
  IF did_level_up THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      p_user_id,
      'level_up',
      'Level Up!',
      'Congratulations! You reached level ' || new_level_val || '!',
      jsonb_build_object(
        'old_level', old_level_val,
        'new_level', new_level_val,
        'border_changed', border_changed,
        'new_border_tier', new_border_tier_val,
        'cases_earned', cases_to_add
      )
    );
  END IF;
  
  RETURN QUERY SELECT 
    did_level_up, 
    new_level_val, 
    old_level_val, 
    cases_to_add, 
    border_changed, 
    new_border_tier_val;
END;
$function$;

-- Fix existing cases that have rarity but haven't been opened (set them back to pending)
UPDATE case_rewards 
SET rarity = 'pending', reward_amount = 0 
WHERE opened_at IS NULL AND rarity != 'pending';