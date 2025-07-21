-- Create tips table for user-to-user tipping
CREATE TABLE public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key constraints
  FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- Create policies for tips
CREATE POLICY "Users can view tips they sent" 
ON public.tips 
FOR SELECT 
USING (auth.uid() = from_user_id);

CREATE POLICY "Users can view tips they received" 
ON public.tips 
FOR SELECT 
USING (auth.uid() = to_user_id);

CREATE POLICY "Users can send tips" 
ON public.tips 
FOR INSERT 
WITH CHECK (auth.uid() = from_user_id);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  unlock_criteria JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Create policy for achievements
CREATE POLICY "Anyone can view achievements" 
ON public.achievements 
FOR SELECT 
USING (true);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key constraints
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE,
  
  -- Unique constraint to prevent duplicate achievements
  UNIQUE(user_id, achievement_id)
);

-- Enable Row Level Security for user achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Create policies for user achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Insert some starter achievements
INSERT INTO public.achievements (name, description, icon, category, unlock_criteria) VALUES
('First Timer', 'Play your first game', '🎮', 'games', '{"games_played": 1}'),
('Big Spender', 'Wager $1000 total', '💰', 'wagering', '{"total_wagered": 1000}'),
('Lucky Streak', 'Win 5 games in a row', '🍀', 'games', '{"win_streak": 5}'),
('High Roller', 'Place a single bet over $500', '🎰', 'wagering', '{"single_bet": 500}'),
('Veteran', 'Play for 30 days', '⭐', 'time', '{"days_played": 30}'),
('Profitable', 'Earn $500 total profit', '📈', 'profit', '{"total_profit": 500}'),
('Level 10', 'Reach Level 10', '🏆', 'level', '{"level": 10}'),
('Generous', 'Tip other players $100 total', '🎁', 'social', '{"tips_sent": 100}'),
('Popular', 'Receive $100 in tips', '🌟', 'social', '{"tips_received": 100}'),
('Tower Master', 'Win 50 tower games', '🏰', 'games', '{"tower_wins": 50}');

-- Create function to handle tipping
CREATE OR REPLACE FUNCTION public.process_tip(
  p_from_user_id UUID,
  p_to_user_id UUID, 
  p_amount NUMERIC,
  p_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  sender_balance NUMERIC;
BEGIN
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
$$;