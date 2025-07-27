-- Final RLS optimization - Fix auth function calls and remove duplicate policies
-- This migration optimizes all auth function calls and removes any remaining duplicate policies

-- =====================================================
-- AUDIT_LOGS TABLE - Optimize auth function calls
-- =====================================================
DROP POLICY IF EXISTS "audit_logs_consolidated_access" ON public.audit_logs;

CREATE POLICY "audit_logs_optimized_access" ON public.audit_logs
FOR ALL USING (
  (select auth.role()) = 'service_role' OR 
  (select auth.uid()) = user_id
);

-- =====================================================
-- CHAT_MESSAGES TABLE - Optimize auth function calls
-- =====================================================
DROP POLICY IF EXISTS "chat_messages_select_all" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_auth" ON public.chat_messages;

CREATE POLICY "chat_messages_select_all" ON public.chat_messages
FOR SELECT USING (true);

CREATE POLICY "chat_messages_insert_auth" ON public.chat_messages
FOR INSERT WITH CHECK (
  (select auth.role()) = 'authenticated' AND 
  (select auth.uid()) = user_id
);

-- =====================================================
-- DAILY_SEEDS TABLE - Optimize auth function calls
-- =====================================================
DROP POLICY IF EXISTS "daily_seeds_consolidated_access" ON public.daily_seeds;

CREATE POLICY "daily_seeds_optimized_access" ON public.daily_seeds
FOR ALL USING (
  (select auth.role()) = 'service_role' OR 
  (select auth.role()) = 'authenticated'
);

-- =====================================================
-- GAME_HISTORY TABLE - Optimize auth function calls and remove duplicates
-- =====================================================
DROP POLICY IF EXISTS "game_history_consolidated_access" ON public.game_history;
DROP POLICY IF EXISTS "Users can insert their own game history" ON public.game_history;

CREATE POLICY "game_history_optimized_access" ON public.game_history
FOR ALL USING (
  (select auth.role()) = 'service_role' OR 
  (select auth.uid()) = user_id
);

-- =====================================================
-- GAME_STATS TABLE - Optimize auth function calls and remove duplicates
-- =====================================================
DROP POLICY IF EXISTS "game_stats_consolidated_access" ON public.game_stats;
DROP POLICY IF EXISTS "Users can insert their own game stats" ON public.game_stats;
DROP POLICY IF EXISTS "Users can update their own game stats" ON public.game_stats;

CREATE POLICY "game_stats_optimized_access" ON public.game_stats
FOR ALL USING (
  (select auth.role()) = 'service_role' OR 
  (select auth.uid()) = user_id
);

-- =====================================================
-- PROFILES TABLE - Optimize auth function calls
-- =====================================================
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_all" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (
  (select auth.role()) = 'service_role' OR 
  (select auth.uid()) = id
);

-- =====================================================
-- ROULETTE_CLIENT_SEEDS TABLE - Optimize auth function calls
-- =====================================================
DROP POLICY IF EXISTS "roulette_client_seeds_consolidated_access" ON public.roulette_client_seeds;

CREATE POLICY "roulette_client_seeds_optimized_access" ON public.roulette_client_seeds
FOR ALL USING (
  (select auth.role()) = 'service_role' OR 
  (select auth.role()) = 'authenticated'
);

-- =====================================================
-- ROULETTE_RESULTS TABLE - Optimize auth function calls
-- =====================================================
DROP POLICY IF EXISTS "roulette_results_consolidated_access" ON public.roulette_results;

CREATE POLICY "roulette_results_optimized_access" ON public.roulette_results
FOR ALL USING (
  (select auth.role()) = 'service_role' OR 
  (select auth.role()) = 'authenticated'
);

-- =====================================================
-- ROULETTE_ROUNDS TABLE - Optimize auth function calls
-- =====================================================
DROP POLICY IF EXISTS "roulette_rounds_consolidated_access" ON public.roulette_rounds;

CREATE POLICY "roulette_rounds_optimized_access" ON public.roulette_rounds
FOR ALL USING (
  (select auth.role()) = 'service_role' OR 
  (select auth.role()) = 'authenticated'
);

-- =====================================================
-- TIPS TABLE - Optimize auth function calls and remove duplicates
-- =====================================================
DROP POLICY IF EXISTS "tips_consolidated_access" ON public.tips;
DROP POLICY IF EXISTS "Users can send tips" ON public.tips;

CREATE POLICY "tips_optimized_access" ON public.tips
FOR ALL USING (
  (select auth.role()) = 'service_role' OR 
  (select auth.uid()) = from_user_id OR 
  (select auth.uid()) = to_user_id
);

-- =====================================================
-- USER_RATE_LIMITS TABLE - Optimize auth function calls
-- =====================================================
DROP POLICY IF EXISTS "user_rate_limits_consolidated_access" ON public.user_rate_limits;

CREATE POLICY "user_rate_limits_optimized_access" ON public.user_rate_limits
FOR ALL USING (
  (select auth.role()) = 'service_role' OR 
  (select auth.uid()) = user_id
);