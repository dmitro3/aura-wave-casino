-- Modify the coinflip trigger to NOT add to live feed automatically
CREATE OR REPLACE FUNCTION public.add_coinflip_to_live_feed()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  streak_len INTEGER := 0;
  game_action TEXT := 'completed';
BEGIN
  -- For coinflip games, we completely skip adding to live feed
  -- The client will handle this manually for losses and cash outs only
  IF NEW.game_type = 'coinflip' THEN
    -- Still add XP for wagering
    PERFORM public.add_xp_and_check_levelup(NEW.user_id, NEW.bet_amount::INTEGER);
    RETURN NEW;
  END IF;
  
  -- For other games, use the existing trigger logic
  PERFORM public.add_xp_and_check_levelup(NEW.user_id, NEW.bet_amount::INTEGER);
  
  -- Get username
  SELECT username INTO user_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Extract streak data from game_data if available
  IF NEW.game_data IS NOT NULL THEN
    streak_len := COALESCE((NEW.game_data->>'streak_length')::INTEGER, 0);
    game_action := COALESCE(NEW.game_data->>'action', 'completed');
  END IF;
  
  -- Insert into live feed
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;