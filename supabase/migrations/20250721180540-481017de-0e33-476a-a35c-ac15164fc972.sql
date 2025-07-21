-- Create trigger to automatically add game history to live feed
CREATE OR REPLACE FUNCTION public.trigger_add_to_live_feed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Add XP for wagering (1 XP per $1 wagered)
  PERFORM public.add_xp_and_check_levelup(NEW.user_id, NEW.bet_amount::INTEGER);
  
  -- Add to live feed
  PERFORM public.add_to_live_feed(
    NEW.user_id,
    NEW.game_type,
    NEW.bet_amount,
    NEW.result,
    NEW.profit,
    CASE 
      WHEN NEW.game_data ? 'multiplier' THEN (NEW.game_data->>'multiplier')::NUMERIC
      ELSE NULL
    END,
    NEW.game_data
  );
  
  RETURN NEW;
END;
$function$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_game_history_to_live_feed ON public.game_history;

-- Create trigger on game_history
CREATE TRIGGER trigger_game_history_to_live_feed
  AFTER INSERT ON public.game_history
  FOR EACH ROW EXECUTE FUNCTION public.trigger_add_to_live_feed();