-- Revamp leveling system for 1000 levels with reward cases and profile borders

-- First, clear existing level rewards
DELETE FROM public.level_rewards;

-- Create new tables for the enhanced leveling system
CREATE TABLE IF NOT EXISTS public.case_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  level_unlocked INTEGER NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  reward_amount NUMERIC NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.border_tiers (
  tier INTEGER PRIMARY KEY,
  min_level INTEGER NOT NULL,
  max_level INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  css_classes TEXT NOT NULL,
  animation_type TEXT
);

-- Enable RLS on new tables
ALTER TABLE public.case_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.border_tiers ENABLE ROW LEVEL SECURITY;

-- Create policies for case_rewards
CREATE POLICY "Users can view their own case rewards" 
ON public.case_rewards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own case rewards" 
ON public.case_rewards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own case rewards" 
ON public.case_rewards 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policies for border_tiers
CREATE POLICY "Anyone can view border tiers" 
ON public.border_tiers 
FOR SELECT 
USING (true);

-- Add new columns to profiles table for enhanced leveling
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS border_tier INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS available_cases INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cases_opened INTEGER DEFAULT 0;

-- Insert border tier definitions
INSERT INTO public.border_tiers (tier, min_level, max_level, name, description, css_classes, animation_type) VALUES
(1, 1, 24, 'Bronze Basic', 'Basic bronze border', 'border-2 border-amber-600', NULL),
(2, 25, 49, 'Chrome Silver', 'Shimmering silver border', 'border-2 border-gray-300 shadow-md', 'shimmer'),
(3, 50, 74, 'Steel Glow', 'Steel border with subtle glow', 'border-2 border-slate-400 shadow-lg shadow-slate-400/50', 'glow'),
(4, 75, 99, 'Gold Flame', 'Golden border with flame effect', 'border-2 border-yellow-400 shadow-lg shadow-yellow-400/50', 'flame'),
(5, 100, 124, 'Emerald Shine', 'Emerald border with crystal shine', 'border-2 border-emerald-500 shadow-lg shadow-emerald-500/50', 'crystal'),
(6, 125, 149, 'Sapphire Ice', 'Sapphire border with ice effect', 'border-2 border-blue-500 shadow-lg shadow-blue-500/50', 'ice'),
(7, 150, 174, 'Ruby Fire', 'Ruby border with fire effect', 'border-2 border-red-500 shadow-lg shadow-red-500/50', 'fire'),
(8, 175, 199, 'Amethyst Storm', 'Amethyst border with storm effect', 'border-2 border-purple-500 shadow-lg shadow-purple-500/50', 'storm'),
(9, 200, 224, 'Diamond Radiance', 'Diamond border with radiant glow', 'border-2 border-white shadow-xl shadow-white/50', 'radiance'),
(10, 225, 249, 'Obsidian Shadow', 'Obsidian border with shadow effect', 'border-2 border-gray-900 shadow-xl shadow-gray-900/50', 'shadow'),
(11, 250, 274, 'Platinum Elite', 'Platinum border for elite players', 'border-3 border-gray-200 shadow-xl shadow-gray-200/50', 'elite'),
(12, 275, 299, 'Titanium Force', 'Titanium border with force field', 'border-3 border-slate-300 shadow-xl shadow-slate-300/50', 'force'),
(13, 300, 324, 'Mithril Light', 'Mithril border with light aura', 'border-3 border-indigo-300 shadow-xl shadow-indigo-300/50', 'light'),
(14, 325, 349, 'Adamant Power', 'Adamant border with raw power', 'border-3 border-orange-500 shadow-xl shadow-orange-500/50', 'power'),
(15, 350, 374, 'Void Walker', 'Mysterious void border', 'border-3 border-black shadow-xl shadow-purple-900/50', 'void'),
(16, 375, 399, 'Astral Traveler', 'Astral border for plane walkers', 'border-3 border-cyan-400 shadow-xl shadow-cyan-400/50', 'astral'),
(17, 400, 424, 'Phoenix Rising', 'Phoenix border with rebirth energy', 'border-3 border-orange-400 shadow-xl shadow-red-500/50', 'phoenix'),
(18, 425, 449, 'Dragon Lord', 'Dragon-scale border with ancient power', 'border-3 border-green-600 shadow-xl shadow-green-600/50', 'dragon'),
(19, 450, 474, 'Arcane Master', 'Arcane border with magical energy', 'border-3 border-violet-500 shadow-xl shadow-violet-500/50', 'arcane'),
(20, 475, 499, 'Celestial Knight', 'Celestial border with holy light', 'border-3 border-yellow-300 shadow-xl shadow-yellow-300/50', 'celestial'),
(21, 500, 524, 'Infernal Overlord', 'Infernal border with demonic power', 'border-3 border-red-700 shadow-xl shadow-red-700/50', 'infernal'),
(22, 525, 549, 'Cosmic Wanderer', 'Cosmic border with stellar energy', 'border-3 border-blue-400 shadow-xl shadow-blue-400/50', 'cosmic'),
(23, 550, 574, 'Time Keeper', 'Temporal border with time distortion', 'border-3 border-teal-500 shadow-xl shadow-teal-500/50', 'temporal'),
(24, 575, 599, 'Reality Bender', 'Reality-warping border', 'border-3 border-pink-500 shadow-xl shadow-pink-500/50', 'reality'),
(25, 600, 624, 'Dimensional Lord', 'Multi-dimensional border', 'border-4 border-gradient-to-r from-purple-500 to-cyan-500', 'dimensional'),
(26, 625, 649, 'Quantum Entity', 'Quantum-state border', 'border-4 border-blue-600 shadow-2xl shadow-blue-600/50', 'quantum'),
(27, 650, 674, 'Ethereal Being', 'Ethereal border with spirit energy', 'border-4 border-green-400 shadow-2xl shadow-green-400/50', 'ethereal'),
(28, 675, 699, 'Primordial Force', 'Ancient primordial border', 'border-4 border-stone-600 shadow-2xl shadow-stone-600/50', 'primordial'),
(29, 700, 724, 'Universal Guardian', 'Universal protection border', 'border-4 border-amber-500 shadow-2xl shadow-amber-500/50', 'universal'),
(30, 725, 749, 'Omega Destroyer', 'Destructive omega border', 'border-4 border-red-600 shadow-2xl shadow-red-600/50', 'omega'),
(31, 750, 774, 'Alpha Creator', 'Creative alpha border', 'border-4 border-white shadow-2xl shadow-white/50', 'alpha'),
(32, 775, 799, 'Infinite Nexus', 'Infinite energy nexus border', 'border-4 border-purple-600 shadow-2xl shadow-purple-600/50', 'nexus'),
(33, 800, 824, 'Transcendent One', 'Transcendent being border', 'border-4 border-yellow-500 shadow-2xl shadow-yellow-500/50', 'transcendent'),
(34, 825, 849, 'Omnipotent Force', 'All-powerful border', 'border-4 border-orange-600 shadow-2xl shadow-orange-600/50', 'omnipotent'),
(35, 850, 874, 'Legendary Titan', 'Legendary titan border', 'border-5 border-gray-700 shadow-2xl shadow-gray-700/50', 'titan'),
(36, 875, 899, 'Mythical Emperor', 'Mythical emperor border', 'border-5 border-gold shadow-2xl shadow-yellow-400/50', 'emperor'),
(37, 900, 924, 'Divine Sovereign', 'Divine sovereignty border', 'border-5 border-indigo-600 shadow-2xl shadow-indigo-600/50', 'sovereign'),
(38, 925, 949, 'Godlike Entity', 'Godlike power border', 'border-5 border-purple-700 shadow-2xl shadow-purple-700/50', 'godlike'),
(39, 950, 999, 'Supreme Being', 'Supreme existence border', 'border-5 border-rainbow shadow-2xl', 'supreme'),
(40, 1000, 1000, 'Celestial Ascended', 'Ultimate celestial border', 'border-6 border-gradient-rainbow shadow-3xl animate-pulse', 'celestial-ultimate');

