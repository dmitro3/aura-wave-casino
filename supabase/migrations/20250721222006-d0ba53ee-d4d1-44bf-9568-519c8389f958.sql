-- Add policy to allow users to view other users' profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Also allow viewing other users' game stats
CREATE POLICY "Users can view all game stats" 
ON public.game_stats 
FOR SELECT 
USING (true);

-- Allow viewing other users' game history
CREATE POLICY "Users can view all game history" 
ON public.game_history 
FOR SELECT 
USING (true);