-- Fix all issues at once:

-- 1. DROP ALL EXISTING TRIGGERS to prevent duplicates
DROP TRIGGER IF EXISTS trigger_game_history_to_live_feed ON public.game_history;
DROP TRIGGER IF EXISTS add_coinflip_to_live_feed_trigger ON public.game_history;

-- 2. Fix the all-in betting issue in the edge function by handling the exact balance case
-- Update the edge function to handle exact balance matches properly

-- 3. Create SINGLE trigger that handles all games properly
CREATE OR REPLACE FUNCTION public.handle_game_completion()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  streak_len INTEGER := 0;
  game_action TEXT := 'completed';
BEGIN
  -- Always add XP for wagering regardless of game type
  PERFORM public.add_xp_and_check_levelup(NEW.user_id, NEW.bet_amount::INTEGER);
  
  -- For coinflip games, ONLY add to live feed for concluded streaks (losses or cash-outs)
  -- NOT for intermediate wins (continue actions)
  IF NEW.game_type = 'coinflip' THEN
    IF NEW.game_data IS NOT NULL THEN
      game_action := COALESCE(NEW.game_data->>'action', 'completed');
      
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
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- For other games (crash, tower, roulette), add to live feed normally
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'pg_temp';

-- 4. Create SINGLE trigger to prevent duplicates
CREATE TRIGGER handle_game_completion_trigger
  AFTER INSERT ON public.game_history
  FOR EACH ROW EXECUTE FUNCTION public.handle_game_completion();

-- 5. Clean up any remaining duplicate entries from live feed
DELETE FROM public.live_bet_feed 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY user_id, game_type, bet_amount, result, action, created_at 
      ORDER BY id
    ) as rn
    FROM public.live_bet_feed 
    WHERE game_type = 'coinflip'
  ) t WHERE rn > 1
);

-- 6. Drop the old functions that are no longer needed
DROP FUNCTION IF EXISTS public.add_coinflip_to_live_feed();
DROP FUNCTION IF EXISTS public.trigger_add_to_live_feed();