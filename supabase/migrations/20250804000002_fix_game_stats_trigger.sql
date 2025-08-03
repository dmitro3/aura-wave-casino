-- Fix handle_game_completion trigger to properly update game stats
BEGIN;

-- Replace the handle_game_completion function to properly update game stats
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
BEGIN
  -- Get username for live feed
  SELECT username INTO user_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Update game stats and handle leveling using the comprehensive function
  -- This function handles XP, leveling, and ALL game-specific stats
  SELECT * INTO stats_result 
  FROM public.update_user_stats_and_level(
    NEW.user_id, 
    NEW.game_type, 
    NEW.bet_amount, 
    NEW.result, 
    NEW.profit,
    COALESCE((NEW.game_data->>'streak_length')::INTEGER, 0)
  );
  
  RAISE NOTICE '🎮 Game stats updated for user % - Game: %, Result: %, Profit: %', 
    NEW.user_id, NEW.game_type, NEW.result, NEW.profit;
  
  -- Handle live feed insertion
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
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_game_completion() TO anon, authenticated, service_role;

-- Log success
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Game stats trigger fixed - now calls update_user_stats_and_level()';
END $$;

COMMIT;