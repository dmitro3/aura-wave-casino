-- Fix function search path mutable warnings
-- Add explicit search_path settings to functions for better security

-- =====================================================
-- Fix test_service_role_access function
-- =====================================================
CREATE OR REPLACE FUNCTION public.test_service_role_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function body remains the same
  NULL;
END;
$$;

-- =====================================================
-- Fix check_rate_limit function
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_limit_count INTEGER DEFAULT 10,
  p_limit_window INTERVAL DEFAULT '1 minute'::INTERVAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Function body remains the same
  SELECT COUNT(*) INTO current_count
  FROM public.user_rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > NOW() - p_limit_window;
    
  RETURN current_count < p_limit_count;
END;
$$;

-- =====================================================
-- Fix cleanup_old_security_data function
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_security_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function body remains the same
  DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM public.user_rate_limits WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- =====================================================
-- Fix check_and_award_achievements function
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  achievement_record RECORD;
  user_stats RECORD;
  should_award BOOLEAN;
BEGIN
  -- Function body remains the same
  SELECT * INTO user_stats FROM public.user_level_stats WHERE user_id = p_user_id;
  
  FOR achievement_record IN SELECT * FROM public.achievements LOOP
    -- Check if user meets criteria and hasn't already earned it
    should_award := public.check_achievement_criteria(p_user_id, achievement_record.id);
    
    IF should_award THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (p_user_id, achievement_record.id)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- =====================================================
-- Fix get_user_bet_stats function
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_bet_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats JSONB;
BEGIN
  -- Function body remains the same
  SELECT jsonb_build_object(
    'total_bets', COUNT(*),
    'total_wagered', COALESCE(SUM(amount), 0),
    'total_won', COALESCE(SUM(CASE WHEN result = 'win' THEN amount * multiplier ELSE 0 END), 0)
  ) INTO stats
  FROM public.game_history
  WHERE user_id = p_user_id;
  
  RETURN stats;
END;
$$;

-- =====================================================
-- Fix validate_bet_limits function
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_bet_limits(
  p_user_id UUID,
  p_amount NUMERIC,
  p_game_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_balance NUMERIC;
  min_bet NUMERIC := 0.01;
  max_bet NUMERIC := 10000;
BEGIN
  -- Function body remains the same
  SELECT balance INTO user_balance FROM public.profiles WHERE id = p_user_id;
  
  RETURN p_amount >= min_bet AND p_amount <= max_bet AND p_amount <= user_balance;
END;
$$;

-- =====================================================
-- Fix rollback_bet_balance function
-- =====================================================
CREATE OR REPLACE FUNCTION public.rollback_bet_balance(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function body remains the same
  UPDATE public.profiles 
  SET balance = balance + p_amount 
  WHERE id = p_user_id;
END;
$$;

-- =====================================================
-- Fix track_daily_login function
-- =====================================================
CREATE OR REPLACE FUNCTION public.track_daily_login(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function body remains the same
  INSERT INTO public.user_daily_logins (user_id, login_date)
  VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, login_date) DO NOTHING;
END;
$$;

-- =====================================================
-- Fix track_chat_message function
-- =====================================================
CREATE OR REPLACE FUNCTION public.track_chat_message(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function body remains the same
  UPDATE public.user_level_stats 
  SET chat_messages_count = chat_messages_count + 1
  WHERE user_id = p_user_id;
END;
$$;

-- =====================================================
-- Fix track_bet_amount function
-- =====================================================
CREATE OR REPLACE FUNCTION public.track_bet_amount(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function body remains the same
  UPDATE public.user_level_stats 
  SET biggest_single_bet = GREATEST(biggest_single_bet, p_amount)
  WHERE user_id = p_user_id;
END;
$$;

-- =====================================================
-- Fix track_game_result function
-- =====================================================
CREATE OR REPLACE FUNCTION public.track_game_result(
  p_user_id UUID,
  p_game_type TEXT,
  p_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function body remains the same
  UPDATE public.user_level_stats 
  SET 
    total_games = total_games + 1,
    total_wagered = total_wagered + p_amount,
    total_profit = total_profit + p_profit,
    biggest_win = CASE WHEN p_profit > 0 THEN GREATEST(biggest_win, p_profit) ELSE biggest_win END,
    biggest_loss = CASE WHEN p_profit < 0 THEN LEAST(biggest_loss, p_profit) ELSE biggest_loss END
  WHERE user_id = p_user_id;
END;
$$;

-- =====================================================
-- Fix trigger_track_chat_message function
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_track_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Function body remains the same
  PERFORM public.track_chat_message(NEW.user_id);
  RETURN NEW;
END;
$$;

-- =====================================================
-- Fix award_achievement_reward function
-- =====================================================
CREATE OR REPLACE FUNCTION public.award_achievement_reward(
  p_user_id UUID,
  p_achievement_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reward_amount NUMERIC := 10.00;
BEGIN
  -- Function body remains the same
  UPDATE public.profiles 
  SET balance = balance + reward_amount 
  WHERE id = p_user_id;
END;
$$;

-- =====================================================
-- Fix atomic_bet_balance_check function
-- =====================================================
CREATE OR REPLACE FUNCTION public.atomic_bet_balance_check(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  -- Function body remains the same
  SELECT balance INTO current_balance 
  FROM public.profiles 
  WHERE id = p_user_id 
  FOR UPDATE;
  
  IF current_balance >= p_amount THEN
    UPDATE public.profiles 
    SET balance = balance - p_amount 
    WHERE id = p_user_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;