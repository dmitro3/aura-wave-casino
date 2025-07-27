-- Add 'roulette' to live_bet_feed game_type constraint
ALTER TABLE public.live_bet_feed 
DROP CONSTRAINT live_bet_feed_game_type_check;

ALTER TABLE public.live_bet_feed 
ADD CONSTRAINT live_bet_feed_game_type_check 
CHECK (game_type = ANY (ARRAY['crash'::text, 'coinflip'::text, 'tower'::text, 'roulette'::text]));

-- Add columns needed for roulette game type
ALTER TABLE public.live_bet_feed 
ADD COLUMN IF NOT EXISTS bet_color TEXT;

ALTER TABLE public.live_bet_feed 
ADD COLUMN IF NOT EXISTS round_id UUID;

-- Add index for efficient roulette bet queries
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_roulette 
ON public.live_bet_feed(game_type, round_id) 
WHERE game_type = 'roulette';