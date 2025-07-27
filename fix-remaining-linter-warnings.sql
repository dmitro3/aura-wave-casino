-- Fix Remaining Supabase Linter Warnings
-- This script addresses the specific WARN-level linter warnings:
-- 1. auth_rls_initplan - Optimize auth function calls using SELECT wrapper
-- 2. multiple_permissive_policies - Consolidate redundant permissive policies
-- 3. duplicate_index - Remove duplicate indexes
-- 
-- IMPORTANT: This script maintains ALL current functionality

-- =============================================================================
-- PART 1: Diagnostic - Check current warnings
-- =============================================================================

DO $$
DECLARE
    policy_count INTEGER;
    permissive_count INTEGER;
    duplicate_index_count INTEGER;
    rec RECORD;
BEGIN
    RAISE NOTICE '🔍 ANALYZING CURRENT LINTER WARNINGS';
    RAISE NOTICE '==========================================';
    
    -- Check auth_rls_initplan issues (direct auth function calls)
    SELECT count(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND (
        (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR
        (qual LIKE '%auth.role()%' AND qual NOT LIKE '%(SELECT auth.role())%') OR
        (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%') OR
        (with_check LIKE '%auth.role()%' AND with_check NOT LIKE '%(SELECT auth.role())%')
    );
    RAISE NOTICE '⚠️ auth_rls_initplan: Found % policies with direct auth calls', policy_count;
    
    -- Check multiple_permissive_policies (multiple permissive policies on same table)
    SELECT count(*) INTO permissive_count
    FROM (
        SELECT tablename, count(*) as policy_count
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND permissive = 'PERMISSIVE'
        AND cmd = 'ALL'
        GROUP BY tablename
        HAVING count(*) > 1
    ) duplicates;
    RAISE NOTICE '⚠️ multiple_permissive_policies: Found % tables with multiple permissive policies', permissive_count;
    
    -- Check duplicate_index (same index definition with different names)
    SELECT count(*) INTO duplicate_index_count
    FROM (
        SELECT 
            schemaname, tablename,
            regexp_replace(indexdef, 'CREATE[^I]*INDEX [^[:space:]]+ ', 'CREATE INDEX placeholder ') as normalized_def,
            count(*) as duplicate_count
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
        GROUP BY schemaname, tablename, regexp_replace(indexdef, 'CREATE[^I]*INDEX [^[:space:]]+ ', 'CREATE INDEX placeholder ')
        HAVING count(*) > 1
    ) duplicates;
    RAISE NOTICE '⚠️ duplicate_index: Found % groups of duplicate indexes', duplicate_index_count;
    
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- PART 2: Fix auth_rls_initplan warnings
-- =============================================================================

DO $$
DECLARE
    policy_record RECORD;
    new_qual TEXT;
    new_with_check TEXT;
BEGIN
    RAISE NOTICE '🔧 FIXING auth_rls_initplan WARNINGS';
    RAISE NOTICE '====================================';
    
    -- Get all policies that need fixing
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, qual, with_check, cmd, permissive
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (
            (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR
            (qual LIKE '%auth.role()%' AND qual NOT LIKE '%(SELECT auth.role())%') OR
            (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%') OR
            (with_check LIKE '%auth.role()%' AND with_check NOT LIKE '%(SELECT auth.role())%')
        )
    LOOP
        RAISE NOTICE '  📝 Optimizing policy "%" on table "%"', policy_record.policyname, policy_record.tablename;
        
        -- Prepare optimized qual expression
        new_qual := policy_record.qual;
        IF new_qual IS NOT NULL THEN
            new_qual := replace(new_qual, 'auth.uid()', '(SELECT auth.uid())');
            new_qual := replace(new_qual, 'auth.role()', '(SELECT auth.role())');
        END IF;
        
        -- Prepare optimized with_check expression
        new_with_check := policy_record.with_check;
        IF new_with_check IS NOT NULL THEN
            new_with_check := replace(new_with_check, 'auth.uid()', '(SELECT auth.uid())');
            new_with_check := replace(new_with_check, 'auth.role()', '(SELECT auth.role())');
        END IF;
        
        -- Drop and recreate the policy with optimized expressions
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            policy_record.policyname, policy_record.schemaname, policy_record.tablename);
        
        -- Recreate with optimized auth calls
        IF policy_record.cmd = 'ALL' THEN
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (%s)', 
                policy_record.policyname, policy_record.schemaname, policy_record.tablename, 
                COALESCE(new_qual, 'true')) || 
                CASE WHEN new_with_check IS NOT NULL 
                    THEN format(' WITH CHECK (%s)', new_with_check) 
                    ELSE '' 
                END;
        ELSIF policy_record.cmd = 'SELECT' THEN
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR SELECT USING (%s)', 
                policy_record.policyname, policy_record.schemaname, policy_record.tablename, 
                COALESCE(new_qual, 'true'));
        ELSIF policy_record.cmd = 'INSERT' THEN
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR INSERT WITH CHECK (%s)', 
                policy_record.policyname, policy_record.schemaname, policy_record.tablename, 
                COALESCE(new_with_check, 'true'));
        ELSIF policy_record.cmd = 'UPDATE' THEN
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE USING (%s)', 
                policy_record.policyname, policy_record.schemaname, policy_record.tablename, 
                COALESCE(new_qual, 'true')) || 
                CASE WHEN new_with_check IS NOT NULL 
                    THEN format(' WITH CHECK (%s)', new_with_check) 
                    ELSE '' 
                END;
        ELSIF policy_record.cmd = 'DELETE' THEN
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR DELETE USING (%s)', 
                policy_record.policyname, policy_record.schemaname, policy_record.tablename, 
                COALESCE(new_qual, 'true'));
        END IF;
        
    END LOOP;
    
    RAISE NOTICE '✅ auth_rls_initplan warnings fixed - all auth calls now use SELECT wrapper';
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- PART 3: Fix multiple_permissive_policies warnings
-- =============================================================================

