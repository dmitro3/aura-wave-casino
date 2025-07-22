-- Add new columns to support coinflip streak games
ALTER TABLE public.game_history 
ADD COLUMN IF NOT EXISTS streak_length INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_multiplier NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'completed'; -- 'continue', 'cash_out', 'lost'

-- Add streak data to live_bet_feed
ALTER TABLE public.live_bet_feed
ADD COLUMN IF NOT EXISTS streak_length INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'completed';

-- Update live feed trigger function to include streak data
CREATE OR REPLACE FUNCTION public.add_to_live_feed(
  p_user_id uuid, 
  p_game_type text, 
  p_bet_amount numeric, 
  p_result text, 
  p_profit numeric, 
  p_multiplier numeric DEFAULT NULL::numeric, 
  p_game_data jsonb DEFAULT NULL::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  user_name TEXT;
  streak_len INTEGER := 0;
  game_action TEXT := 'completed';
BEGIN
  -- Get username
  SELECT username INTO user_name
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Extract streak data from game_data if available
  IF p_game_data IS NOT NULL THEN
    streak_len := COALESCE((p_game_data->>'streak_length')::INTEGER, 0);
    game_action := COALESCE(p_game_data->>'action', 'completed');
  END IF;
  
  -- Insert into live feed
  INSERT INTO public.live_bet_feed (
    user_id, username, game_type, bet_amount, result, profit, multiplier, game_data, streak_length, action
  ) VALUES (
    p_user_id, user_name, p_game_type, p_bet_amount, p_result, p_profit, p_multiplier, p_game_data, streak_len, game_action
  );
END;
$function$;