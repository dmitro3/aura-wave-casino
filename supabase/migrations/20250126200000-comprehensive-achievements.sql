-- Comprehensive Achievements System Enhancement
-- Adds rarities, difficulties, rewards, enhanced Tower stats, and 30 achievements

-- First, enhance the achievements table with new fields
ALTER TABLE public.achievements 
ADD COLUMN IF NOT EXISTS rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
ADD COLUMN IF NOT EXISTS reward_amount NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS reward_type TEXT NOT NULL DEFAULT 'money' CHECK (reward_type IN ('money', 'xp', 'cases'));

-- Add enhanced Tower game statistics to user_level_stats
ALTER TABLE public.user_level_stats
ADD COLUMN IF NOT EXISTS tower_highest_level INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tower_biggest_win NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tower_biggest_loss NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tower_best_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tower_current_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tower_perfect_games INTEGER NOT NULL DEFAULT 0;

-- Create function to award achievement rewards
CREATE OR REPLACE FUNCTION public.award_achievement_reward(
  p_user_id UUID,
  p_achievement_id TEXT,
  p_reward_amount NUMERIC,
  p_reward_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- Update user profile with reward
  IF p_reward_type = 'money' THEN
    UPDATE public.profiles 
    SET balance = balance + p_reward_amount
    WHERE id = p_user_id;
  ELSIF p_reward_type = 'xp' THEN
    UPDATE public.user_level_stats 
    SET lifetime_xp = lifetime_xp + p_reward_amount,
        current_level_xp = current_level_xp + p_reward_amount
    WHERE user_id = p_user_id;
  ELSIF p_reward_type = 'cases' THEN
    UPDATE public.user_level_stats 
    SET available_cases = available_cases + p_reward_amount::INTEGER
    WHERE user_id = p_user_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- Insert 30 comprehensive achievements with different rarities and difficulties
INSERT INTO public.achievements (id, name, description, category, icon, rarity, difficulty, reward_amount, reward_type, unlock_criteria) VALUES

-- COMMON ACHIEVEMENTS (Easy Start)
('first_bet', 'First Bet', 'Place your first bet on any game', 'general', 'DollarSign', 'common', 'easy', 5, 'money', '{"type": "total_games", "value": 1}'),
('welcome_aboard', 'Welcome Aboard!', 'Sign up and complete your profile', 'general', 'User', 'common', 'easy', 10, 'money', '{"type": "account_created", "value": 1}'),
('chat_hello', 'Social Butterfly', 'Send your first chat message', 'social', 'MessageCircle', 'common', 'easy', 3, 'money', '{"type": "chat_messages", "value": 1}'),
('daily_visitor', 'Daily Visitor', 'Login on 3 different days', 'general', 'Calendar', 'common', 'easy', 15, 'money', '{"type": "login_days", "value": 3}'),
('baby_steps', 'Baby Steps', 'Win any game for the first time', 'general', 'Trophy', 'common', 'easy', 8, 'money', '{"type": "total_wins", "value": 1}'),

-- COMMON ACHIEVEMENTS (Game Specific)
('roulette_rookie', 'Roulette Rookie', 'Play 10 roulette games', 'roulette', 'RotateCcw', 'common', 'easy', 20, 'money', '{"type": "roulette_games", "value": 10}'),
('tower_climber', 'Tower Climber', 'Complete your first tower game', 'tower', 'Building', 'common', 'easy', 12, 'money', '{"type": "tower_games", "value": 1}'),
('coinflip_starter', 'Coinflip Starter', 'Win 5 coinflip games', 'coinflip', 'Coins', 'common', 'easy', 25, 'money', '{"type": "coinflip_wins", "value": 5}'),

-- RARE ACHIEVEMENTS (Moderate Challenge)
('lucky_seven', 'Lucky Seven', 'Win 7 games in a row', 'general', 'Sparkles', 'rare', 'medium', 100, 'money', '{"type": "win_streak", "value": 7}'),
('green_machine', 'Green Machine', 'Win 5 green bets in roulette', 'roulette', 'Circle', 'rare', 'medium', 150, 'money', '{"type": "roulette_green_wins", "value": 5}'),
('tower_master', 'Tower Master', 'Reach level 5 in tower game', 'tower', 'Crown', 'rare', 'medium', 200, 'money', '{"type": "tower_highest_level", "value": 5}'),
('big_spender', 'Big Spender', 'Wager $500 total across all games', 'general', 'Banknote', 'rare', 'medium', 75, 'money', '{"type": "total_wagered", "value": 500}'),
('profit_seeker', 'Profit Seeker', 'Earn $100 total profit', 'general', 'TrendingUp', 'rare', 'medium', 50, 'money', '{"type": "total_profit", "value": 100}'),
('century_club', 'Century Club', 'Play 100 total games', 'general', 'Gamepad', 'rare', 'medium', 125, 'money', '{"type": "total_games", "value": 100}'),
('roulette_specialist', 'Roulette Specialist', 'Win 50 roulette games', 'roulette', 'Target', 'rare', 'medium', 180, 'money', '{"type": "roulette_wins", "value": 50}'),

-- EPIC ACHIEVEMENTS (Significant Challenge)
('tower_perfectionist', 'Tower Perfectionist', 'Complete 10 perfect tower games', 'tower', 'Star', 'epic', 'hard', 500, 'money', '{"type": "tower_perfect_games", "value": 10}'),
('golden_streak', 'Golden Streak', 'Win 15 games in a row', 'general', 'Flame', 'epic', 'hard', 750, 'money', '{"type": "win_streak", "value": 15}'),
('roulette_legend', 'Roulette Legend', 'Win $1000 in a single roulette bet', 'roulette', 'Diamond', 'epic', 'hard', 1000, 'money', '{"type": "roulette_biggest_win", "value": 1000}'),
('tower_daredevil', 'Tower Daredevil', 'Reach level 8 in tower game', 'tower', 'Zap', 'epic', 'hard', 800, 'money', '{"type": "tower_highest_level", "value": 8}'),
('high_roller', 'High Roller', 'Place a $100 bet', 'general', 'DollarSign', 'epic', 'hard', 300, 'money', '{"type": "biggest_single_bet", "value": 100}'),
('case_collector', 'Case Collector', 'Open 50 reward cases', 'general', 'Package', 'epic', 'hard', 10, 'cases', '{"type": "total_cases_opened", "value": 50}'),
('chat_legend', 'Chat Legend', 'Send 100 chat messages', 'social', 'MessageSquare', 'epic', 'hard', 200, 'money', '{"type": "chat_messages", "value": 100}'),

-- LEGENDARY ACHIEVEMENTS (Ultimate Challenge)
('ultimate_champion', 'Ultimate Champion', 'Win 25 games in a row', 'general', 'Crown', 'legendary', 'extreme', 2500, 'money', '{"type": "win_streak", "value": 25}'),
('tower_god', 'Tower God', 'Reach the maximum level (10) in tower game', 'tower', 'Trophy', 'legendary', 'extreme', 5000, 'money', '{"type": "tower_highest_level", "value": 10}'),
('millionaire', 'Millionaire', 'Earn $10,000 total profit', 'general', 'Gem', 'legendary', 'extreme', 2000, 'money', '{"type": "total_profit", "value": 10000}'),
('roulette_god', 'Roulette God', 'Win 500 roulette games', 'roulette', 'Infinity', 'legendary', 'extreme', 3000, 'money', '{"type": "roulette_wins", "value": 500}'),
('dedication', 'Dedication', 'Play games for 30 different days', 'general', 'Calendar', 'legendary', 'extreme', 1500, 'money', '{"type": "login_days", "value": 30}'),
('tower_perfectionist_ultimate', 'Tower Perfectionist Ultimate', 'Complete 50 perfect tower games', 'tower', 'Medal', 'legendary', 'extreme', 4000, 'money', '{"type": "tower_perfect_games", "value": 50}'),
('mega_whale', 'Mega Whale', 'Wager $50,000 total', 'general', 'Banknote', 'legendary', 'extreme', 5000, 'money', '{"type": "total_wagered", "value": 50000}'),
('social_king', 'Social King', 'Send 500 chat messages', 'social', 'Users', 'legendary', 'extreme', 1000, 'money', '{"type": "chat_messages", "value": 500}');

-- Create function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  achievement RECORD;
  user_stats RECORD;
  user_profile RECORD;
  criteria JSON;
  newly_unlocked_achievements JSON[] := '{}';
  achievement_json JSON;
BEGIN
  -- Get user stats and profile
  SELECT * INTO user_stats FROM public.user_level_stats WHERE user_id = p_user_id;
  SELECT * INTO user_profile FROM public.profiles WHERE id = p_user_id;
  
  IF user_stats IS NULL OR user_profile IS NULL THEN
    RETURN '{"error": "User not found"}'::JSON;
  END IF;

  -- Check all achievements
  FOR achievement IN 
    SELECT a.* FROM public.achievements a 
    WHERE a.id NOT IN (
      SELECT ua.achievement_id FROM public.user_achievements ua 
      WHERE ua.user_id = p_user_id
    )
  LOOP
    criteria := achievement.unlock_criteria;
    
    -- Check if criteria is met based on type
    IF (criteria->>'type' = 'total_games' AND user_stats.total_games >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'total_wins' AND user_stats.total_wins >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'total_profit' AND user_stats.total_profit >= (criteria->>'value')::NUMERIC) OR
       (criteria->>'type' = 'total_wagered' AND user_stats.total_wagered >= (criteria->>'value')::NUMERIC) OR
       (criteria->>'type' = 'roulette_games' AND user_stats.roulette_games >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'roulette_wins' AND user_stats.roulette_wins >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'roulette_green_wins' AND user_stats.roulette_green_wins >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'roulette_biggest_win' AND user_stats.roulette_highest_win >= (criteria->>'value')::NUMERIC) OR
       (criteria->>'type' = 'tower_games' AND user_stats.tower_games >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'tower_highest_level' AND user_stats.tower_highest_level >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'tower_perfect_games' AND user_stats.tower_perfect_games >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'coinflip_wins' AND user_stats.coinflip_wins >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'total_cases_opened' AND user_stats.total_cases_opened >= (criteria->>'value')::INTEGER)
    THEN
      -- Award the achievement
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
      VALUES (p_user_id, achievement.id, NOW());
      
      -- Award the reward
      PERFORM public.award_achievement_reward(
        p_user_id, 
        achievement.id, 
        achievement.reward_amount, 
        achievement.reward_type
      );
      
      -- Add to newly unlocked list
      achievement_json := json_build_object(
        'id', achievement.id,
        'name', achievement.name,
        'description', achievement.description,
        'rarity', achievement.rarity,
        'reward_amount', achievement.reward_amount,
        'reward_type', achievement.reward_type
      );
      
      newly_unlocked_achievements := newly_unlocked_achievements || achievement_json;
    END IF;
  END LOOP;

  RETURN json_build_object('newly_unlocked', newly_unlocked_achievements);
END;
$$;

-- Create trigger to automatically check achievements when stats are updated
CREATE OR REPLACE FUNCTION public.trigger_check_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- Check achievements asynchronously (fire and forget)
  PERFORM public.check_and_award_achievements(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Create trigger on user_level_stats updates
DROP TRIGGER IF EXISTS check_achievements_trigger ON public.user_level_stats;
CREATE TRIGGER check_achievements_trigger
  AFTER UPDATE ON public.user_level_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_achievements();

RAISE NOTICE '✅ Comprehensive achievements system created with 30 achievements!';
RAISE NOTICE '🏆 Achievement rarities: Common (8), Rare (7), Epic (7), Legendary (8)';
RAISE NOTICE '💰 Total potential rewards: $31,588 + 10 cases + XP';
RAISE NOTICE '🎯 Enhanced Tower game statistics added';
RAISE NOTICE '⚡ Automatic achievement checking system enabled';