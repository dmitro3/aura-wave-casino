-- Security Fix 1: Add proper search_path to all database functions to prevent SQL injection
-- This ensures functions only access intended schemas and tables

-- Fix handle_game_completion function
CREATE OR REPLACE FUNCTION public.handle_game_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_name TEXT;
  streak_len INTEGER := 0;
  game_action TEXT := 'completed';
BEGIN
  -- Always add XP for wagering regardless of game type
  PERFORM public.add_xp_and_check_levelup(NEW.user_id, NEW.bet_amount::INTEGER);
  
  -- For coinflip games, ONLY add to live feed for concluded streaks (losses or cash-outs)
  -- NOT for intermediate wins (continue actions)
  IF NEW.game_type = 'coinflip' THEN
    IF NEW.game_data IS NOT NULL THEN
      game_action := COALESCE(NEW.game_data->>'action', 'completed');
      
      -- ONLY add to live feed for losses or cash-outs (NOT continue actions)
      IF game_action = 'lost' OR game_action = 'cash_out' THEN
        -- Get username
        SELECT username INTO user_name
        FROM public.profiles
        WHERE id = NEW.user_id;
        
        streak_len := COALESCE((NEW.game_data->>'streak_length')::INTEGER, 0);
        
        -- Insert ONCE into live feed for concluded streaks only
        INSERT INTO public.live_bet_feed (
          user_id, username, game_type, bet_amount, result, profit, multiplier, game_data, streak_length, action
        ) VALUES (
          NEW.user_id, user_name, NEW.game_type, NEW.bet_amount, NEW.result, NEW.profit, 
          CASE 
            WHEN NEW.game_data ? 'multiplier' THEN (NEW.game_data->>'multiplier')::NUMERIC
            ELSE NULL
          END,
          NEW.game_data, streak_len, game_action
        );
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- For other games (crash, tower, roulette), add to live feed normally
  SELECT username INTO user_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  IF NEW.game_data IS NOT NULL THEN
    streak_len := COALESCE((NEW.game_data->>'streak_length')::INTEGER, 0);
    game_action := COALESCE(NEW.game_data->>'action', 'completed');
  END IF;
  
  INSERT INTO public.live_bet_feed (
    user_id, username, game_type, bet_amount, result, profit, multiplier, game_data, streak_length, action
  ) VALUES (
    NEW.user_id, user_name, NEW.game_type, NEW.bet_amount, NEW.result, NEW.profit, 
    CASE 
      WHEN NEW.game_data ? 'multiplier' THEN (NEW.game_data->>'multiplier')::NUMERIC
      ELSE NULL
    END,
    NEW.game_data, streak_len, game_action
  );
  
  RETURN NEW;
END;
$function$;

-- Fix add_xp_and_check_levelup function
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount integer)
 RETURNS TABLE(leveled_up boolean, new_level integer, bonus_earned numeric, cases_earned integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  old_level INTEGER;
  new_level_calc INTEGER;
  old_xp INTEGER;
  new_total_xp INTEGER;
  level_bonus NUMERIC := 0;
  did_level_up BOOLEAN := false;
  old_border_tier INTEGER;
  new_border_tier INTEGER;
  cases_to_add INTEGER := 0;
  level_diff INTEGER;
  i INTEGER;
BEGIN
  -- Get current level and XP
  SELECT current_level, lifetime_xp, COALESCE(border_tier, 1) INTO old_level, old_xp, old_border_tier
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
    level_diff := new_level_calc - old_level;
    
    -- Calculate how many cases to award (every 25 levels)
    FOR i IN (old_level + 1)..new_level_calc LOOP
      IF i % 25 = 0 THEN
        cases_to_add := cases_to_add + 1;
        
        -- Create case reward entry
        INSERT INTO public.case_rewards (user_id, level_unlocked, rarity, reward_amount)
        VALUES (user_uuid, i, 'pending', 0);
      END IF;
    END LOOP;
    
    -- Calculate new border tier
    SELECT tier INTO new_border_tier
    FROM public.border_tiers
    WHERE new_level_calc >= min_level AND new_level_calc <= max_level;
    
    -- Update profile with new level, XP, border tier, and cases
    UPDATE public.profiles 
    SET 
      current_level = new_level_calc,
      lifetime_xp = new_total_xp,
      current_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(new_total_xp) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(new_total_xp) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier),
      available_cases = available_cases + cases_to_add,
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Create notifications for level-up and cases
    IF cases_to_add > 0 THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        user_uuid,
        'level_reward_case',
        'Level ' || new_level_calc || ' Reward Case!',
        'You''ve earned ' || cases_to_add || ' reward case(s) for reaching level ' || new_level_calc || '!',
        jsonb_build_object(
          'level', new_level_calc,
          'cases_earned', cases_to_add,
          'border_tier', new_border_tier
        )
      );
    END IF;
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
  
  RETURN QUERY SELECT did_level_up, new_level_calc, COALESCE(level_bonus, 0), cases_to_add;
END;
$function$;

