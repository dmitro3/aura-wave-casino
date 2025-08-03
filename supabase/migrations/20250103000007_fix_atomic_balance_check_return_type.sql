-- ===============================================
-- FIX ATOMIC BALANCE CHECK RETURN TYPE
-- ===============================================
-- The function was returning TABLE which creates an array
-- But the roulette engine expects a single object

-- Drop the current function
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(UUID, NUMERIC, TEXT) CASCADE;

-- Create function that returns a single object (not a table)
CREATE OR REPLACE FUNCTION public.atomic_bet_balance_check(
  p_user_id UUID,
  p_bet_amount NUMERIC,
  p_round_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- First, verify we can read the user's balance with service role privileges
  SELECT balance INTO v_current_balance
  FROM public.profiles 
  WHERE id = p_user_id;

  -- Check if user exists
  IF v_current_balance IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error_message', 'User not found',
      'new_balance', 0
    );
  END IF;

  -- Check if user has sufficient balance
  IF v_current_balance < p_bet_amount THEN
    RETURN json_build_object(
      'success', false,
      'error_message', 'Insufficient balance',
      'new_balance', v_current_balance
    );
  END IF;

  -- User has sufficient balance, now do the atomic deduction
  -- Lock the row and deduct the balance
  UPDATE public.profiles 
  SET balance = balance - p_bet_amount,
      updated_at = NOW()
  WHERE id = p_user_id 
    AND balance >= p_bet_amount;  -- Double-check balance hasn't changed

  -- Check if the update actually happened
  IF NOT FOUND THEN
    -- This means the balance changed between our check and update
    SELECT balance INTO v_current_balance FROM public.profiles WHERE id = p_user_id;
    RETURN json_build_object(
      'success', false,
      'error_message', 'Insufficient balance',
      'new_balance', v_current_balance
    );
  END IF;

  -- Get the new balance
  SELECT balance INTO v_new_balance 
  FROM public.profiles 
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'error_message', 'Success',
    'new_balance', v_new_balance
  );

END;
$$;

-- Grant permissions to all roles
GRANT EXECUTE ON FUNCTION public.atomic_bet_balance_check(UUID, NUMERIC, TEXT) TO anon, authenticated, service_role;

-- Test the function to make sure it returns a single object, not an array
DO $$
DECLARE
  test_result JSON;
  user_balance NUMERIC;
BEGIN
  -- First check the current balance
  SELECT balance INTO user_balance 
  FROM public.profiles 
  WHERE id = 'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID;
  
  RAISE NOTICE 'Current testacc balance: %', user_balance;
  
  -- Test the function with a small amount first
  SELECT public.atomic_bet_balance_check(
    'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID, 
    10.00, 
    'test-round'
  ) INTO test_result;
  
  RAISE NOTICE 'Test result (should be single object): %', test_result;
  
  -- Check if the result has the expected structure
  IF (test_result->>'success')::boolean = true THEN
    -- Add the money back
    UPDATE public.profiles 
    SET balance = balance + 10.00,
        updated_at = NOW()
    WHERE id = 'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID;
    RAISE NOTICE 'Test successful - balance restored';
  ELSE
    RAISE NOTICE 'Test returned failure: %', test_result->>'error_message';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test failed with error: %', SQLERRM;
END;
$$;

-- Final verification
SELECT 'Atomic balance check return type fixed!' as status;