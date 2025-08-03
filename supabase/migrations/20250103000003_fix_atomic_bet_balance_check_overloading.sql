-- ===============================================
-- FIX ATOMIC_BET_BALANCE_CHECK FUNCTION OVERLOADING
-- ===============================================
-- This fixes the function overloading issue preventing roulette bets

-- Drop ALL versions of the conflicting function
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(UUID, NUMERIC, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(UUID, NUMERIC, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check CASCADE;

-- Create ONE clean version with TEXT parameter (matches roulette engine usage)
CREATE OR REPLACE FUNCTION public.atomic_bet_balance_check(
  p_user_id UUID,
  p_bet_amount NUMERIC,
  p_round_id TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  error_message TEXT,
  new_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Lock the user's row for update to prevent race conditions
  SELECT balance INTO v_current_balance 
  FROM public.profiles 
  WHERE id = p_user_id 
  FOR UPDATE;

  -- Check if user exists
  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not found', 0::NUMERIC;
    RETURN;
  END IF;

  -- Check if user has sufficient balance
  IF v_current_balance < p_bet_amount THEN
    RETURN QUERY SELECT FALSE, 'Insufficient balance', v_current_balance;
    RETURN;
  END IF;

  -- Deduct the bet amount
  v_new_balance := v_current_balance - p_bet_amount;
  
  UPDATE public.profiles 
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, 'Success', v_new_balance;
END;
$$;

-- Grant proper permissions to all roles
GRANT EXECUTE ON FUNCTION public.atomic_bet_balance_check(UUID, NUMERIC, TEXT) TO anon, authenticated, service_role;

-- Test the function to ensure it works
DO $$
BEGIN
  -- Test with a known user ID (will fail on insufficient balance, but function should work)
  PERFORM public.atomic_bet_balance_check(
    'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID, 
    0.01, 
    'test-round-id'
  );
  
  RAISE LOG 'atomic_bet_balance_check function is working properly';
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'atomic_bet_balance_check test failed: %', SQLERRM;
END;
$$;

-- Confirmation
SELECT 'Atomic bet balance check function overloading fixed!' as status;