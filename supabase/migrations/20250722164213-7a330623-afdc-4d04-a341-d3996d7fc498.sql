-- Fix search path security issues for existing functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp integer)
RETURNS TABLE(level integer, current_level_xp integer, xp_to_next integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  current_level_num INTEGER := 1;
  current_level_start INTEGER := 0;
  next_level_requirement INTEGER;
BEGIN
  -- Find the current level
  SELECT lr.level, lr.xp_required 
  INTO current_level_num, current_level_start
  FROM public.level_rewards lr
  WHERE lr.xp_required <= total_xp
  ORDER BY lr.level DESC
  LIMIT 1;
  
  -- Get next level requirement
  SELECT lr.xp_required 
  INTO next_level_requirement
  FROM public.level_rewards lr
  WHERE lr.level = current_level_num + 1;
  
  -- If no next level exists, use a calculated value
  IF next_level_requirement IS NULL THEN
    next_level_requirement := current_level_start + (3000 + (current_level_num - 10) * 500);
  END IF;
  
  RETURN QUERY SELECT 
    current_level_num,
    total_xp - current_level_start,
    next_level_requirement - total_xp;
END;
$function$;