-- Create function to calculate XP required for a specific level
CREATE OR REPLACE FUNCTION public.calculate_xp_for_level(target_level integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  base_xp CONSTANT NUMERIC := 915.75;
  growth_factor CONSTANT NUMERIC := 1.2;
  step INTEGER;
  level_xp INTEGER;
BEGIN
  IF target_level <= 1 THEN
    RETURN 0;
  END IF;
  
  step := FLOOR((target_level - 1) / 10);
  level_xp := ROUND(base_xp * POWER(growth_factor, step));
  
  RETURN level_xp;
END;
$function$;

-- Create function to calculate total XP required to reach a level
CREATE OR REPLACE FUNCTION public.calculate_total_xp_for_level(target_level integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  total_xp INTEGER := 0;
  current_level INTEGER;
BEGIN
  IF target_level <= 1 THEN
    RETURN 0;
  END IF;
  
  FOR current_level IN 2..target_level LOOP
    total_xp := total_xp + public.calculate_xp_for_level(current_level);
  END LOOP;
  
  RETURN total_xp;
END;
$function$;

-- Update the level calculation function to work with new system
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp integer)
RETURNS TABLE(level integer, current_level_xp integer, xp_to_next integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  current_level_num INTEGER := 1;
  xp_used INTEGER := 0;
  xp_for_next INTEGER;
  remaining_xp INTEGER;
BEGIN
  -- Handle edge cases
  IF total_xp <= 0 THEN
    RETURN QUERY SELECT 1, 0, public.calculate_xp_for_level(2);
    RETURN;
  END IF;
  
  -- Find current level by iterating through levels
  remaining_xp := total_xp;
  
  FOR level_check IN 2..1000 LOOP
    xp_for_next := public.calculate_xp_for_level(level_check);
    
    IF remaining_xp < xp_for_next THEN
      current_level_num := level_check - 1;
      EXIT;
    END IF;
    
    remaining_xp := remaining_xp - xp_for_next;
    
    -- If we've reached level 1000
    IF level_check = 1000 AND remaining_xp >= 0 THEN
      current_level_num := 1000;
      remaining_xp := 0; -- Cap at max level
      xp_for_next := 0; -- No more levels
      EXIT;
    END IF;
  END LOOP;
  
  -- Calculate XP to next level
  IF current_level_num >= 1000 THEN
    xp_for_next := 0;
  ELSE
    xp_for_next := public.calculate_xp_for_level(current_level_num + 1) - remaining_xp;
  END IF;
  
  RETURN QUERY SELECT 
    current_level_num,
    remaining_xp,
    xp_for_next;
END;
$function$;

-- Update add_xp_and_check_levelup function to handle cases
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount integer)
RETURNS TABLE(leveled_up boolean, new_level integer, bonus_earned numeric, cases_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
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
  SELECT current_level, lifetime_xp, border_tier INTO old_level, old_xp, old_border_tier
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

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_rewards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.border_tiers;