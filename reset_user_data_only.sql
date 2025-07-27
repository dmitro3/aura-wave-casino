-- Reset User Data Only - Preserves Site Functionality
-- This script deletes all user-related data but keeps games, functions, and site features intact

-- Disable triggers temporarily to avoid conflicts
SET session_replication_role = replica;

-- Clear user authentication data
DELETE FROM auth.users;

-- Clear user profiles
DELETE FROM public.profiles;

-- Clear user statistics and level data
DELETE FROM public.user_level_stats;

-- Clear user achievements (both unlocked and claimed)
DELETE FROM public.unlocked_achievements;
DELETE FROM public.user_achievements;

-- Clear user notifications
DELETE FROM public.notifications;

-- Clear user chat messages
DELETE FROM public.chat_messages;

-- Clear user bet history
DELETE FROM public.game_history;

-- Clear user live bet feeds
DELETE FROM public.live_bet_feed;

-- Clear user crash bets
DELETE FROM public.crash_bets;

-- Clear user roulette bets
DELETE FROM public.roulette_bets;

-- Clear user tips
DELETE FROM public.tips;

-- Clear user tower games
DELETE FROM public.tower_games;

-- Clear user case rewards
DELETE FROM public.case_rewards;

-- Clear user rate limits
DELETE FROM public.user_rate_limits;

-- Clear user daily logins
DELETE FROM public.user_daily_logins;

-- Clear user audit logs
DELETE FROM public.audit_logs;

-- Clear user game stats
DELETE FROM public.game_stats;

-- Clear user roulette client seeds
DELETE FROM public.roulette_client_seeds;

-- Clear user roulette results
DELETE FROM public.roulette_results;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Show confirmation
SELECT 
  'User data reset complete!' as status,
  'All user accounts, stats, bets, achievements, and history have been deleted.' as message,
  'Site functionality, games, and system data remain intact.' as note;

-- Verify cleanup
SELECT 
  'Remaining data check:' as info,
  (SELECT COUNT(*) FROM auth.users) as remaining_users,
  (SELECT COUNT(*) FROM public.profiles) as remaining_profiles,
  (SELECT COUNT(*) FROM public.user_level_stats) as remaining_stats,
  (SELECT COUNT(*) FROM public.game_history) as remaining_game_history,
  (SELECT COUNT(*) FROM public.chat_messages) as remaining_chat_messages;