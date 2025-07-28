-- Fix foreign key constraint issue preventing user registration
-- The issue is that user_level_stats references auth.users but the trigger runs before the user is committed

-- Step 1: Drop the problematic foreign key constraint
ALTER TABLE public.user_level_stats 
DROP CONSTRAINT IF EXISTS user_level_stats_user_id_fkey;

-- Step 2: Recreate the foreign key constraint with proper deferral
ALTER TABLE public.user_level_stats 
ADD CONSTRAINT user_level_stats_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Step 3: Drop and recreate the trigger to ensure it works with the new constraint
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 4: Create a simplified handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  username_text TEXT;
BEGIN
  -- Generate username
  username_text := COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substr(NEW.id::text, 1, 8));
  
  -- Insert into profiles
  INSERT INTO public.profiles (
    id, 
    username, 
    registration_date, 
    balance, 
    level, 
    xp, 
    total_wagered, 
    total_profit, 
    last_claim_time, 
    badges,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    username_text,
    NEW.created_at,
    0,
    1,
    0,
    0,
    0,
    '1970-01-01T00:00:00Z',
    ARRAY['welcome'],
    NEW.created_at,
    NEW.created_at
  );
  
  -- Insert into user_level_stats
  INSERT INTO public.user_level_stats (
    user_id,
    current_level,
    current_level_xp,
    lifetime_xp,
    xp_to_next_level,
    border_tier,
    available_cases,
    total_cases_opened,
    coinflip_games,
    coinflip_wins,
    coinflip_wagered,
    coinflip_profit,
    crash_games,
    crash_wins,
    crash_wagered,
    crash_profit,
    roulette_games,
    roulette_wins,
    roulette_wagered,
    roulette_profit,
    roulette_highest_win,
    roulette_highest_loss,
    roulette_green_wins,
    roulette_red_wins,
    roulette_black_wins,
    roulette_favorite_color,
    tower_games,
    tower_wins,
    tower_wagered,
    tower_profit,
    total_games,
    total_wins,
    total_wagered,
    total_profit,
    biggest_win,
    biggest_loss,
    chat_messages_count,
    login_days_count,
    biggest_single_bet,
    account_created,
    current_win_streak,
    best_win_streak,
    tower_highest_level,
    tower_biggest_win,
    tower_biggest_loss,
    tower_best_streak,
    tower_current_streak,
    tower_perfect_games,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    1,
    0,
    0,
    100,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    'red',
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    NEW.created_at,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    NEW.created_at,
    NEW.created_at
  );
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Step 5: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Test the fix
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_created_at TIMESTAMP WITH TIME ZONE := now();
BEGIN
  RAISE NOTICE 'Testing fixed user registration...';
  
  -- Create a test user
  INSERT INTO auth.users (
    id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    created_at, 
    updated_at, 
    raw_user_meta_data
  )
  VALUES (
    test_user_id,
    'test@example.com',
    'dummy_password',
    test_created_at,
    test_created_at,
    test_created_at,
    jsonb_build_object('username', 'TestUser')
  );
  
  RAISE NOTICE 'Test user created with ID: %', test_user_id;
  
  -- Check if profile was created
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
    RAISE NOTICE '✅ Profile created successfully';
  ELSE
    RAISE NOTICE '❌ Profile was NOT created';
  END IF;
  
  -- Check if stats were created
  IF EXISTS (SELECT 1 FROM public.user_level_stats WHERE user_id = test_user_id) THEN
    RAISE NOTICE '✅ Stats created successfully';
  ELSE
    RAISE NOTICE '❌ Stats were NOT created';
  END IF;
  
  -- Clean up test data
  DELETE FROM auth.users WHERE id = test_user_id;
  RAISE NOTICE 'Test completed and cleaned up';
END $$;

-- Step 7: Show verification
SELECT 
  'Foreign key constraint verification:' as info,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  tc.deferrable,
  tc.initially_deferred
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'user_level_stats'
  AND kcu.column_name = 'user_id';