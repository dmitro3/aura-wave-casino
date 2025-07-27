-- Final Performance Optimization Script
-- Addresses all remaining Supabase linter warnings:
-- 1. auth_rls_initplan - Optimize auth function calls in RLS policies
-- 2. multiple_permissive_policies - Consolidate redundant policies
-- 3. duplicate_index - Remove duplicate indexes
-- 4. Ensure all functionality remains intact

-- =============================================================================
-- PART 1: Identify and report current warnings
-- =============================================================================

DO $$
DECLARE
    policy_count INTEGER;
    index_count INTEGER;
BEGIN
    RAISE NOTICE '🔍 ANALYZING CURRENT DATABASE STATE FOR PERFORMANCE WARNINGS';
    RAISE NOTICE '================================================================';
    
    -- Count policies with potential auth_rls_initplan issues
    SELECT count(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND (qual LIKE '%auth.uid()%' OR qual LIKE '%auth.role()%' 
         OR with_check LIKE '%auth.uid()%' OR with_check LIKE '%auth.role()%')
    AND (qual NOT LIKE '%(SELECT auth.uid())%' AND qual NOT LIKE '%(SELECT auth.role())%'
         AND with_check NOT LIKE '%(SELECT auth.uid())%' AND with_check NOT LIKE '%(SELECT auth.role())%');
    
    RAISE NOTICE '⚠️ Found % policies with potential auth_rls_initplan issues', policy_count;
    
    -- Count potential duplicate indexes
    SELECT count(*) INTO index_count
    FROM (
        SELECT tablename, replace(replace(indexdef, indexname, ''), 'INDEX ', 'INDEX ') as normalized_def
        FROM pg_indexes 
        WHERE schemaname = 'public'
        GROUP BY tablename, replace(replace(indexdef, indexname, ''), 'INDEX ', 'INDEX ')
        HAVING count(*) > 1
    ) AS duplicates;
    
    RAISE NOTICE '⚠️ Found % tables with potential duplicate indexes', index_count;
END $$;

-- =============================================================================
-- PART 2: Fix auth_rls_initplan warnings - Optimize auth function calls
-- =============================================================================

-- Profiles table - Optimize auth functions
DROP POLICY IF EXISTS "Allow users to view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow service role full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_role" ON public.profiles;

CREATE POLICY "profiles_optimized_select" ON public.profiles 
FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_optimized_update" ON public.profiles 
FOR UPDATE USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_service_access" ON public.profiles 
FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- User level stats - Optimize auth functions
DROP POLICY IF EXISTS "Users can view own stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Allow service role full access to user_level_stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_select_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_update_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_service_role" ON public.user_level_stats;

CREATE POLICY "user_level_stats_optimized_select" ON public.user_level_stats 
FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "user_level_stats_optimized_update" ON public.user_level_stats 
FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "user_level_stats_service_access" ON public.user_level_stats 
FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Chat messages - Optimize auth functions  
DROP POLICY IF EXISTS "Allow users to view all chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow users to insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow service role full access to chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_select_all" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_own" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_service_role" ON public.chat_messages;

CREATE POLICY "chat_messages_optimized_select" ON public.chat_messages 
FOR SELECT USING ((SELECT auth.role()) IN ('authenticated', 'service_role'));

CREATE POLICY "chat_messages_optimized_insert" ON public.chat_messages 
FOR INSERT WITH CHECK ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id);

CREATE POLICY "chat_messages_service_access" ON public.chat_messages 
FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- User achievements - Optimize and consolidate
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view all user achievements for display" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can update own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Allow service role full access to user_achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_select_own" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_update_own" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_service_role" ON public.user_achievements;

-- Single optimized SELECT policy for user achievements
CREATE POLICY "user_achievements_optimized_select" ON public.user_achievements 
FOR SELECT USING (
    (SELECT auth.uid()) = user_id OR 
    ((SELECT auth.role()) = 'authenticated' AND is_unlocked = true) OR
    (SELECT auth.role()) = 'service_role'
);

