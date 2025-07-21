-- Create a test function to verify the real-time system works
CREATE OR REPLACE FUNCTION public.test_realtime_feed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  test_user_id UUID;
  test_username TEXT;
BEGIN
  -- Get a real user for testing
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found for testing';
  END IF;
  
  -- Get the username
  SELECT username INTO test_username FROM profiles WHERE id = test_user_id;
  
  -- Insert directly into live_bet_feed to test realtime
  INSERT INTO public.live_bet_feed (
    user_id,
    username,
    game_type,
    bet_amount,
    result,
    profit,
    multiplier,
    game_data
  ) VALUES (
    test_user_id,
    test_username,
    'coinflip',
    1.00,
    'win',
    1.00,
    2.0,
    '{"test": true, "choice": "heads", "coinResult": "heads"}'::jsonb
  );
  
  RAISE NOTICE 'Test record inserted for user: %', test_username;
END;
$function$;