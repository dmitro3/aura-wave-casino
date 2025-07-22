-- Update the game completion trigger to use new leveling system

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS trigger_game_history_to_live_feed ON public.game_history;
DROP FUNCTION IF EXISTS public.trigger_add_to_live_feed();

-- Create new trigger function that uses the comprehensive stats system
CREATE OR REPLACE FUNCTION public.trigger_game_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  level_result RECORD;
BEGIN
  -- Update comprehensive user stats and handle leveling
  SELECT * INTO level_result 
  FROM public.update_user_stats_and_level(
    NEW.user_id,
    NEW.game_type,
    NEW.bet_amount,
    NEW.result,
    NEW.profit,
    COALESCE((NEW.game_data->>'streak_length')::INTEGER, 0)
  );
  
  -- For coinflip games, ONLY add to live feed for concluded streaks (losses or cash-outs)
  -- NOT for intermediate wins (continue actions)
  IF NEW.game_type = 'coinflip' THEN
    DECLARE
      game_action TEXT := COALESCE(NEW.game_data->>'action', 'completed');
      user_name TEXT;
      streak_len INTEGER := 0;
    BEGIN
      -- ONLY add to live feed for losses or cash-outs (NOT continue actions)
      IF game_action = 'lost' OR game_action = 'cash_out' THEN
        -- Get username
        SELECT username INTO user_name
        FROM public.profiles
        WHERE id = NEW.user_id;
        
        streak_len := COALESCE((NEW.game_data->>'streak_length')::INTEGER, 0);
        
        -- Insert ONCE into live feed for concluded streaks only
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
    END;
  ELSE
    -- For other games (crash, tower, roulette), add to live feed normally
    DECLARE
      user_name TEXT;
      streak_len INTEGER := 0;
      game_action TEXT := 'completed';
    BEGIN
      SELECT username INTO user_name
      FROM public.profiles
      WHERE id = NEW.user_id;
      
      IF NEW.game_data IS NOT NULL THEN
        streak_len := COALESCE((NEW.game_data->>'streak_length')::INTEGER, 0);
        game_action := COALESCE(NEW.game_data->>'action', 'completed');
      END IF;
      
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
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the new trigger
CREATE TRIGGER trigger_game_completion
  AFTER INSERT ON public.game_history
  FOR EACH ROW EXECUTE FUNCTION public.trigger_game_completion();