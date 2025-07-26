-- Add reel_position to roulette_rounds for cross-user synchronization
ALTER TABLE public.roulette_rounds 
ADD COLUMN reel_position NUMERIC DEFAULT 0;