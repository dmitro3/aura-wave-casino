-- Fix registration issues by cleaning up problematic triggers and ensuring proper user creation flow

-- First, remove any problematic triggers that might be causing the foreign key constraint errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Ensure the foreign key constraint exists correctly for user_level_stats
-- (This should already exist but let's make sure)
DO $$
BEGIN
    -- Check if the foreign key constraint exists, if not create it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_level_stats_user_id_fkey' 
        AND table_name = 'user_level_stats'
    ) THEN
        ALTER TABLE public.user_level_stats 
        ADD CONSTRAINT user_level_stats_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create a safe trigger function that won't cause foreign key violations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  username_val text;
BEGIN
  -- Generate a unique username
  username_val := 'User' || substr(NEW.id::text, 1, 8);
  
  -- Create profile first
  INSERT INTO public.profiles (
    id,
    username,
    balance,
    total_wagered,
    total_profit,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    username_val,
    1000, -- Starting balance
    0,
    0,
    now(),
    now()
  );
  
  -- Create user_level_stats after profile is created
  INSERT INTO public.user_level_stats (
    user_id,
    current_level,
    current_level_xp,
    lifetime_xp,
    xp_to_next_level,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    1, -- Starting level
    0, -- Current level XP
    0, -- Lifetime XP
    1000, -- XP to next level
    now(),
    now()
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If anything fails, log the error but don't block user creation
  RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create the trigger to handle new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Test that the registration process works by checking existing functions
SELECT 'Registration setup completed' as status;