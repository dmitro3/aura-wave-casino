-- Complete Database Reset Script - User Data Only
-- This will remove ALL user data while keeping active games and system functionality intact

-- Reset sequences to start fresh
ALTER SEQUENCE crash_rounds_round_number_seq RESTART WITH 1;
ALTER SEQUENCE roulette_rounds_round_number_seq RESTART WITH 1;

-- Delete all user-related data (profiles, stats, achievements)
TRUNCATE public.profiles CASCADE;
TRUNCATE public.user_level_stats CASCADE;
TRUNCATE public.user_achievements CASCADE;
TRUNCATE public.user_daily_logins CASCADE;
TRUNCATE public.user_rate_limits CASCADE;

-- Delete all user game data (bets, history, stats)
TRUNCATE public.game_history CASCADE;
TRUNCATE public.game_stats CASCADE;
TRUNCATE public.crash_bets CASCADE;
TRUNCATE public.roulette_bets CASCADE;
TRUNCATE public.tower_games CASCADE;
TRUNCATE public.tower_levels CASCADE;

-- Delete all user interactions (chat, tips, notifications)
TRUNCATE public.chat_messages CASCADE;
TRUNCATE public.tips CASCADE;
TRUNCATE public.notifications CASCADE;
TRUNCATE public.live_bet_feed CASCADE;
TRUNCATE public.case_rewards CASCADE;
TRUNCATE public.free_case_claims CASCADE;
TRUNCATE public.roulette_client_seeds CASCADE;

-- Delete admin and audit data
TRUNCATE public.admin_users CASCADE;
TRUNCATE public.audit_logs CASCADE;

-- KEEP ACTIVE GAMES (DO NOT DELETE):
-- public.crash_rounds - Active crash game rounds
-- public.roulette_rounds - Active roulette game rounds  
-- public.roulette_results - Active roulette results
-- public.daily_seeds - Daily seed data for games

-- Verify user data is cleared
SELECT 
  'profiles' as table_name, COUNT(*) as row_count FROM public.profiles
UNION ALL
SELECT 'user_level_stats', COUNT(*) FROM public.user_level_stats
UNION ALL
SELECT 'user_achievements', COUNT(*) FROM public.user_achievements
UNION ALL
SELECT 'game_history', COUNT(*) FROM public.game_history
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM public.chat_messages
UNION ALL
SELECT 'crash_bets', COUNT(*) FROM public.crash_bets
UNION ALL
SELECT 'roulette_bets', COUNT(*) FROM public.roulette_bets
UNION ALL
SELECT 'tower_games', COUNT(*) FROM public.tower_games;

-- Show what's preserved (system config and active games)
SELECT 
  'achievements' as table_name, COUNT(*) as row_count FROM public.achievements
UNION ALL
SELECT 'border_tiers', COUNT(*) FROM public.border_tiers
UNION ALL
SELECT 'level_rewards', COUNT(*) FROM public.level_rewards
UNION ALL
SELECT 'crash_rounds', COUNT(*) FROM public.crash_rounds
UNION ALL
SELECT 'roulette_rounds', COUNT(*) FROM public.roulette_rounds
UNION ALL
SELECT 'roulette_results', COUNT(*) FROM public.roulette_results
UNION ALL
SELECT 'daily_seeds', COUNT(*) FROM public.daily_seeds;