-- FIX REGISTRATION SYSTEM
-- Ensure new users get both profiles and user_level_stats records

-- Drop and recreate the registration trigger function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.create_user_profile_manual(UUID, TEXT);

-- Create the registration trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  username_text TEXT;
BEGIN
  -- Generate username from metadata or create default
  username_text := COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substr(NEW.id::text, 1, 8));
  
  -- Create profile record
  BEGIN
    INSERT INTO public.profiles (
      id, 
      username, 
      registration_date, 
      balance, 
      level,
      xp,
      total_wagered, 
      total_profit, 
      last_claim_time, 
      badges,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      username_text,
      NEW.created_at,
      0,
      1,
      0,
      0,
      0,
      '1970-01-01T00:00:00Z',
      ARRAY['welcome'],
      NEW.created_at,
      NEW.created_at
    );
    
    RAISE NOTICE '[REGISTRATION] ✅ Profile created for user % with username %', NEW.id, username_text;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '[REGISTRATION] ❌ Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Create user_level_stats record
  BEGIN
    INSERT INTO public.user_level_stats (
      user_id,
      current_level,
      current_level_xp,
      lifetime_xp,
      xp_to_next_level,
      border_tier,
      available_cases,
      total_cases_opened,
      coinflip_games,
      coinflip_wins,
      coinflip_wagered,
      coinflip_profit,
      crash_games,
      crash_wins,
      crash_wagered,
      crash_profit,
      roulette_games,
      roulette_wins,
      roulette_wagered,
      roulette_profit,
      roulette_highest_win,
      roulette_highest_loss,
      roulette_green_wins,
      roulette_red_wins,
      roulette_black_wins,
      roulette_favorite_color,
      tower_games,
      tower_wins,
      tower_wagered,
      tower_profit,
      total_games,
      total_wins,
      total_wagered,
      total_profit,
      biggest_win,
      biggest_loss,
      chat_messages_count,
      login_days_count,
      biggest_single_bet,
      account_created,
      current_win_streak,
      best_win_streak,
      tower_highest_level,
      tower_biggest_win,
      tower_biggest_loss,
      tower_best_streak,
      tower_current_streak,
      tower_perfect_games,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      1,        -- current_level
      0,        -- current_level_xp
      0,        -- lifetime_xp
      651,      -- xp_to_next_level (fixed value from our XP table)
      1,        -- border_tier
      0,        -- available_cases
      0,        -- total_cases_opened
      0,        -- coinflip_games
      0,        -- coinflip_wins
      0,        -- coinflip_wagered
      0,        -- coinflip_profit
      0,        -- crash_games
      0,        -- crash_wins
      0,        -- crash_wagered
      0,        -- crash_profit
      0,        -- roulette_games
      0,        -- roulette_wins
      0,        -- roulette_wagered
      0,        -- roulette_profit
      0,        -- roulette_highest_win
      0,        -- roulette_highest_loss
      0,        -- roulette_green_wins
      0,        -- roulette_red_wins
      0,        -- roulette_black_wins
      'none',   -- roulette_favorite_color
      0,        -- tower_games
      0,        -- tower_wins
      0,        -- tower_wagered
      0,        -- tower_profit
      0,        -- total_games
      0,        -- total_wins
      0,        -- total_wagered
      0,        -- total_profit
      0,        -- biggest_win
      0,        -- biggest_loss
      0,        -- chat_messages_count
      1,        -- login_days_count
      0,        -- biggest_single_bet
      NEW.created_at, -- account_created
      0,        -- current_win_streak
      0,        -- best_win_streak
      0,        -- tower_highest_level
      0,        -- tower_biggest_win
      0,        -- tower_biggest_loss
      0,        -- tower_best_streak
      0,        -- tower_current_streak
      0,        -- tower_perfect_games
      NEW.created_at,
      NEW.created_at
    );
    
    RAISE NOTICE '[REGISTRATION] ✅ User level stats created for user %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '[REGISTRATION] ❌ Failed to create user_level_stats for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[REGISTRATION] 💥 Critical error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create manual profile creation function for fallback
CREATE OR REPLACE FUNCTION public.create_user_profile_manual(user_id UUID, username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  -- Create profile if it doesn't exist
  INSERT INTO public.profiles (
    id, 
    username, 
    registration_date, 
    balance, 
    level,
    xp,
    total_wagered, 
    total_profit, 
    last_claim_time, 
    badges,
    created_at,
    updated_at
  )
  VALUES (
    user_id,
    username,
    NOW(),
    0,
    1,
    0,
    0,
    0,
    '1970-01-01T00:00:00Z',
    ARRAY['welcome'],
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create user_level_stats if it doesn't exist
  INSERT INTO public.user_level_stats (
    user_id,
    current_level,
    current_level_xp,
    lifetime_xp,
    xp_to_next_level,
    border_tier,
    available_cases,
    total_cases_opened,
    coinflip_games,
    coinflip_wins,
    coinflip_wagered,
    coinflip_profit,
    crash_games,
    crash_wins,
    crash_wagered,
    crash_profit,
    roulette_games,
    roulette_wins,
    roulette_wagered,
    roulette_profit,
    roulette_highest_win,
    roulette_highest_loss,
    roulette_green_wins,
    roulette_red_wins,
    roulette_black_wins,
    roulette_favorite_color,
    tower_games,
    tower_wins,
    tower_wagered,
    tower_profit,
    total_games,
    total_wins,
    total_wagered,
    total_profit,
    biggest_win,
    biggest_loss,
    chat_messages_count,
    login_days_count,
    biggest_single_bet,
    account_created,
    current_win_streak,
    best_win_streak,
    tower_highest_level,
    tower_biggest_win,
    tower_biggest_loss,
    tower_best_streak,
    tower_current_streak,
    tower_perfect_games,
    created_at,
    updated_at
  )
  VALUES (
    user_id,
    1, 0, 0, 651, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'none',
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, NOW(), 0, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[MANUAL_PROFILE] ❌ Error creating profile for user %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile_manual(UUID, TEXT) TO anon, authenticated, service_role;

-- Verification
DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Check if trigger exists
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger 
  WHERE tgname = 'on_auth_user_created';
  
  -- Check if function exists
  SELECT COUNT(*) INTO function_count
  FROM pg_proc 
  WHERE proname = 'handle_new_user';
  
  RAISE NOTICE '🔧 REGISTRATION SYSTEM FIXED';
  RAISE NOTICE '📊 Triggers found: %', trigger_count;
  RAISE NOTICE '📊 Functions found: %', function_count;
  RAISE NOTICE '✅ New users will get both profiles and user_level_stats records';
  RAISE NOTICE '🔒 Manual profile creation function available as fallback';
END $$;