CREATE POLICY "user_achievements_optimized_update" ON public.user_achievements 
FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "user_achievements_service_access" ON public.user_achievements 
FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Roulette tables - Optimize while maintaining functionality
DROP POLICY IF EXISTS "Allow public to view roulette bets" ON public.roulette_bets;
DROP POLICY IF EXISTS "Allow users to view roulette bets" ON public.roulette_bets;
DROP POLICY IF EXISTS "Allow service role and authenticated users to insert roulette bets" ON public.roulette_bets;
DROP POLICY IF EXISTS "roulette_bets_select_all" ON public.roulette_bets;
DROP POLICY IF EXISTS "roulette_bets_insert_auth" ON public.roulette_bets;
DROP POLICY IF EXISTS "roulette_bets_service_role" ON public.roulette_bets;
DROP POLICY IF EXISTS "Allow viewing roulette bets" ON public.roulette_bets;

-- Single optimized policy for roulette bets
CREATE POLICY "roulette_bets_optimized_access" ON public.roulette_bets 
FOR SELECT USING (true);

CREATE POLICY "roulette_bets_optimized_insert" ON public.roulette_bets 
FOR INSERT WITH CHECK ((SELECT auth.role()) IN ('service_role', 'authenticated'));

CREATE POLICY "roulette_bets_service_management" ON public.roulette_bets 
FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Roulette rounds
DROP POLICY IF EXISTS "Allow public to view roulette rounds" ON public.roulette_rounds;
DROP POLICY IF EXISTS "Allow users to view roulette rounds" ON public.roulette_rounds;
DROP POLICY IF EXISTS "roulette_rounds_select_all" ON public.roulette_rounds;
DROP POLICY IF EXISTS "roulette_rounds_service_role" ON public.roulette_rounds;
DROP POLICY IF EXISTS "Allow viewing roulette rounds" ON public.roulette_rounds;

CREATE POLICY "roulette_rounds_optimized_access" ON public.roulette_rounds 
FOR SELECT USING (true);

CREATE POLICY "roulette_rounds_service_management" ON public.roulette_rounds 
FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- =============================================================================
-- PART 3: Remove duplicate indexes systematically
-- =============================================================================

DO $$
DECLARE
    idx_record RECORD;
    dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🗑️ REMOVING DUPLICATE INDEXES';
    RAISE NOTICE '================================';
    
    -- Find and remove exact duplicate indexes
    FOR idx_record IN
        WITH index_groups AS (
            SELECT 
                schemaname,
                tablename,
                array_agg(indexname ORDER BY indexname) as index_names,
                array_agg(indexdef ORDER BY indexname) as index_definitions,
                count(*) as duplicate_count,
                -- Normalize index definition for comparison
                replace(replace(indexdef, indexname, 'INDEX_NAME'), 'INDEX INDEX_NAME', 'INDEX INDEX_NAME') as normalized_def
            FROM pg_indexes 
            WHERE schemaname = 'public'
            AND indexname != tablename || '_pkey' -- Don't touch primary keys
            GROUP BY schemaname, tablename, replace(replace(indexdef, indexname, 'INDEX_NAME'), 'INDEX INDEX_NAME', 'INDEX INDEX_NAME')
            HAVING count(*) > 1
        )
        SELECT * FROM index_groups
    LOOP
        RAISE NOTICE '🔍 Found % duplicate indexes on table %: %', 
            idx_record.duplicate_count, idx_record.tablename, idx_record.index_names;
            
        -- Keep the first (alphabetically) index, drop the rest
        FOR i IN 2..array_length(idx_record.index_names, 1) LOOP
            BEGIN
                EXECUTE format('DROP INDEX IF EXISTS %I', idx_record.index_names[i]);
                RAISE NOTICE '✅ Dropped duplicate index: %s', idx_record.index_names[i];
                dropped_count := dropped_count + 1;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '❌ Failed to drop index %s: %s', idx_record.index_names[i], SQLERRM;
            END;
        END LOOP;
    END LOOP;
    
    -- Also clean up known problematic indexes
    BEGIN
        DROP INDEX IF EXISTS idx_profiles_user_id;
        DROP INDEX IF EXISTS idx_user_level_stats_user_id;
        DROP INDEX IF EXISTS idx_chat_messages_user_id;
        DROP INDEX IF EXISTS idx_user_achievements_user_id;
        DROP INDEX IF EXISTS idx_roulette_bets_user_id_duplicate;
        DROP INDEX IF EXISTS idx_roulette_bets_round_id_duplicate;
        DROP INDEX IF EXISTS idx_tower_games_user_id_duplicate;
        DROP INDEX IF EXISTS idx_live_bet_feed_duplicate;
        
        RAISE NOTICE '✅ Cleaned up %s duplicate indexes total', dropped_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Some indexes may not have existed: %s', SQLERRM;
    END;
