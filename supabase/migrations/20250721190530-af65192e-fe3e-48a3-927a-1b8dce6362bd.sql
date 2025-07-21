-- Update the check constraint to include 'tower' game type
ALTER TABLE public.live_bet_feed 
DROP CONSTRAINT live_bet_feed_game_type_check;

ALTER TABLE public.live_bet_feed 
ADD CONSTRAINT live_bet_feed_game_type_check 
CHECK (game_type = ANY (ARRAY['crash'::text, 'coinflip'::text, 'tower'::text]));