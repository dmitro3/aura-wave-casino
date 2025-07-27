-- Complete elimination of ALL auto-achievement claiming
-- This migration ensures achievements can ONLY be claimed manually

-- Step 1: Check what triggers currently exist
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Step 2: Check what functions currently exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%achievement%';

-- Step 3: Drop ALL possible triggers
DROP TRIGGER IF EXISTS check_achievements_trigger ON public.user_level_stats;
DROP TRIGGER IF EXISTS check_ready_achievements_trigger ON public.user_level_stats;
DROP TRIGGER IF EXISTS check_achievements_trigger ON public.profiles;
DROP TRIGGER IF EXISTS check_ready_achievements_trigger ON public.profiles;

-- Step 4: Drop ALL functions that might auto-award
DROP FUNCTION IF EXISTS public.check_and_award_achievements(uuid);
DROP FUNCTION IF EXISTS public.check_ready_achievements(uuid);
DROP FUNCTION IF EXISTS public.trigger_check_ready_achievements();
DROP FUNCTION IF EXISTS public.trigger_check_achievements();

-- Step 5: Create a completely disabled version of the main function
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- This function now does ABSOLUTELY NOTHING
  -- No database inserts, no reward awarding, nothing
  RETURN json_build_object(
    'message', 'Auto-awarding completely disabled - manual claiming only',
    'newly_unlocked', '[]'::json
  );
END;
$$;

-- Step 6: Create a completely disabled version of the ready achievements function
CREATE OR REPLACE FUNCTION public.check_ready_achievements(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- This function now does ABSOLUTELY NOTHING
  -- No database inserts, no reward awarding, nothing
  RETURN json_build_object(
    'message', 'Auto-checking completely disabled - manual checking only',
    'ready_achievements', '[]'::json
  );
END;
$$;

-- Step 7: Create completely disabled trigger functions
CREATE OR REPLACE FUNCTION public.trigger_check_ready_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- This trigger now does ABSOLUTELY NOTHING
  -- No function calls, no processing, nothing
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_check_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- This trigger now does ABSOLUTELY NOTHING
  -- No function calls, no processing, nothing
  RETURN NEW;
END;
$$;

-- Step 8: Create completely disabled triggers
CREATE TRIGGER check_ready_achievements_trigger
  AFTER UPDATE ON public.user_level_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_ready_achievements();

CREATE TRIGGER check_achievements_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_achievements();

-- Step 9: Verify ALL triggers are disabled
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND (event_object_table = 'user_level_stats' OR event_object_table = 'profiles');

-- Step 10: Verify ALL functions are disabled
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%achievement%';

-- Step 11: Check if there are any other functions that might insert into user_achievements
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_definition LIKE '%INSERT INTO%user_achievements%';