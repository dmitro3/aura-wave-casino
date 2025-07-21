-- Insert sample level rewards data to make the level system functional
INSERT INTO public.level_rewards (level, xp_required, bonus_amount) VALUES
(1, 0, 0),
(2, 100, 50),
(3, 250, 75),
(4, 500, 100),
(5, 1000, 150),
(6, 1750, 200),
(7, 2750, 250),
(8, 4000, 300),
(9, 5500, 400),
(10, 7500, 500),
(11, 10000, 600),
(12, 13000, 750),
(13, 16500, 900),
(14, 20500, 1100),
(15, 25000, 1300),
(16, 30000, 1500),
(17, 35500, 1750),
(18, 41500, 2000),
(19, 48000, 2300),
(20, 55000, 2500)
ON CONFLICT (level) DO NOTHING;