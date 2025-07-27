-- Performance optimization migration
-- Add missing indexes for faster queries

-- Profiles table optimizations
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- User level stats optimizations
CREATE INDEX IF NOT EXISTS idx_user_level_stats_user_id ON user_level_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_level_stats_current_level ON user_level_stats(current_level);

-- Notifications optimizations
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON notifications(user_id, is_read);

-- Chat messages optimizations
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- Live bet feed optimizations
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_created_at ON live_bet_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_game_type ON live_bet_feed(game_type);

-- Game history optimizations
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON game_history(game_type);

-- Crash rounds optimizations
CREATE INDEX IF NOT EXISTS idx_crash_rounds_status ON crash_rounds(status);
CREATE INDEX IF NOT EXISTS idx_crash_rounds_created_at ON crash_rounds(created_at DESC);

-- Crash bets optimizations
CREATE INDEX IF NOT EXISTS idx_crash_bets_round_id ON crash_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_crash_bets_user_id ON crash_bets(user_id);

-- Roulette optimizations
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_status ON roulette_rounds(status);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_created_at ON roulette_rounds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_round_id ON roulette_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_user_id ON roulette_bets(user_id);

-- Tips optimizations
CREATE INDEX IF NOT EXISTS idx_tips_to_user_id ON tips(to_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_from_user_id ON tips(from_user_id);

-- Tower games optimizations
CREATE INDEX IF NOT EXISTS idx_tower_games_user_id ON tower_games(user_id);
CREATE INDEX IF NOT EXISTS idx_tower_games_status ON tower_games(status);

-- User achievements optimizations
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

-- Case rewards optimizations
CREATE INDEX IF NOT EXISTS idx_case_rewards_user_id ON case_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_case_rewards_rarity ON case_rewards(rarity);

-- User rate limits optimizations
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_user_id ON user_rate_limits(user_id);

-- User daily logins optimizations
CREATE INDEX IF NOT EXISTS idx_user_daily_logins_user_id ON user_daily_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_logins_login_date ON user_daily_logins(login_date);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_level_stats_user_level ON user_level_stats(user_id, current_level);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_user_type ON game_history(user_id, game_type, created_at DESC);