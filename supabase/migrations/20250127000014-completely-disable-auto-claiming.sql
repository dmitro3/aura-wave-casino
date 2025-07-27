-- Completely disable auto-achievement claiming
-- This migration ensures achievements can ONLY be claimed manually by users

-- Drop ALL possible triggers that might auto-award achievements
DROP TRIGGER IF EXISTS check_achievements_trigger ON public.user_level_stats;
DROP TRIGGER IF EXISTS check_ready_achievements_trigger ON public.user_level_stats;

-- Drop the functions first before recreating them
DROP FUNCTION IF EXISTS public.check_and_award_achievements(uuid);
DROP FUNCTION IF EXISTS public.check_ready_achievements(uuid);
DROP FUNCTION IF EXISTS public.trigger_check_ready_achievements();

-- Disable the old auto-awarding function by replacing it with a no-op version
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- This function now does NOTHING - no auto-awarding
  -- Achievements can only be claimed manually through the UI
  RETURN '{"message": "Auto-awarding disabled - manual claiming only"}'::JSON;
END;
$$;

-- Disable the ready achievements function as well
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
  -- Achievements are only checked when the UI loads
  RETURN '{"message": "Auto-checking disabled - manual checking only"}'::JSON;
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
  -- Achievements are only processed when users manually claim them
  RETURN NEW;
END;
$$;

-- Create a new trigger that does absolutely nothing
CREATE TRIGGER check_ready_achievements_trigger
  AFTER UPDATE ON public.user_level_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_ready_achievements();

-- Verify no triggers are auto-awarding achievements
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_level_stats' 
AND trigger_schema = 'public';