-- 🔧 FIX XP AWARD RECORD CREATION
-- Fix award_xp_for_wager to ensure user_level_stats record exists before updating

BEGIN;

DO $$ BEGIN RAISE NOTICE '🔧 Fixing award_xp_for_wager record creation...'; END $$;

-- Update XP awarding function to ensure record exists before updating
CREATE OR REPLACE FUNCTION public.award_xp_for_wager(p_user_id uuid, p_wager_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_xp_to_award numeric;
  v_old_level integer;
  v_new_level integer;
  v_level_result RECORD;
BEGIN
  -- Calculate XP to award: 10% of wager amount (0.1 XP per $1)
  -- Minimum 0.001 XP for very small bets
  v_xp_to_award := GREATEST(p_wager_amount * 0.1, 0.001);
  
  -- Ensure user_level_stats record exists (same as update_game_statistics)
  INSERT INTO public.user_level_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current level before XP update
  SELECT current_level INTO v_old_level 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  -- Update lifetime XP and current XP
  UPDATE public.user_level_stats
  SET 
    lifetime_xp = COALESCE(lifetime_xp, 0) + v_xp_to_award,
    current_xp = COALESCE(current_xp, 0) + v_xp_to_award,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Recalculate level based on new lifetime XP
  SELECT * INTO v_level_result 
  FROM public.calculate_level_from_xp(ROUND((
    SELECT lifetime_xp 
    FROM public.user_level_stats 
    WHERE user_id = p_user_id
  ), 3)::integer);
  
  -- Update level stats with calculated values
  UPDATE public.user_level_stats
  SET 
    current_level = v_level_result.user_level,
    current_level_xp = v_level_result.current_level_xp,
    xp_to_next_level = v_level_result.xp_to_next,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Get new level after update
  v_new_level := v_level_result.user_level;
  
  -- If user leveled up, create notification
  IF v_old_level IS NOT NULL AND v_new_level > v_old_level THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      p_user_id,
      'level_up',
      'Level Up!',
      format('Congratulations! You reached level %s!', v_new_level),
      jsonb_build_object(
        'old_level', v_old_level,
        'new_level', v_new_level,
        'xp_awarded', v_xp_to_award
      )
    );
  END IF;
  
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.award_xp_for_wager(uuid, numeric) TO anon, authenticated, service_role;

-- Fix the specific test user who has incorrect level
DO $$
DECLARE
  test_user_id uuid := '7420ed48-4a12-4544-b5b6-05a52293ba22';
  current_stats RECORD;
  level_result RECORD;
  rounded_xp integer;
BEGIN
  RAISE NOTICE '🔧 Fixing test user level...';
  
  -- Get current user stats
  SELECT * INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  IF current_stats IS NOT NULL THEN
    RAISE NOTICE 'Found user with Lifetime XP: %, Current Level: %', 
      current_stats.lifetime_xp, current_stats.current_level;
    
    -- Test the conversion and calculation
    rounded_xp := ROUND(current_stats.lifetime_xp, 3)::integer;
    
    SELECT * INTO level_result 
    FROM public.calculate_level_from_xp(rounded_xp);
    
    RAISE NOTICE 'Level calculation: % XP should be Level %, Current Level XP %, XP to Next %', 
      rounded_xp, level_result.user_level, level_result.current_level_xp, level_result.xp_to_next;
    
    -- Update the user's level
    UPDATE public.user_level_stats
    SET 
      current_level = level_result.user_level,
      current_level_xp = level_result.current_level_xp,
      xp_to_next_level = level_result.xp_to_next,
      updated_at = now()
    WHERE user_id = test_user_id;
    
    RAISE NOTICE '✅ Updated test user to Level %', level_result.user_level;
  ELSE
    RAISE NOTICE '❌ Test user not found in user_level_stats';
  END IF;
END $$;

-- Also run a global recalculation for any other users with incorrect levels
UPDATE public.user_level_stats
SET 
  current_level = (SELECT user_level FROM public.calculate_level_from_xp(ROUND(lifetime_xp, 3)::integer)),
  current_level_xp = (SELECT current_level_xp FROM public.calculate_level_from_xp(ROUND(lifetime_xp, 3)::integer)),
  xp_to_next_level = (SELECT xp_to_next FROM public.calculate_level_from_xp(ROUND(lifetime_xp, 3)::integer))
WHERE lifetime_xp IS NOT NULL AND lifetime_xp >= 0
  AND current_level != (SELECT user_level FROM public.calculate_level_from_xp(ROUND(lifetime_xp, 3)::integer));

DO $$ BEGIN RAISE NOTICE '✅ Fixed award_xp_for_wager record creation and recalculated levels!'; END $$;

COMMIT;