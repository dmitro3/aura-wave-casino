-- Add 'roulette' to live_bet_feed game_type constraint
ALTER TABLE public.live_bet_feed 
DROP CONSTRAINT live_bet_feed_game_type_check;

ALTER TABLE public.live_bet_feed 
ADD CONSTRAINT live_bet_feed_game_type_check 
CHECK (game_type = ANY (ARRAY['crash'::text, 'coinflip'::text, 'tower'::text, 'roulette'::text]));