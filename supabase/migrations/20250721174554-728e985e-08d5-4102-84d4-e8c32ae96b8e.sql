-- Fix critical security issues

-- 1. Enable RLS on level_rewards table (currently disabled)
ALTER TABLE public.level_rewards ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to level rewards
CREATE POLICY "Anyone can view level rewards" 
ON public.level_rewards 
FOR SELECT 
USING (true);

-- 2. Update database functions with proper search_path security
-- This prevents search path manipulation attacks

-- Update add_xp_and_check_levelup function
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount integer)
 RETURNS TABLE(leveled_up boolean, new_level integer, bonus_earned numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  old_level INTEGER;
  new_level_calc INTEGER;
  old_xp INTEGER;
  new_total_xp INTEGER;
  level_bonus NUMERIC := 0;
  did_level_up BOOLEAN := false;
BEGIN
  -- Get current level and XP
  SELECT current_level, lifetime_xp INTO old_level, old_xp
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- Calculate new total XP
  new_total_xp := old_xp + xp_amount;
  
  -- Calculate new level
  SELECT calc.level INTO new_level_calc
  FROM public.calculate_level_from_xp(new_total_xp) calc;
  
  -- Check if leveled up
  IF new_level_calc > old_level THEN
    did_level_up := true;
    
    -- Get bonus for new level
    SELECT bonus_amount INTO level_bonus
    FROM public.level_rewards
    WHERE level = new_level_calc;
    
    -- If no specific bonus, calculate random bonus for level 5+
    IF level_bonus IS NULL AND new_level_calc >= 5 THEN
      level_bonus := 1000 + (random() * 4000); -- Random between 1000-5000
    END IF;
    
    -- Update profile with new level, XP, and bonus
    UPDATE public.profiles 
    SET 
      current_level = new_level_calc,
      lifetime_xp = new_total_xp,
      current_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(new_total_xp) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(new_total_xp) calc),
      balance = balance + COALESCE(level_bonus, 0),
      updated_at = now()
    WHERE id = user_uuid;
  ELSE
    -- Just update XP without level change
    UPDATE public.profiles 
    SET 
      lifetime_xp = new_total_xp,
      current_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(new_total_xp) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(new_total_xp) calc),
      updated_at = now()
    WHERE id = user_uuid;
  END IF;
  
  RETURN QUERY SELECT did_level_up, new_level_calc, COALESCE(level_bonus, 0);
END;
$function$;

-- Update calculate_level_from_xp function
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp integer)
 RETURNS TABLE(level integer, current_level_xp integer, xp_to_next integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path = public, pg_temp
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

-- Update add_to_live_feed function
CREATE OR REPLACE FUNCTION public.add_to_live_feed(p_user_id uuid, p_game_type text, p_bet_amount numeric, p_result text, p_profit numeric, p_multiplier numeric DEFAULT NULL::numeric, p_game_data jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  user_name TEXT;
BEGIN
  -- Get username
  SELECT username INTO user_name
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Insert into live feed
  INSERT INTO public.live_bet_feed (
    user_id, username, game_type, bet_amount, result, profit, multiplier, game_data
  ) VALUES (
    p_user_id, user_name, p_game_type, p_bet_amount, p_result, p_profit, p_multiplier, p_game_data
  );
END;
$function$;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, registration_date, balance, level, xp, total_wagered, total_profit, last_claim_time, badges)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substr(NEW.id::text, 1, 8)),
    NEW.created_at,
    0,
    1,
    0,
    0,
    0,
    '1970-01-01T00:00:00Z',
    ARRAY['welcome']
  );
  RETURN NEW;
END;
$function$;