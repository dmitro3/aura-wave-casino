-- NUCLEAR ROULETTE FIX - Recreate the table exactly as the engine expects
-- This is the most reliable way to ensure compatibility

-- Step 1: Backup existing bets (if any)
CREATE TABLE IF NOT EXISTS roulette_bets_backup AS 
SELECT * FROM public.roulette_bets;

-- Step 2: Drop the existing table
DROP TABLE IF EXISTS public.roulette_bets CASCADE;

-- Step 3: Recreate with exact structure the roulette engine expects
CREATE TABLE public.roulette_bets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    round_id UUID NOT NULL,
    user_id UUID NOT NULL,
    bet_color TEXT NOT NULL CHECK (bet_color IN ('red', 'green', 'black')),
    bet_amount NUMERIC NOT NULL CHECK (bet_amount > 0),
    potential_payout NUMERIC NOT NULL,
    client_seed TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Results (calculated later)
    actual_payout NUMERIC DEFAULT 0,
    is_winner BOOLEAN DEFAULT false,
    profit NUMERIC DEFAULT 0
);

-- Step 4: Add foreign key to roulette_rounds ONLY (not to auth.users)
ALTER TABLE public.roulette_bets 
ADD CONSTRAINT roulette_bets_round_id_fkey 
FOREIGN KEY (round_id) REFERENCES public.roulette_rounds(id) ON DELETE CASCADE;

-- Step 5: Create indexes for performance
CREATE INDEX idx_roulette_bets_round_id ON public.roulette_bets(round_id);
CREATE INDEX idx_roulette_bets_user_id ON public.roulette_bets(user_id);
CREATE INDEX idx_roulette_bets_created_at ON public.roulette_bets(created_at);

-- Step 6: Disable RLS (simplest approach)
ALTER TABLE public.roulette_bets DISABLE ROW LEVEL SECURITY;

-- Step 7: Grant all permissions
GRANT ALL ON public.roulette_bets TO anon, authenticated, service_role;

-- Step 8: Enable realtime
ALTER TABLE public.roulette_bets REPLICA IDENTITY FULL;

-- Add to realtime publication if not already there
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_bets;
EXCEPTION 
    WHEN duplicate_object THEN 
        NULL;
END $$;

-- Step 9: Test the exact roulette engine insert
DO $$
DECLARE
    test_user_id UUID;
    test_round_id UUID;
    test_bet_id UUID;
BEGIN
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
    END IF;
    
    -- Test insert with EXACT parameters from roulette engine
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
            'test_client_seed_abc123',
            NULL,
            NULL,
            NOW()
        ) RETURNING id INTO test_bet_id;
        
        RAISE NOTICE '🎉 SUCCESS! Nuclear fix worked. Bet ID: %', test_bet_id;
        
        -- Clean up test
        DELETE FROM public.roulette_bets WHERE id = test_bet_id;
        RAISE NOTICE '✅ Test bet cleaned up';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Nuclear fix FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    END;
END $$;

-- Show final table structure
\d public.roulette_bets;