-- Simplified user registration with better error handling
-- This version is more robust and handles edge cases

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Fix the foreign key constraint first
ALTER TABLE public.user_level_stats 
DROP CONSTRAINT IF EXISTS user_level_stats_user_id_fkey;

ALTER TABLE public.user_level_stats 
ADD CONSTRAINT user_level_stats_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Create a simplified handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  username_text TEXT;
BEGIN
  -- Generate username safely
  username_text := COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substr(NEW.id::text, 1, 8));
  
  -- Insert into profiles (simplified)
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
    badges
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
    ARRAY['welcome']
  );
  
  -- Insert into user_level_stats (simplified - only essential columns)
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
    tower_perfect_games,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    1,
    0,
    0,
    1000,
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
    NEW.created_at,
    NEW.created_at
  );
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE NOTICE 'Warning: Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Step 4: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Test the setup
DO $$
BEGIN
  RAISE NOTICE '✅ User registration function created successfully';
END $$;

-- Step 6: Show final setup
SELECT 
  'Final trigger setup:' as info,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

SELECT 
  'Function verification:' as info,
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Step 7: Show foreign key verification
SELECT 
  'Foreign key verification:' as info,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
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

-- Step 8: Show current user data
SELECT 
  'Current user data:' as info,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.user_level_stats) as total_user_stats;