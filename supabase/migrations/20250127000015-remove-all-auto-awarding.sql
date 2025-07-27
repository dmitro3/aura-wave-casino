-- Remove ALL auto-awarding logic from achievement functions
-- This ensures achievements can ONLY be claimed manually

-- First, let's see what triggers exist
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_level_stats' 
AND trigger_schema = 'public';

-- Drop ALL triggers that might auto-award achievements
DROP TRIGGER IF EXISTS check_achievements_trigger ON public.user_level_stats;
DROP TRIGGER IF EXISTS check_ready_achievements_trigger ON public.user_level_stats;

-- Drop the functions first before recreating them
DROP FUNCTION IF EXISTS public.check_and_award_achievements(uuid);
DROP FUNCTION IF EXISTS public.check_ready_achievements(uuid);
DROP FUNCTION IF EXISTS public.trigger_check_ready_achievements();

-- Completely disable the main auto-awarding function
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- This function now does NOTHING - no auto-awarding at all
  -- Achievements can only be claimed manually through the UI
  RETURN json_build_object(
    'message', 'Auto-awarding completely disabled',
    'newly_unlocked', '[]'::json
  );
END;
$$;

-- Disable the ready achievements function
CREATE OR REPLACE FUNCTION public.check_ready_achievements(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- This function now does NOTHING - no auto-checking
  RETURN json_build_object(
    'message', 'Auto-checking completely disabled',
    'ready_achievements', '[]'::json
  );
END;
$$;

-- Disable the trigger function
CREATE OR REPLACE FUNCTION public.trigger_check_ready_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- This trigger now does NOTHING - no auto-processing
  RETURN NEW;
END;
$$;

-- Create a completely disabled trigger
CREATE TRIGGER check_ready_achievements_trigger
  AFTER UPDATE ON public.user_level_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_ready_achievements();

-- Verify the trigger is disabled
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_level_stats' 
AND trigger_schema = 'public';