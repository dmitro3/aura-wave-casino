-- Sync user_level_stats with profiles data for existing users
INSERT INTO user_level_stats (
    user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level,
    total_wagered, total_profit, border_tier, available_cases, total_cases_opened
)
SELECT 
    p.id,
    p.current_level,
    p.lifetime_xp,
    p.current_xp,
    p.xp_to_next_level,
    p.total_wagered,
    p.total_profit,
    p.border_tier,
    p.available_cases,
    p.total_cases_opened
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM user_level_stats uls WHERE uls.user_id = p.id
)
ON CONFLICT (user_id) DO UPDATE SET
    current_level = EXCLUDED.current_level,
    lifetime_xp = EXCLUDED.lifetime_xp,
    current_level_xp = EXCLUDED.current_level_xp,
    xp_to_next_level = EXCLUDED.xp_to_next_level,
    total_wagered = EXCLUDED.total_wagered,
    total_profit = EXCLUDED.total_profit,
    border_tier = EXCLUDED.border_tier,
    available_cases = EXCLUDED.available_cases,
    total_cases_opened = EXCLUDED.total_cases_opened;