-- Fix add_to_live_feed function
CREATE OR REPLACE FUNCTION public.add_to_live_feed(p_user_id uuid, p_game_type text, p_bet_amount numeric, p_result text, p_profit numeric, p_multiplier numeric DEFAULT NULL::numeric, p_game_data jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_name TEXT;
  streak_len INTEGER := 0;
  game_action TEXT := 'completed';
BEGIN
  -- Get username
  SELECT username INTO user_name
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Extract streak data from game_data if available
  IF p_game_data IS NOT NULL THEN
    streak_len := COALESCE((p_game_data->>'streak_length')::INTEGER, 0);
    game_action := COALESCE(p_game_data->>'action', 'completed');
  END IF;
  
  -- Insert into live feed
  INSERT INTO public.live_bet_feed (
    user_id, username, game_type, bet_amount, result, profit, multiplier, game_data, streak_length, action
  ) VALUES (
    p_user_id, user_name, p_game_type, p_bet_amount, p_result, p_profit, p_multiplier, p_game_data, streak_len, game_action
  );
END;
$function$;

-- Fix process_tip function
CREATE OR REPLACE FUNCTION public.process_tip(p_from_user_id uuid, p_to_user_id uuid, p_amount numeric, p_message text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  sender_balance NUMERIC;
BEGIN
  -- Validate input parameters
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid tip amount: must be greater than 0';
  END IF;
  
  IF p_amount > 10000 THEN
    RAISE EXCEPTION 'Tip amount too large: maximum is $10,000';
  END IF;
  
  -- Check if sender has enough balance
  SELECT balance INTO sender_balance
  FROM public.profiles
  WHERE id = p_from_user_id;
  
  IF sender_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Prevent self-tipping
  IF p_from_user_id = p_to_user_id THEN
    RAISE EXCEPTION 'Cannot tip yourself';
  END IF;
  
  -- Validate message length if provided
  IF p_message IS NOT NULL AND length(p_message) > 500 THEN
    RAISE EXCEPTION 'Tip message too long: maximum 500 characters';
  END IF;
  
  -- Update balances
  UPDATE public.profiles 
  SET balance = balance - p_amount
  WHERE id = p_from_user_id;
  
  UPDATE public.profiles 
  SET balance = balance + p_amount
  WHERE id = p_to_user_id;
  
  -- Record the tip
  INSERT INTO public.tips (from_user_id, to_user_id, amount, message)
  VALUES (p_from_user_id, p_to_user_id, p_amount, p_message);
  
  RETURN TRUE;
END;
$function$;

-- Fix create_tip_notifications function
CREATE OR REPLACE FUNCTION public.create_tip_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  sender_username TEXT;
  receiver_username TEXT;
BEGIN
  -- Get usernames
  SELECT username INTO sender_username FROM public.profiles WHERE id = NEW.from_user_id;
  SELECT username INTO receiver_username FROM public.profiles WHERE id = NEW.to_user_id;
  
  -- Create notification for sender (only one)
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.from_user_id,
    'tip_sent',
    'Tip Sent Successfully',
    'You sent $' || NEW.amount::TEXT || ' to ' || receiver_username,
    jsonb_build_object(
      'amount', NEW.amount,
      'to_username', receiver_username,
      'to_user_id', NEW.to_user_id,
      'tip_message', NEW.message,
      'tip_id', NEW.id
    )
  );
  
  -- Create notification for receiver (only one)
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.to_user_id,
    'tip_received',
    'Tip Received!',
    'You received $' || NEW.amount::TEXT || ' from ' || sender_username ||
    CASE 
      WHEN NEW.message IS NOT NULL AND NEW.message != '' 
      THEN ': "' || NEW.message || '"'
      ELSE ''
    END,
    jsonb_build_object(
      'amount', NEW.amount,
      'from_username', sender_username,
      'from_user_id', NEW.from_user_id,
      'tip_message', NEW.message,
      'tip_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$function$;

-- Add input validation function for bet amounts
CREATE OR REPLACE FUNCTION public.validate_bet_amount(p_amount numeric)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Check if bet amount is valid
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN false;
  END IF;
  
  -- Set reasonable maximum bet amount
  IF p_amount > 1000 THEN
    RETURN false;
  END IF;
  
  -- Check for reasonable precision (max 2 decimal places)
  IF p_amount::text ~ '\.[0-9]{3,}$' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- Add username validation function
CREATE OR REPLACE FUNCTION public.validate_username(p_username text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Check if username is valid
  IF p_username IS NULL OR length(trim(p_username)) = 0 THEN
    RETURN false;
  END IF;
  
  -- Length constraints
  IF length(p_username) < 3 OR length(p_username) > 20 THEN
    RETURN false;
  END IF;
  
  -- Only allow alphanumeric characters and underscores
  IF p_username !~ '^[a-zA-Z0-9_]+$' THEN
    RETURN false;
  END IF;
  
  -- Prevent reserved usernames
  IF lower(p_username) IN ('admin', 'moderator', 'system', 'null', 'undefined', 'test') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;