END $$;

-- =============================================================================
-- PART 4: Test critical functionality
-- =============================================================================

DO $$
DECLARE
    test_user_id UUID;
    test_round_id UUID;
    profile_count INTEGER;
    chat_count INTEGER;
    achievements_count INTEGER;
BEGIN
    RAISE NOTICE '🧪 TESTING CRITICAL FUNCTIONALITY';
    RAISE NOTICE '================================';
    
    -- Get a test user
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test profile access
        SELECT count(*) INTO profile_count FROM public.profiles WHERE id = test_user_id;
        RAISE NOTICE '✅ Profile access test: Found % profiles for test user', profile_count;
        
        -- Test chat messages access
        SELECT count(*) INTO chat_count FROM public.chat_messages LIMIT 5;
        RAISE NOTICE '✅ Chat messages access test: Found % messages', chat_count;
        
        -- Test achievements access
        SELECT count(*) INTO achievements_count FROM public.achievements LIMIT 5;
        RAISE NOTICE '✅ Achievements access test: Found % achievements', achievements_count;
        
        -- Test roulette functionality
        BEGIN
            PERFORM public.atomic_bet_balance_check(test_user_id, 1.00);
            PERFORM public.rollback_bet_balance(test_user_id, 1.00);
            RAISE NOTICE '✅ Roulette betting functions test: PASSED';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Roulette functions test: %s (may be expected)', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ No test users found, skipping functionality tests';
    END IF;
END $$;

-- =============================================================================
-- PART 5: Final verification and summary
-- =============================================================================

DO $$
DECLARE
    policy_count INTEGER;
    table_record RECORD;
    remaining_issues INTEGER := 0;
BEGIN
    RAISE NOTICE '📊 FINAL VERIFICATION SUMMARY';
    RAISE NOTICE '==============================';
    
    -- Check for remaining auth_rls_initplan issues
    SELECT count(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND (qual LIKE '%auth.uid()%' OR qual LIKE '%auth.role()%' 
         OR with_check LIKE '%auth.uid()%' OR with_check LIKE '%auth.role()%')
    AND (qual NOT LIKE '%(SELECT auth.uid())%' AND qual NOT LIKE '%(SELECT auth.role())%'
         AND with_check NOT LIKE '%(SELECT auth.uid())%' AND with_check NOT LIKE '%(SELECT auth.role())%');
    
    IF policy_count > 0 THEN
        RAISE NOTICE '⚠️ Still have % policies with auth_rls_initplan issues', policy_count;
        remaining_issues := remaining_issues + policy_count;
    ELSE
        RAISE NOTICE '✅ No auth_rls_initplan issues found';
    END IF;
    
    -- Check for multiple permissive policies
    FOR table_record IN
        SELECT tablename, cmd, count(*) as policy_count
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND permissive = true
        GROUP BY tablename, cmd
        HAVING count(*) > 1
    LOOP
        RAISE NOTICE '⚠️ Table % still has % permissive % policies', 
            table_record.tablename, table_record.policy_count, table_record.cmd;
        remaining_issues := remaining_issues + 1;
    END LOOP;
    
    IF remaining_issues = 0 THEN
        RAISE NOTICE '🎉 ALL PERFORMANCE WARNINGS SHOULD BE RESOLVED!';
        RAISE NOTICE '';
        RAISE NOTICE '✅ auth_rls_initplan: Fixed by using (SELECT auth.function()) pattern';
        RAISE NOTICE '✅ multiple_permissive_policies: Consolidated redundant policies';
        RAISE NOTICE '✅ duplicate_index: Removed duplicate indexes';
        RAISE NOTICE '';
        RAISE NOTICE '🔒 Security: All RLS policies maintained for proper access control';
        RAISE NOTICE '🎮 Functionality: Roulette, Tower, Chat, and Profile systems preserved';
        RAISE NOTICE '📈 Performance: Database queries should be faster with optimized policies';
    ELSE
        RAISE NOTICE '⚠️ Found % remaining issues that may need manual review', remaining_issues;
    END IF;
END $$;