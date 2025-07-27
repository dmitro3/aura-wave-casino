-- Fix multiple permissive policies performance warnings
-- This migration consolidates overlapping RLS policies into single, efficient policies

-- =====================================================
-- AUDIT_LOGS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Service role full access audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;

-- Create single consolidated policy for audit_logs
CREATE POLICY "audit_logs_consolidated_access" ON public.audit_logs
FOR ALL USING (
  auth.role() = 'service_role' OR 
  auth.uid() = user_id
);

-- =====================================================
-- CHAT_MESSAGES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "consolidated_permissive_policy" ON public.chat_messages;

-- Create single consolidated policies for chat_messages
CREATE POLICY "chat_messages_select_all" ON public.chat_messages
FOR SELECT USING (true);

CREATE POLICY "chat_messages_insert_auth" ON public.chat_messages
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND 
  auth.uid() = user_id
);

-- =====================================================
-- DAILY_SEEDS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view daily seeds" ON public.daily_seeds;
DROP POLICY IF EXISTS "Service role can manage daily seeds" ON public.daily_seeds;

-- Create single consolidated policy for daily_seeds
CREATE POLICY "daily_seeds_consolidated_access" ON public.daily_seeds
FOR ALL USING (
  auth.role() = 'service_role' OR 
  auth.role() = 'authenticated'
);

-- =====================================================
-- GAME_HISTORY TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view all game history" ON public.game_history;
DROP POLICY IF EXISTS "Users can view their own game history" ON public.game_history;

-- Create single consolidated policy for game_history
CREATE POLICY "game_history_consolidated_access" ON public.game_history
FOR ALL USING (
  auth.role() = 'service_role' OR 
  auth.uid() = user_id
);

-- =====================================================
-- GAME_STATS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view all game stats" ON public.game_stats;
DROP POLICY IF EXISTS "Users can view their own game stats" ON public.game_stats;

-- Create single consolidated policy for game_stats
CREATE POLICY "game_stats_consolidated_access" ON public.game_stats
FOR ALL USING (
  auth.role() = 'service_role' OR 
  auth.uid() = user_id
);

-- =====================================================
-- PROFILES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "consolidated_permissive_policy" ON public.profiles;

-- Create single consolidated policies for profiles
CREATE POLICY "profiles_select_all" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (
  auth.role() = 'service_role' OR 
  auth.uid() = id
);

-- =====================================================
-- ROULETTE_CLIENT_SEEDS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow service role and users to manage client seeds" ON public.roulette_client_seeds;
DROP POLICY IF EXISTS "Allow service role and users to view client seeds" ON public.roulette_client_seeds;

-- Create single consolidated policy for roulette_client_seeds
CREATE POLICY "roulette_client_seeds_consolidated_access" ON public.roulette_client_seeds
FOR ALL USING (
  auth.role() = 'service_role' OR 
  auth.role() = 'authenticated'
);

-- =====================================================
-- ROULETTE_RESULTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow all to view roulette results" ON public.roulette_results;
DROP POLICY IF EXISTS "Allow service role to manage roulette results" ON public.roulette_results;

-- Create single consolidated policy for roulette_results
CREATE POLICY "roulette_results_consolidated_access" ON public.roulette_results
FOR ALL USING (
  auth.role() = 'service_role' OR 
  auth.role() = 'authenticated'
);

-- =====================================================
-- ROULETTE_ROUNDS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow all to view roulette rounds" ON public.roulette_rounds;
DROP POLICY IF EXISTS "Allow service role to manage roulette rounds" ON public.roulette_rounds;

-- Create single consolidated policy for roulette_rounds
CREATE POLICY "roulette_rounds_consolidated_access" ON public.roulette_rounds
FOR ALL USING (
  auth.role() = 'service_role' OR 
  auth.role() = 'authenticated'
);

-- =====================================================
-- TIPS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view tips they received" ON public.tips;
DROP POLICY IF EXISTS "Users can view tips they sent" ON public.tips;

-- Create single consolidated policy for tips
CREATE POLICY "tips_consolidated_access" ON public.tips
FOR ALL USING (
  auth.role() = 'service_role' OR 
  auth.uid() = sender_id OR 
  auth.uid() = receiver_id
);

-- =====================================================
-- USER_RATE_LIMITS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Service role full access rate limits" ON public.user_rate_limits;
DROP POLICY IF EXISTS "Users can view own rate limits" ON public.user_rate_limits;

-- Create single consolidated policy for user_rate_limits
CREATE POLICY "user_rate_limits_consolidated_access" ON public.user_rate_limits
FOR ALL USING (
  auth.role() = 'service_role' OR 
  auth.uid() = user_id
);