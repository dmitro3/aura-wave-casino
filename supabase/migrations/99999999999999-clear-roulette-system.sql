-- Clear Roulette System Migration
-- This removes all roulette-related tables and data

-- Drop roulette-specific tables
DROP TABLE IF EXISTS public.roulette_bets CASCADE;
DROP TABLE IF EXISTS public.roulette_results CASCADE; 
DROP TABLE IF EXISTS public.roulette_rounds CASCADE;

-- Remove roulette columns from user_stats if they exist
ALTER TABLE public.user_stats 
DROP COLUMN IF EXISTS roulette_games,
DROP COLUMN IF EXISTS roulette_wins,
DROP COLUMN IF EXISTS roulette_wagered,
DROP COLUMN IF EXISTS roulette_profit;

-- Note: This completely clears the roulette system
-- Ready for fresh implementation