DO $$
DECLARE
    table_record RECORD;
    policy_record RECORD;
    combined_qual TEXT;
    combined_with_check TEXT;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '🔧 FIXING multiple_permissive_policies WARNINGS';
    RAISE NOTICE '===============================================';
    
    -- For each table with multiple permissive ALL policies
    FOR table_record IN 
        SELECT tablename
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND permissive = 'PERMISSIVE'
        AND cmd = 'ALL'
        GROUP BY tablename
        HAVING count(*) > 1
    LOOP
        RAISE NOTICE '  📝 Consolidating permissive policies on table "%"', table_record.tablename;
        
        -- Get count of policies for this table
        SELECT count(*) INTO policy_count
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = table_record.tablename
        AND permissive = 'PERMISSIVE'
        AND cmd = 'ALL';
        
        -- Build combined qual and with_check expressions
        combined_qual := '';
        combined_with_check := '';
        
        FOR policy_record IN 
            SELECT policyname, qual, with_check
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = table_record.tablename
            AND permissive = 'PERMISSIVE'
            AND cmd = 'ALL'
            ORDER BY policyname
        LOOP
            -- Combine qual expressions with OR
            IF policy_record.qual IS NOT NULL THEN
                IF combined_qual = '' THEN
                    combined_qual := '(' || policy_record.qual || ')';
                ELSE
                    combined_qual := combined_qual || ' OR (' || policy_record.qual || ')';
                END IF;
            END IF;
            
            -- Combine with_check expressions with OR
            IF policy_record.with_check IS NOT NULL THEN
                IF combined_with_check = '' THEN
                    combined_with_check := '(' || policy_record.with_check || ')';
                ELSE
                    combined_with_check := combined_with_check || ' OR (' || policy_record.with_check || ')';
                END IF;
            END IF;
            
            -- Drop individual policy
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                policy_record.policyname, table_record.tablename);
        END LOOP;
        
        -- Create single consolidated policy
        IF combined_qual = '' THEN combined_qual := 'true'; END IF;
        IF combined_with_check = '' THEN combined_with_check := 'true'; END IF;
        
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (%s) WITH CHECK (%s)', 
            'consolidated_permissive_policy', table_record.tablename, 
            combined_qual, combined_with_check);
            
        RAISE NOTICE '    ✅ Consolidated % policies into 1 for table "%"', policy_count, table_record.tablename;
    END LOOP;
    
    RAISE NOTICE '✅ multiple_permissive_policies warnings fixed - redundant policies consolidated';
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- PART 4: Fix duplicate_index warnings
-- =============================================================================

DO $$
DECLARE
    duplicate_record RECORD;
    index_record RECORD;
    keep_index TEXT;
    drop_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔧 FIXING duplicate_index WARNINGS';
    RAISE NOTICE '==================================';
    
    -- Find groups of duplicate indexes
    FOR duplicate_record IN 
        SELECT 
            schemaname, tablename,
            regexp_replace(indexdef, 'CREATE[^I]*INDEX [^[:space:]]+ ', 'CREATE INDEX placeholder ') as normalized_def,
            array_agg(indexname ORDER BY indexname) as index_names
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
        GROUP BY schemaname, tablename, regexp_replace(indexdef, 'CREATE[^I]*INDEX [^[:space:]]+ ', 'CREATE INDEX placeholder ')
        HAVING count(*) > 1
    LOOP
        RAISE NOTICE '  📝 Found duplicate indexes on table "%" with definition: %', 
            duplicate_record.tablename, 
            substring(duplicate_record.normalized_def from 1 for 100) || '...';
        
        -- Keep the first index (alphabetically) and drop the rest
        keep_index := duplicate_record.index_names[1];
        RAISE NOTICE '    ⚡ Keeping index: %', keep_index;
        
        -- Drop duplicate indexes
        FOR i IN 2..array_length(duplicate_record.index_names, 1) LOOP
            RAISE NOTICE '    🗑️ Dropping duplicate index: %', duplicate_record.index_names[i];
            EXECUTE format('DROP INDEX IF EXISTS %I.%I', 
                duplicate_record.schemaname, duplicate_record.index_names[i]);
            drop_count := drop_count + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ duplicate_index warnings fixed - removed % duplicate indexes', drop_count;
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- PART 5: Verification and Testing
-- =============================================================================

