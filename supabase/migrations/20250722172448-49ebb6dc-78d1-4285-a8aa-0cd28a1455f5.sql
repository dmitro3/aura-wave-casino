-- Fix the trigger to properly handle coinflip live feed for concluded streaks only
CREATE OR REPLACE FUNCTION public.add_coinflip_to_live_feed()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  streak_len INTEGER := 0;
  game_action TEXT := 'completed';
BEGIN
  -- Always add XP for wagering regardless of game type
  PERFORM public.add_xp_and_check_levelup(NEW.user_id, NEW.bet_amount::INTEGER);
  
  -- For coinflip games, only add to live feed if it's a concluded streak (loss or cash out)
  IF NEW.game_type = 'coinflip' THEN
    -- Only show concluded streaks: losses (action = 'lost') or cash outs (action = 'cash_out')
    IF NEW.game_data IS NOT NULL THEN
      game_action := COALESCE(NEW.game_data->>'action', 'completed');
      
      -- Only add to live feed for concluded streaks
      IF game_action = 'lost' OR game_action = 'cash_out' THEN
        -- Get username
        SELECT username INTO user_name
        FROM public.profiles
        WHERE id = NEW.user_id;
        
        streak_len := COALESCE((NEW.game_data->>'streak_length')::INTEGER, 0);
        
        -- Insert into live feed for concluded streaks only
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
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- For other games, add to live feed normally
  -- Get username
  SELECT username INTO user_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Extract streak data from game_data if available
  IF NEW.game_data IS NOT NULL THEN
    streak_len := COALESCE((NEW.game_data->>'streak_length')::INTEGER, 0);
    game_action := COALESCE(NEW.game_data->>'action', 'completed');
  END IF;
  
  -- Insert into live feed for non-coinflip games
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'pg_temp';