-- Enable realtime for existing tables
ALTER TABLE public.game_history REPLICA IDENTITY FULL;
ALTER TABLE public.game_stats REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Create crash_rounds table for automated crash game
CREATE TABLE public.crash_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number BIGSERIAL UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'countdown' CHECK (status IN ('countdown', 'active', 'crashed', 'ended')),
  multiplier NUMERIC(8,2) NOT NULL DEFAULT 1.00,
  crash_point NUMERIC(8,2),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  countdown_end_time TIMESTAMP WITH TIME ZONE,
  crash_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and realtime for crash_rounds
ALTER TABLE public.crash_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crash_rounds REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crash_rounds;

-- Public read access for crash rounds
CREATE POLICY "Anyone can view crash rounds" 
ON public.crash_rounds 
FOR SELECT 
USING (true);

-- Create crash_bets table for individual bets in crash rounds
CREATE TABLE public.crash_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  round_id UUID NOT NULL REFERENCES public.crash_rounds(id) ON DELETE CASCADE,
  bet_amount NUMERIC(10,2) NOT NULL CHECK (bet_amount > 0),
  auto_cashout_at NUMERIC(8,2) CHECK (auto_cashout_at >= 1.01),
  cashed_out_at NUMERIC(8,2),
  cashout_time TIMESTAMP WITH TIME ZONE,
  profit NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cashed_out', 'lost')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and realtime for crash_bets
ALTER TABLE public.crash_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crash_bets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crash_bets;

-- Users can view all crash bets (public feed)
CREATE POLICY "Anyone can view crash bets" 
ON public.crash_bets 
FOR SELECT 
USING (true);

-- Users can insert their own crash bets
CREATE POLICY "Users can insert their own crash bets" 
ON public.crash_bets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own crash bets (for cashing out)
CREATE POLICY "Users can update their own crash bets" 
ON public.crash_bets 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create live_bet_feed table for public bet history across all games
CREATE TABLE public.live_bet_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('crash', 'coinflip')),
  bet_amount NUMERIC(10,2) NOT NULL,
  result TEXT NOT NULL,
  profit NUMERIC(10,2) NOT NULL,
  multiplier NUMERIC(8,2),
  game_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and realtime for live_bet_feed
ALTER TABLE public.live_bet_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_bet_feed REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_bet_feed;

-- Public read access for live bet feed
CREATE POLICY "Anyone can view live bet feed" 
ON public.live_bet_feed 
FOR SELECT 
USING (true);

-- Only authenticated users can insert (through triggers/functions)
CREATE POLICY "Authenticated users can insert live bet feed" 
ON public.live_bet_feed 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Add level system columns to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_level INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_xp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_to_next_level INTEGER NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS lifetime_xp INTEGER NOT NULL DEFAULT 0;

-- Create level_rewards table
CREATE TABLE public.level_rewards (
  level INTEGER PRIMARY KEY,
  xp_required INTEGER NOT NULL,
  bonus_amount NUMERIC(10,2) NOT NULL
);

-- Insert level rewards data
INSERT INTO public.level_rewards (level, xp_required, bonus_amount) VALUES
(1, 0, 0),
(2, 100, 250),
(3, 250, 500),
(4, 500, 1000),
(5, 1000, 2000),
(6, 2000, 3000),
(7, 3500, 4000),
(8, 5500, 5000),
(9, 8000, 6000),
(10, 11000, 7000),
(11, 15000, 8000),
(12, 20000, 9000),
(13, 26000, 10000),
(14, 33000, 11000),
(15, 41000, 12000);

-- Create admin_users table for admin controls
CREATE TABLE public.admin_users (
  user_id UUID PRIMARY KEY,
  permissions TEXT[] NOT NULL DEFAULT ARRAY['crash_control'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin table
CREATE POLICY "Only admins can view admin users" 
ON public.admin_users 
FOR SELECT 
USING (user_id = auth.uid());

-- Create function to calculate level from XP
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp INTEGER)
RETURNS TABLE (level INTEGER, current_level_xp INTEGER, xp_to_next INTEGER)
LANGUAGE plpgsql
STABLE
AS $$
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
$$;

-- Create function to add XP and handle level ups
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid UUID, xp_amount INTEGER)
RETURNS TABLE (leveled_up BOOLEAN, new_level INTEGER, bonus_earned NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create function to add bet to live feed
CREATE OR REPLACE FUNCTION public.add_to_live_feed(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC,
  p_multiplier NUMERIC DEFAULT NULL,
  p_game_data JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create trigger to automatically add game history to live feed
CREATE OR REPLACE FUNCTION public.trigger_add_to_live_feed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Add XP for wagering (1 XP per $1 wagered)
  PERFORM public.add_xp_and_check_levelup(NEW.user_id, NEW.bet_amount::INTEGER);
  
  -- Add to live feed
  PERFORM public.add_to_live_feed(
    NEW.user_id,
    NEW.game_type,
    NEW.bet_amount,
    NEW.result,
    NEW.profit,
    CASE 
      WHEN NEW.game_data ? 'multiplier' THEN (NEW.game_data->>'multiplier')::NUMERIC
      ELSE NULL
    END,
    NEW.game_data
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on game_history
DROP TRIGGER IF EXISTS trigger_game_history_to_live_feed ON public.game_history;
CREATE TRIGGER trigger_game_history_to_live_feed
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_add_to_live_feed();

-- Add updated_at trigger for crash_rounds
CREATE TRIGGER update_crash_rounds_updated_at
  BEFORE UPDATE ON public.crash_rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();