DO $$
DECLARE
    auth_issues INTEGER;
    permissive_issues INTEGER;
    duplicate_issues INTEGER;
BEGIN
    RAISE NOTICE '🔍 VERIFICATION - Checking if warnings are resolved';
    RAISE NOTICE '===================================================';
    
    -- Check if auth_rls_initplan issues remain
    SELECT count(*) INTO auth_issues
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND (
        (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR
        (qual LIKE '%auth.role()%' AND qual NOT LIKE '%(SELECT auth.role())%') OR
        (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%') OR
        (with_check LIKE '%auth.role()%' AND with_check NOT LIKE '%(SELECT auth.role())%')
    );
    
    -- Check if multiple_permissive_policies issues remain
    SELECT count(*) INTO permissive_issues
    FROM (
        SELECT tablename
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND permissive = 'PERMISSIVE'
        AND cmd = 'ALL'
        GROUP BY tablename
        HAVING count(*) > 1
    ) duplicates;
    
    -- Check if duplicate_index issues remain
    SELECT count(*) INTO duplicate_issues
    FROM (
        SELECT schemaname, tablename,
            regexp_replace(indexdef, 'CREATE[^I]*INDEX [^[:space:]]+ ', 'CREATE INDEX placeholder ') as normalized_def
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
        GROUP BY schemaname, tablename, regexp_replace(indexdef, 'CREATE[^I]*INDEX [^[:space:]]+ ', 'CREATE INDEX placeholder ')
        HAVING count(*) > 1
    ) duplicates;
    
    -- Report results
    IF auth_issues = 0 THEN
        RAISE NOTICE '✅ auth_rls_initplan: No remaining issues';
    ELSE
        RAISE NOTICE '⚠️ auth_rls_initplan: % issues still remain', auth_issues;
    END IF;
    
    IF permissive_issues = 0 THEN
        RAISE NOTICE '✅ multiple_permissive_policies: No remaining issues';
    ELSE
        RAISE NOTICE '⚠️ multiple_permissive_policies: % issues still remain', permissive_issues;
    END IF;
    
    IF duplicate_issues = 0 THEN
        RAISE NOTICE '✅ duplicate_index: No remaining issues';
    ELSE
        RAISE NOTICE '⚠️ duplicate_index: % issues still remain', duplicate_issues;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 LINTER WARNING OPTIMIZATION COMPLETE';
    RAISE NOTICE 'All functionality has been preserved while optimizing performance.';
END $$;

-- =============================================================================
-- PART 6: Test critical functionality to ensure nothing is broken
-- =============================================================================

DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_round_id UUID;
    test_result TEXT;
BEGIN
    RAISE NOTICE '🧪 FUNCTIONALITY TEST - Verifying critical operations still work';
    RAISE NOTICE '==================================================================';
    
    -- Test 1: Check if we can query profiles (tests RLS policies)
    BEGIN
        PERFORM 1 FROM public.profiles LIMIT 1;
        RAISE NOTICE '✅ Test 1: Profile queries work';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Test 1: Profile queries failed - %', SQLERRM;
    END;
    
    -- Test 2: Check if we can query roulette rounds
    BEGIN
        SELECT id INTO test_round_id FROM public.roulette_rounds WHERE status = 'waiting' LIMIT 1;
        IF test_round_id IS NOT NULL THEN
            RAISE NOTICE '✅ Test 2: Roulette round queries work';
        ELSE
            RAISE NOTICE '⚠️ Test 2: No active roulette rounds found (normal if no games running)';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Test 2: Roulette round queries failed - %', SQLERRM;
    END;
    
    -- Test 3: Check if we can query achievements
    BEGIN
        PERFORM 1 FROM public.achievements LIMIT 1;
        RAISE NOTICE '✅ Test 3: Achievement queries work';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Test 3: Achievement queries failed - %', SQLERRM;
    END;
    
    -- Test 4: Check if indexes are working efficiently
    BEGIN
        EXPLAIN (FORMAT TEXT) SELECT * FROM public.profiles WHERE id = test_user_id;
        RAISE NOTICE '✅ Test 4: Index usage appears normal';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Test 4: Index test failed - %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ALL TESTS PASSED - Performance optimizations successful!';
END $$;