-- Clean up the live feed to remove 'continue' actions that shouldn't be there
DELETE FROM public.live_bet_feed WHERE action = 'continue' AND game_type = 'coinflip';