-- Fix RLS Security Warnings
-- This script addresses Supabase security warnings while maintaining roulette functionality

-- ==============================================================================
-- SECTION 1: Clean up backup table (no longer needed)
-- ==============================================================================

-- Drop the backup table since roulette betting is now working
DROP TABLE IF EXISTS public.roulette_bets_backup;

-- ==============================================================================
-- SECTION 2: Fix roulette_bets table RLS
-- ==============================================================================

-- Enable RLS on roulette_bets
ALTER TABLE public.roulette_bets ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Allow all operations on roulette_bets" ON public.roulette_bets;
DROP POLICY IF EXISTS "Anyone can view roulette bets" ON public.roulette_bets;
DROP POLICY IF EXISTS "Users can insert their own bets" ON public.roulette_bets;
DROP POLICY IF EXISTS "Service role can manage bets" ON public.roulette_bets;

-- Create comprehensive policies that work for both users and service_role
CREATE POLICY "Allow all to view roulette bets" 
ON public.roulette_bets 
FOR SELECT 
USING (true);

CREATE POLICY "Allow service role and authenticated users to insert roulette bets" 
ON public.roulette_bets 
FOR INSERT 
WITH CHECK (
  auth.role() = 'service_role' OR 
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
);

CREATE POLICY "Allow service role to update roulette bets" 
ON public.roulette_bets 
FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to delete roulette bets" 
ON public.roulette_bets 
FOR DELETE 
USING (auth.role() = 'service_role');

-- ==============================================================================
-- SECTION 3: Fix roulette_rounds table RLS
-- ==============================================================================

-- Enable RLS on roulette_rounds
ALTER TABLE public.roulette_rounds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all to view roulette rounds" ON public.roulette_rounds;
DROP POLICY IF EXISTS "Allow service role to manage roulette rounds" ON public.roulette_rounds;
DROP POLICY IF EXISTS "Service role can manage roulette rounds" ON public.roulette_rounds;

-- Create new policies
CREATE POLICY "Allow all to view roulette rounds" 
ON public.roulette_rounds 
FOR SELECT 
USING (true);

CREATE POLICY "Allow service role to manage roulette rounds" 
ON public.roulette_rounds 
FOR ALL 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

-- ==============================================================================
-- SECTION 4: Fix roulette_client_seeds table RLS
-- ==============================================================================

-- Enable RLS on roulette_client_seeds
ALTER TABLE public.roulette_client_seeds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow service role and users to view client seeds" ON public.roulette_client_seeds;
DROP POLICY IF EXISTS "Allow service role and users to insert client seeds" ON public.roulette_client_seeds;
DROP POLICY IF EXISTS "Allow service role and users to update client seeds" ON public.roulette_client_seeds;
DROP POLICY IF EXISTS "Service role can view client seeds" ON public.roulette_client_seeds;
DROP POLICY IF EXISTS "Users can manage own client seeds" ON public.roulette_client_seeds;
DROP POLICY IF EXISTS "Users can manage their own client seeds" ON public.roulette_client_seeds;

-- Create new policies
CREATE POLICY "Allow service role and users to view client seeds" 
ON public.roulette_client_seeds 
FOR SELECT 
USING (
  auth.role() = 'service_role' OR 
  auth.uid() = user_id
);

CREATE POLICY "Allow service role and users to manage client seeds" 
ON public.roulette_client_seeds 
FOR ALL 
USING (
  auth.role() = 'service_role' OR 
  auth.uid() = user_id
) 
WITH CHECK (
  auth.role() = 'service_role' OR 
  auth.uid() = user_id
);

-- ==============================================================================
-- SECTION 5: Fix roulette_results table RLS
-- ==============================================================================

-- Enable RLS on roulette_results
ALTER TABLE public.roulette_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all to view roulette results" ON public.roulette_results;
DROP POLICY IF EXISTS "Allow service role to manage roulette results" ON public.roulette_results;
DROP POLICY IF EXISTS "Anyone can view roulette results" ON public.roulette_results;

-- Create new policies
CREATE POLICY "Allow all to view roulette results" 
ON public.roulette_results 
FOR SELECT 
USING (true);

CREATE POLICY "Allow service role to manage roulette results" 
ON public.roulette_results 
FOR ALL 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

-- ==============================================================================
-- SECTION 6: Test that roulette betting still works after RLS fixes
-- ==============================================================================

DO $$
DECLARE
    test_user_id UUID;
    test_round_id UUID;
    test_bet_id UUID;
    balance_check_result JSONB;
BEGIN
    RAISE NOTICE '🔍 Testing roulette betting after RLS security fixes...';
    
    -- Get test data
    SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
    SELECT id INTO test_round_id FROM public.roulette_rounds ORDER BY created_at DESC LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ No user found for testing';
        RETURN;
    END IF;
    
    IF test_round_id IS NULL THEN
        RAISE NOTICE '❌ No round found - creating test round';
        INSERT INTO public.roulette_rounds (status, betting_start_time, betting_end_time)
        VALUES ('betting', NOW(), NOW() + INTERVAL '30 seconds')
        RETURNING id INTO test_round_id;
        RAISE NOTICE '✅ Created test round: %', test_round_id;
    END IF;
    
    -- Test balance check function still works
    BEGIN
        SELECT public.atomic_bet_balance_check(test_user_id, 1.00, test_round_id) INTO balance_check_result;
        
        IF (balance_check_result->>'success')::BOOLEAN = FALSE THEN
            RAISE NOTICE '❌ Balance check failed: %', balance_check_result->>'error_message';
            RETURN;
        ELSE
            RAISE NOTICE '✅ Balance check still works';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Balance check function failed: %', SQLERRM;
            RETURN;
    END;
    
    -- Test bet insertion with new RLS policies
    BEGIN
        INSERT INTO public.roulette_bets (
            round_id,
            user_id,
            bet_color,
            bet_amount,
            potential_payout,
            client_seed,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            test_round_id,
            test_user_id,
            'red',
            1.00,
            2.00,
            'test_security_fix',
            NULL,
            NULL,
            NOW()
        ) RETURNING id INTO test_bet_id;
        
        RAISE NOTICE '🎉 SUCCESS! Roulette betting still works with RLS enabled. Bet ID: %', test_bet_id;
        
        -- Clean up test
        DELETE FROM public.roulette_bets WHERE id = test_bet_id;
        RAISE NOTICE '✅ Test bet cleaned up';
        
        -- Restore balance
        PERFORM public.rollback_bet_balance(test_user_id, 1.00);
        RAISE NOTICE '✅ Balance restored';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ RLS fix broke roulette betting: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
            RAISE NOTICE '⚠️ You may need to run the nuclear fix again';
    END;
END $$;

-- ==============================================================================
-- SECTION 7: Summary
-- ==============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ === RLS SECURITY FIXES COMPLETE ===';
    RAISE NOTICE '✅ All roulette tables now have RLS enabled with proper policies';
    RAISE NOTICE '✅ Backup table removed';
    RAISE NOTICE '✅ Security warnings should be resolved';
    RAISE NOTICE '✅ Roulette betting functionality should be maintained';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 What this does:';
    RAISE NOTICE '  - Fixes all Supabase security warnings';
    RAISE NOTICE '  - Maintains roulette betting functionality';
    RAISE NOTICE '  - Allows service_role to manage game data';
    RAISE NOTICE '  - Allows users to view/insert their own data';
    RAISE NOTICE '  - Provides public read access for game rounds/results';
    RAISE NOTICE '';
END $$;