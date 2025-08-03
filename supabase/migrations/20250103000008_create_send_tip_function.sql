-- ===============================================
-- CREATE ATOMIC TIP SENDING FUNCTION
-- ===============================================
-- This function handles tip transactions atomically with proper security

-- Drop function if it exists
DROP FUNCTION IF EXISTS public.send_tip(UUID, UUID, NUMERIC, TEXT) CASCADE;

-- Create atomic tip sending function
CREATE OR REPLACE FUNCTION public.send_tip(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_amount NUMERIC,
  p_message TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  error_message TEXT,
  sender_new_balance NUMERIC,
  receiver_new_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_receiver_balance NUMERIC;
  v_new_sender_balance NUMERIC;
  v_new_receiver_balance NUMERIC;
  v_tip_id UUID;
BEGIN
  -- Validate inputs
  IF p_from_user_id IS NULL OR p_to_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid user IDs', 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  IF p_from_user_id = p_to_user_id THEN
    RETURN QUERY SELECT FALSE, 'Cannot tip yourself', 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, 'Invalid tip amount', 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  IF p_amount < 0.01 THEN
    RETURN QUERY SELECT FALSE, 'Minimum tip amount is $0.01', 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Start transaction block
  BEGIN
    -- Lock and get sender's current balance
    SELECT balance INTO v_sender_balance
    FROM public.profiles
    WHERE id = p_from_user_id
    FOR UPDATE;

    -- Check if sender exists
    IF v_sender_balance IS NULL THEN
      RETURN QUERY SELECT FALSE, 'Sender not found', 0::NUMERIC, 0::NUMERIC;
      RETURN;
    END IF;

    -- Check if sender has sufficient balance
    IF v_sender_balance < p_amount THEN
      RETURN QUERY SELECT FALSE, 'Insufficient balance', v_sender_balance, 0::NUMERIC;
      RETURN;
    END IF;

    -- Lock and get receiver's current balance
    SELECT balance INTO v_receiver_balance
    FROM public.profiles
    WHERE id = p_to_user_id
    FOR UPDATE;

    -- Check if receiver exists
    IF v_receiver_balance IS NULL THEN
      RETURN QUERY SELECT FALSE, 'Receiver not found', v_sender_balance, 0::NUMERIC;
      RETURN;
    END IF;

    -- Calculate new balances
    v_new_sender_balance := v_sender_balance - p_amount;
    v_new_receiver_balance := v_receiver_balance + p_amount;

    -- Update sender's balance
    UPDATE public.profiles
    SET balance = v_new_sender_balance,
        updated_at = NOW()
    WHERE id = p_from_user_id;

    -- Update receiver's balance
    UPDATE public.profiles
    SET balance = v_new_receiver_balance,
        updated_at = NOW()
    WHERE id = p_to_user_id;

    -- Insert tip record
    INSERT INTO public.tips (from_user_id, to_user_id, amount, message)
    VALUES (p_from_user_id, p_to_user_id, p_amount, p_message)
    RETURNING id INTO v_tip_id;

    -- Return success
    RETURN QUERY SELECT TRUE, 'Tip sent successfully', v_new_sender_balance, v_new_receiver_balance;

  EXCEPTION WHEN OTHERS THEN
    -- Rollback happens automatically on exception
    RETURN QUERY SELECT FALSE, 'Transaction failed: ' || SQLERRM, 0::NUMERIC, 0::NUMERIC;
  END;

END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.send_tip(UUID, UUID, NUMERIC, TEXT) TO anon, authenticated, service_role;

-- Test the function with a dry run (amount 0 should fail validation)
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Test with invalid amount (should fail)
  SELECT * INTO test_result FROM public.send_tip(
    'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID,
    'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID,
    0.00,
    'test'
  );
  
  RAISE NOTICE 'Test result: success=%, message=%', 
    test_result.success, test_result.error_message;
  
  IF test_result.success = FALSE AND test_result.error_message LIKE '%Invalid%' THEN
    RAISE NOTICE '✅ Function validation working correctly';
  ELSE
    RAISE NOTICE '❌ Function validation failed';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test failed with error: %', SQLERRM;
END;
$$;

-- Final verification
SELECT 'Atomic tip sending function created successfully!' as status;