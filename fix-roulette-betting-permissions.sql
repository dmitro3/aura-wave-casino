-- Fix Roulette Betting Permissions
-- The issue is that roulette_bets table RLS policy doesn't allow service_role to insert bets

-- Grant necessary permissions to service_role
GRANT ALL ON public.roulette_bets TO service_role;
GRANT ALL ON public.roulette_rounds TO service_role;
GRANT ALL ON public.roulette_client_seeds TO service_role;
GRANT ALL ON public.roulette_results TO service_role;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert their own bets" ON public.roulette_bets;
DROP POLICY IF EXISTS "Anyone can view roulette bets" ON public.roulette_bets;
DROP POLICY IF EXISTS "Service role can manage bets" ON public.roulette_bets;

-- Create new policies that allow both users and service_role
CREATE POLICY "Allow service role and users to view roulette bets" 
ON public.roulette_bets 
FOR SELECT 
USING (true);

CREATE POLICY "Allow service role and users to insert roulette bets" 
ON public.roulette_bets 
FOR INSERT 
WITH CHECK (
  auth.role() = 'service_role' OR 
  auth.uid() = user_id
);

CREATE POLICY "Allow service role to update roulette bets" 
ON public.roulette_bets 
FOR UPDATE 
USING (auth.role() = 'service_role');

-- Also ensure roulette_rounds policies allow service_role
DROP POLICY IF EXISTS "Anyone can view roulette rounds" ON public.roulette_rounds;
DROP POLICY IF EXISTS "System can manage rounds" ON public.roulette_rounds;

CREATE POLICY "Allow all to view roulette rounds" 
ON public.roulette_rounds 
FOR SELECT 
USING (true);

CREATE POLICY "Allow service role to manage roulette rounds" 
ON public.roulette_rounds 
FOR ALL 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

-- Fix roulette_client_seeds policies
DROP POLICY IF EXISTS "Users can manage their client seeds" ON public.roulette_client_seeds;

CREATE POLICY "Allow service role and users to view client seeds" 
ON public.roulette_client_seeds 
FOR SELECT 
USING (
  auth.role() = 'service_role' OR 
  auth.uid() = user_id
);

CREATE POLICY "Allow service role and users to insert client seeds" 
ON public.roulette_client_seeds 
FOR INSERT 
WITH CHECK (
  auth.role() = 'service_role' OR 
  auth.uid() = user_id
);

CREATE POLICY "Allow service role and users to update client seeds" 
ON public.roulette_client_seeds 
FOR UPDATE 
USING (
  auth.role() = 'service_role' OR 
  auth.uid() = user_id
);

-- Fix roulette_results policies
DROP POLICY IF EXISTS "Anyone can view results" ON public.roulette_results;

CREATE POLICY "Allow all to view roulette results" 
ON public.roulette_results 
FOR SELECT 
USING (true);

CREATE POLICY "Allow service role to manage roulette results" 
ON public.roulette_results 
FOR ALL 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

-- Also ensure the atomic balance check and rollback functions exist
-- (These should already be created from roulette-security-tables.sql)

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.atomic_bet_balance_check TO service_role;
GRANT EXECUTE ON FUNCTION public.rollback_bet_balance TO service_role;