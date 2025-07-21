-- Create tower games table
CREATE TABLE public.tower_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
  bet_amount NUMERIC NOT NULL,
  current_level INTEGER NOT NULL DEFAULT 0,
  max_level INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cashed_out', 'lost')),
  current_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  final_payout NUMERIC DEFAULT 0,
  mine_positions JSONB NOT NULL, -- Array of arrays containing mine positions for each level
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tower levels table to track each level attempt
CREATE TABLE public.tower_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.tower_games(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL,
  tile_selected INTEGER NOT NULL,
  was_safe BOOLEAN NOT NULL,
  multiplier_at_level NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tower_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tower_levels ENABLE ROW LEVEL SECURITY;

-- Create policies for tower_games
CREATE POLICY "Users can view their own tower games" 
ON public.tower_games 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tower games" 
ON public.tower_games 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tower games" 
ON public.tower_games 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policies for tower_levels
CREATE POLICY "Users can view their own tower levels" 
ON public.tower_levels 
FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM public.tower_games WHERE id = tower_levels.game_id));

CREATE POLICY "Users can insert their own tower levels" 
ON public.tower_levels 
FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM public.tower_games WHERE id = tower_levels.game_id));

-- Create indexes for performance
CREATE INDEX idx_tower_games_user_id ON public.tower_games(user_id);
CREATE INDEX idx_tower_games_status ON public.tower_games(status);
CREATE INDEX idx_tower_games_created_at ON public.tower_games(created_at);
CREATE INDEX idx_tower_levels_game_id ON public.tower_levels(game_id);

-- Create trigger for updated_at
CREATE TRIGGER update_tower_games_updated_at
  BEFORE UPDATE ON public.tower_games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime for tower games
ALTER PUBLICATION supabase_realtime ADD TABLE public.tower_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tower_levels;