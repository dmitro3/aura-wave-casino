-- Aggressively disable ALL auto-achievement claiming
-- This migration ensures achievements can ONLY be claimed manually by users

-- First, let's see ALL triggers that might be causing issues
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Drop ALL possible triggers that might auto-award achievements
DROP TRIGGER IF EXISTS check_achievements_trigger ON public.user_level_stats;
DROP TRIGGER IF EXISTS check_ready_achievements_trigger ON public.user_level_stats;
DROP TRIGGER IF EXISTS check_achievements_trigger ON public.profiles;
DROP TRIGGER IF EXISTS check_ready_achievements_trigger ON public.profiles;

-- Drop ALL functions that might auto-award achievements
DROP FUNCTION IF EXISTS public.check_and_award_achievements(uuid);
DROP FUNCTION IF EXISTS public.check_ready_achievements(uuid);
DROP FUNCTION IF EXISTS public.trigger_check_ready_achievements();
DROP FUNCTION IF EXISTS public.trigger_check_achievements();

-- Create a completely disabled version of the main function
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
  -- No auto-awarding, no database inserts, nothing
  RETURN json_build_object(
    'message', 'Auto-awarding completely disabled - manual claiming only',
    'newly_unlocked', '[]'::json
  );
END;
$$;

-- Create a completely disabled version of the ready achievements function
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
  -- No auto-checking, no processing, nothing
  RETURN json_build_object(
    'message', 'Auto-checking completely disabled - manual checking only',
    'ready_achievements', '[]'::json
  );
END;
$$;

-- Create a completely disabled trigger function
CREATE OR REPLACE FUNCTION public.trigger_check_ready_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- This trigger now does ABSOLUTELY NOTHING
  -- No auto-processing, no function calls, nothing
  RETURN NEW;
END;
$$;

-- Create a completely disabled trigger function for the old trigger
CREATE OR REPLACE FUNCTION public.trigger_check_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- This trigger now does ABSOLUTELY NOTHING
  -- No auto-processing, no function calls, nothing
  RETURN NEW;
END;
$$;

-- Create completely disabled triggers
CREATE TRIGGER check_ready_achievements_trigger
  AFTER UPDATE ON public.user_level_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_ready_achievements();

-- Also check if there are any other triggers on other tables that might auto-award
-- Let's disable any triggers on profiles table too
CREATE TRIGGER check_achievements_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_achievements();

-- Verify ALL triggers are disabled
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND (event_object_table = 'user_level_stats' OR event_object_table = 'profiles');

-- Also check if there are any other functions that might insert into user_achievements
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%achievement%';