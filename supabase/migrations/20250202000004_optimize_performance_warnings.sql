-- Migration: Optimize Supabase Performance Warnings
-- Fixes: auth_rls_initplan, multiple_permissive_policies, duplicate_index

-- ===========================================
-- PART 1: Fix auth_rls_initplan warnings
-- Replace auth.uid() with (select auth.uid()) for better performance
-- ===========================================

-- Drop existing policies that need optimization
DROP POLICY IF EXISTS "Users can view own level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Users can update own level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Users can view own game stats" ON public.game_stats;
DROP POLICY IF EXISTS "Users can update own game stats" ON public.game_stats;
DROP POLICY IF EXISTS "Users can view own game history" ON public.game_history;
DROP POLICY IF EXISTS "Users can insert own game history" ON public.game_history;
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can update own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view own free case claims" ON public.free_case_claims;
DROP POLICY IF EXISTS "Users can insert own free case claims" ON public.free_case_claims;
DROP POLICY IF EXISTS "Users can view own level daily cases" ON public.level_daily_cases;
DROP POLICY IF EXISTS "Users can insert own level daily cases" ON public.level_daily_cases;
DROP POLICY IF EXISTS "Users can view own rate limits" ON public.user_rate_limits;
DROP POLICY IF EXISTS "Users can insert own rate limits" ON public.user_rate_limits;
DROP POLICY IF EXISTS "Users can update own rate limits" ON public.user_rate_limits;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own case rewards" ON public.case_rewards;
DROP POLICY IF EXISTS "Users can insert own case rewards" ON public.case_rewards;
DROP POLICY IF EXISTS "Public can view daily seeds" ON public.daily_seeds;
DROP POLICY IF EXISTS "Users can view own client seeds" ON public.roulette_client_seeds;
DROP POLICY IF EXISTS "Users can insert own client seeds" ON public.roulette_client_seeds;
DROP POLICY IF EXISTS "Users can view own client seeds" ON public.roulette_client_seeds;
DROP POLICY IF EXISTS "Users can update own client seeds" ON public.roulette_client_seeds;
DROP POLICY IF EXISTS "Users can view own pending deletions" ON public.pending_account_deletions;
DROP POLICY IF EXISTS "Users can insert own pending deletions" ON public.pending_account_deletions;
DROP POLICY IF EXISTS "Users can update own pending deletions" ON public.pending_account_deletions;
DROP POLICY IF EXISTS "Admin users can view all" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users can update all" ON public.admin_users;

-- Create optimized policies with (select auth.uid()) pattern

-- user_level_stats policies
CREATE POLICY "Users can view own level stats" ON public.user_level_stats
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own level stats" ON public.user_level_stats
  FOR UPDATE USING (user_id = (select auth.uid()));

-- game_stats policies  
CREATE POLICY "Users can view own game stats" ON public.game_stats
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own game stats" ON public.game_stats
  FOR UPDATE USING (user_id = (select auth.uid()));

-- game_history policies
CREATE POLICY "Users can view own game history" ON public.game_history
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own game history" ON public.game_history
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- user_achievements policies
CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own achievements" ON public.user_achievements
  FOR UPDATE USING (user_id = (select auth.uid()));

-- free_case_claims policies
CREATE POLICY "Users can view own free case claims" ON public.free_case_claims
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own free case claims" ON public.free_case_claims
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- level_daily_cases policies
CREATE POLICY "Users can view own level daily cases" ON public.level_daily_cases
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own level daily cases" ON public.level_daily_cases
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- user_rate_limits policies
CREATE POLICY "Users can view own rate limits" ON public.user_rate_limits
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own rate limits" ON public.user_rate_limits
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own rate limits" ON public.user_rate_limits
  FOR UPDATE USING (user_id = (select auth.uid()));

-- profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = (select auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = (select auth.uid()));

-- notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = (select auth.uid()));

-- case_rewards policies
CREATE POLICY "Users can view own case rewards" ON public.case_rewards
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own case rewards" ON public.case_rewards
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- daily_seeds policies (public read access)
CREATE POLICY "Public can view daily seeds" ON public.daily_seeds
  FOR SELECT TO public USING (true);

-- roulette_client_seeds policies
CREATE POLICY "Users can manage own client seeds" ON public.roulette_client_seeds
  FOR ALL USING (user_id = (select auth.uid()));

-- pending_account_deletions policies
CREATE POLICY "Users can manage own pending deletions" ON public.pending_account_deletions
  FOR ALL USING (user_id = (select auth.uid()));

-- admin_users policies
CREATE POLICY "Admin users can manage all" ON public.admin_users
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = (select auth.uid()) AND is_active = true
  ));

-- ===========================================
-- PART 2: Remove duplicate indexes
-- ===========================================

-- Get list of duplicate indexes and drop them
-- Note: Keep the first index of each duplicate set

-- crash_rounds table
DROP INDEX IF EXISTS crash_rounds_created_at_idx;  -- Keep crash_rounds_round_id_key as primary

-- game_history table  
DROP INDEX IF EXISTS game_history_created_at_idx;  -- Keep game_history_pkey as primary
DROP INDEX IF EXISTS game_history_user_id_idx;     -- Keep game_history_game_type_idx as more specific

-- live_bet_feed table
DROP INDEX IF EXISTS live_bet_feed_created_at_idx;  -- Keep live_bet_feed_pkey as primary

-- notifications table
DROP INDEX IF EXISTS notifications_created_at_idx;  -- Keep notifications_pkey as primary
DROP INDEX IF EXISTS notifications_user_id_idx;     -- Keep notifications_user_id_created_at_idx as composite

-- roulette_rounds table
DROP INDEX IF EXISTS roulette_rounds_created_at_idx;  -- Keep roulette_rounds_pkey as primary

-- tips table
DROP INDEX IF EXISTS tips_created_at_idx;  -- Keep tips_pkey as primary
DROP INDEX IF EXISTS tips_from_user_id_idx;  -- Keep tips_to_user_id_idx as more commonly used

-- tower_games table
DROP INDEX IF EXISTS tower_games_created_at_idx;  -- Keep tower_games_pkey as primary
DROP INDEX IF EXISTS tower_games_user_id_idx;     -- Keep tower_games_user_id_status_idx as composite

-- ===========================================
-- PART 3: Performance Comments
-- ===========================================

COMMENT ON POLICY "Users can view own level stats" ON public.user_level_stats IS 
'Optimized RLS policy using (select auth.uid()) for better performance';

COMMENT ON POLICY "Users can manage own client seeds" ON public.roulette_client_seeds IS 
'Consolidated multiple permissive policies into single ALL policy for better performance';

COMMENT ON POLICY "Users can manage own pending deletions" ON public.pending_account_deletions IS 
'Consolidated multiple permissive policies into single ALL policy for better performance';

COMMENT ON POLICY "Admin users can manage all" ON public.admin_users IS 
'Consolidated multiple permissive policies into single ALL policy with admin check';