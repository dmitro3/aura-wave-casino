-- Drop existing trigger and replace with the new one
DROP TRIGGER IF EXISTS trigger_add_to_live_feed ON public.game_history;
CREATE TRIGGER trigger_add_to_live_feed
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.add_coinflip_to_live_feed();