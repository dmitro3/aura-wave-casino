-- 🔧 DEBUG AND FIX LEVEL CALCULATION
-- Fix the test user's level calculation and debug the issue

BEGIN;

DO $$ BEGIN RAISE NOTICE '🔧 Debugging level calculation issue...'; END $$;

-- Test the level calculation function with 1011 XP
DO $$
DECLARE
  test_xp integer := 1011;
  level_result RECORD;
BEGIN
  RAISE NOTICE '🧪 Testing calculate_level_from_xp with % XP:', test_xp;
  
  SELECT * INTO level_result 
  FROM public.calculate_level_from_xp(test_xp);
  
  RAISE NOTICE 'Function returned: Level %, Current Level XP %, XP to Next %', 
    level_result.user_level, level_result.current_level_xp, level_result.xp_to_next;
    
  -- Check the requirements manually
  RAISE NOTICE 'Level 1 requirement: %', (SELECT xp_required FROM public.level_xp_requirements WHERE level = 1);
  RAISE NOTICE 'Level 2 requirement: %', (SELECT xp_required FROM public.level_xp_requirements WHERE level = 2);
  
  -- Manual calculation verification
  RAISE NOTICE 'Manual check: 1011 - 651 = % (should be level 2 current XP)', (1011 - 651);
  RAISE NOTICE 'Expected: Level 2, Current Level XP 360, XP to Next 291 (651-360)';
END $$;

-- Check current test user stats
DO $$
DECLARE
  test_user_id uuid := '7420ed48-4a12-4544-b5b6-05a52293ba22';
  current_stats RECORD;
BEGIN
  SELECT * INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  IF current_stats IS NOT NULL THEN
    RAISE NOTICE '📊 Current test user stats:';
    RAISE NOTICE '  - Current Level: % (SHOULD BE 2)', current_stats.current_level;
    RAISE NOTICE '  - Lifetime XP: %', current_stats.lifetime_xp;
    RAISE NOTICE '  - Current Level XP: % (CORRECT)', current_stats.current_level_xp;
    RAISE NOTICE '  - XP to Next: % (CORRECT)', current_stats.xp_to_next_level;
  ELSE
    RAISE NOTICE '❌ Test user not found';
  END IF;
END $$;

-- Create a comprehensive user level recalculation function
CREATE OR REPLACE FUNCTION public.recalculate_user_levels()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  user_record RECORD;
  level_result RECORD;
  updates_count integer := 0;
BEGIN
  RAISE NOTICE '🔄 Starting comprehensive user level recalculation...';
  
  -- Loop through all users with lifetime_xp
  FOR user_record IN 
    SELECT user_id, current_level, lifetime_xp 
    FROM public.user_level_stats 
    WHERE lifetime_xp IS NOT NULL AND lifetime_xp > 0
  LOOP
    -- Calculate what the level should be
    SELECT * INTO level_result 
    FROM public.calculate_level_from_xp(ROUND(user_record.lifetime_xp, 3)::integer);
    
    -- Check if level needs updating
    IF user_record.current_level != level_result.user_level THEN
      RAISE NOTICE 'Updating user %: Level % → %, Lifetime XP %', 
        user_record.user_id, user_record.current_level, level_result.user_level, user_record.lifetime_xp;
      
      -- Update the user's level
      UPDATE public.user_level_stats
      SET 
        current_level = level_result.user_level,
        current_level_xp = level_result.current_level_xp,
        xp_to_next_level = level_result.xp_to_next,
        updated_at = now()
      WHERE user_id = user_record.user_id;
      
      updates_count := updates_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Recalculation complete. Updated % users.', updates_count;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.recalculate_user_levels() TO anon, authenticated, service_role;

-- Run the recalculation
SELECT public.recalculate_user_levels();

-- Verify the test user after recalculation
DO $$
DECLARE
  test_user_id uuid := '7420ed48-4a12-4544-b5b6-05a52293ba22';
  current_stats RECORD;
BEGIN
  SELECT * INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  IF current_stats IS NOT NULL THEN
    RAISE NOTICE '📊 Test user stats AFTER recalculation:';
    RAISE NOTICE '  - Current Level: % (SHOULD BE 2)', current_stats.current_level;
    RAISE NOTICE '  - Lifetime XP: %', current_stats.lifetime_xp;
    RAISE NOTICE '  - Current Level XP: %', current_stats.current_level_xp;
    RAISE NOTICE '  - XP to Next: %', current_stats.xp_to_next_level;
    
    IF current_stats.current_level = 2 THEN
      RAISE NOTICE '✅ SUCCESS: Test user is now Level 2!';
    ELSE
      RAISE NOTICE '❌ STILL BROKEN: Test user is still Level %', current_stats.current_level;
    END IF;
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE '✅ Level calculation debug and fix complete!'; END $$;

COMMIT;