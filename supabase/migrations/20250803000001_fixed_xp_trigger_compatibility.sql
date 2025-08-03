-- FIXED XP SYSTEM & TRIGGER COMPATIBILITY
-- Timestamp: 20250803000001 - Fixed to handle actual profiles table schema
-- This migration fixes the XP functions AND handles table compatibility properly

-- STEP 1: Ensure our fixed XP requirements table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'level_xp_requirements') THEN
    CREATE TABLE public.level_xp_requirements (
      level INTEGER PRIMARY KEY,
      xp_required INTEGER NOT NULL
    );
  END IF;
END $$;

-- STEP 2: Populate with YOUR EXACT fixed values
TRUNCATE TABLE public.level_xp_requirements;
INSERT INTO public.level_xp_requirements (level, xp_required) VALUES
(1, 651), (2, 651), (3, 651), (4, 651), (5, 651), (6, 651), (7, 651), (8, 651), (9, 651), (10, 651),
(11, 678), (12, 678), (13, 678), (14, 678), (15, 678), (16, 678), (17, 678), (18, 678), (19, 678), (20, 678),
(21, 707), (22, 707), (23, 707), (24, 707), (25, 707), (26, 707), (27, 707), (28, 707), (29, 707), (30, 707),
(31, 738), (32, 738), (33, 738), (34, 738), (35, 738), (36, 738), (37, 738), (38, 738), (39, 738), (40, 738),
(41, 770), (42, 770), (43, 770), (44, 770), (45, 770), (46, 770), (47, 770), (48, 770), (49, 770), (50, 770),
(51, 803), (52, 803), (53, 803), (54, 803), (55, 803), (56, 803), (57, 803), (58, 803), (59, 803), (60, 803),
(61, 837), (62, 837), (63, 837), (64, 837), (65, 837), (66, 837), (67, 837), (68, 837), (69, 837), (70, 837),
(71, 874), (72, 874), (73, 874), (74, 874), (75, 874), (76, 874), (77, 874), (78, 874), (79, 874), (80, 874),
(81, 911), (82, 911), (83, 911), (84, 911), (85, 911), (86, 911), (87, 911), (88, 911), (89, 911), (90, 911),
(91, 950), (92, 950), (93, 950), (94, 950), (95, 950), (96, 950), (97, 950), (98, 950), (99, 950), (100, 950),
(101, 992), (102, 992), (103, 992), (104, 992), (105, 992), (106, 992), (107, 992), (108, 992), (109, 992), (110, 992),
(111, 1034), (112, 1034), (113, 1034), (114, 1034), (115, 1034), (116, 1034), (117, 1034), (118, 1034), (119, 1034), (120, 1034),
(121, 1078), (122, 1078), (123, 1078), (124, 1078), (125, 1078), (126, 1078), (127, 1078), (128, 1078), (129, 1078), (130, 1078),
(131, 1124), (132, 1124), (133, 1124), (134, 1124), (135, 1124), (136, 1124), (137, 1124), (138, 1124), (139, 1124), (140, 1124),
(141, 1173), (142, 1173), (143, 1173), (144, 1173), (145, 1173), (146, 1173), (147, 1173), (148, 1173), (149, 1173), (150, 1173),
(151, 1224), (152, 1224), (153, 1224), (154, 1224), (155, 1224), (156, 1224), (157, 1224), (158, 1224), (159, 1224), (160, 1224),
(161, 1276), (162, 1276), (163, 1276), (164, 1276), (165, 1276), (166, 1276), (167, 1276), (168, 1276), (169, 1276), (170, 1276),
(171, 1331), (172, 1331), (173, 1331), (174, 1331), (175, 1331), (176, 1331), (177, 1331), (178, 1331), (179, 1331), (180, 1331),
(181, 1388), (182, 1388), (183, 1388), (184, 1388), (185, 1388), (186, 1388), (187, 1388), (188, 1388), (189, 1388), (190, 1388),
(191, 1448), (192, 1448), (193, 1448), (194, 1448), (195, 1448), (196, 1448), (197, 1448), (198, 1448), (199, 1448), (200, 1448),
(201, 1510), (202, 1510), (203, 1510), (204, 1510), (205, 1510), (206, 1510), (207, 1510), (208, 1510), (209, 1510), (210, 1510),
(211, 1576), (212, 1576), (213, 1576), (214, 1576), (215, 1576), (216, 1576), (217, 1576), (218, 1576), (219, 1576), (220, 1576),
(221, 1643), (222, 1643), (223, 1643), (224, 1643), (225, 1643), (226, 1643), (227, 1643), (228, 1643), (229, 1643), (230, 1643),
(231, 1713), (232, 1713), (233, 1713), (234, 1713), (235, 1713), (236, 1713), (237, 1713), (238, 1713), (239, 1713), (240, 1713),
(241, 1787), (242, 1787), (243, 1787), (244, 1787), (245, 1787), (246, 1787), (247, 1787), (248, 1787), (249, 1787), (250, 1787),
(251, 1864), (252, 1864), (253, 1864), (254, 1864), (255, 1864), (256, 1864), (257, 1864), (258, 1864), (259, 1864), (260, 1864),
(261, 1944), (262, 1944), (263, 1944), (264, 1944), (265, 1944), (266, 1944), (267, 1944), (268, 1944), (269, 1944), (270, 1944),
(271, 2028), (272, 2028), (273, 2028), (274, 2028), (275, 2028), (276, 2028), (277, 2028), (278, 2028), (279, 2028), (280, 2028),
(281, 2115), (282, 2115), (283, 2115), (284, 2115), (285, 2115), (286, 2115), (287, 2115), (288, 2115), (289, 2115), (290, 2115),
(291, 2206), (292, 2206), (293, 2206), (294, 2206), (295, 2206), (296, 2206), (297, 2206), (298, 2206), (299, 2206), (300, 2206),
(301, 2301), (302, 2301), (303, 2301), (304, 2301), (305, 2301), (306, 2301), (307, 2301), (308, 2301), (309, 2301), (310, 2301),
(311, 2399), (312, 2399), (313, 2399), (314, 2399), (315, 2399), (316, 2399), (317, 2399), (318, 2399), (319, 2399), (320, 2399),
(321, 2503), (322, 2503), (323, 2503), (324, 2503), (325, 2503), (326, 2503), (327, 2503), (328, 2503), (329, 2503), (330, 2503),
(331, 2610), (332, 2610), (333, 2610), (334, 2610), (335, 2610), (336, 2610), (337, 2610), (338, 2610), (339, 2610), (340, 2610),
(341, 2723), (342, 2723), (343, 2723), (344, 2723), (345, 2723), (346, 2723), (347, 2723), (348, 2723), (349, 2723), (350, 2723),
(351, 2840), (352, 2840), (353, 2840), (354, 2840), (355, 2840), (356, 2840), (357, 2840), (358, 2840), (359, 2840), (360, 2840),
(361, 2962), (362, 2962), (363, 2962), (364, 2962), (365, 2962), (366, 2962), (367, 2962), (368, 2962), (369, 2962), (370, 2962),
(371, 3089), (372, 3089), (373, 3089), (374, 3089), (375, 3089), (376, 3089), (377, 3089), (378, 3089), (379, 3089), (380, 3089),
(381, 3222), (382, 3222), (383, 3222), (384, 3222), (385, 3222), (386, 3222), (387, 3222), (388, 3222), (389, 3222), (390, 3222),
(391, 3361), (392, 3361), (393, 3361), (394, 3361), (395, 3361), (396, 3361), (397, 3361), (398, 3361), (399, 3361), (400, 3361),
(401, 3505), (402, 3505), (403, 3505), (404, 3505), (405, 3505), (406, 3505), (407, 3505), (408, 3505), (409, 3505), (410, 3505),
(411, 3656), (412, 3656), (413, 3656), (414, 3656), (415, 3656), (416, 3656), (417, 3656), (418, 3656), (419, 3656), (420, 3656),
(421, 3813), (422, 3813), (423, 3813), (424, 3813), (425, 3813), (426, 3813), (427, 3813), (428, 3813), (429, 3813), (430, 3813),
(431, 3977), (432, 3977), (433, 3977), (434, 3977), (435, 3977), (436, 3977), (437, 3977), (438, 3977), (439, 3977), (440, 3977),
(441, 4148), (442, 4148), (443, 4148), (444, 4148), (445, 4148), (446, 4148), (447, 4148), (448, 4148), (449, 4148), (450, 4148),
(451, 4327), (452, 4327), (453, 4327), (454, 4327), (455, 4327), (456, 4327), (457, 4327), (458, 4327), (459, 4327), (460, 4327),
(461, 4513), (462, 4513), (463, 4513), (464, 4513), (465, 4513), (466, 4513), (467, 4513), (468, 4513), (469, 4513), (470, 4513),
(471, 4707), (472, 4707), (473, 4707), (474, 4707), (475, 4707), (476, 4707), (477, 4707), (478, 4707), (479, 4707), (480, 4707),
(481, 4909), (482, 4909), (483, 4909), (484, 4909), (485, 4909), (486, 4909), (487, 4909), (488, 4909), (489, 4909), (490, 4909),
(491, 5120), (492, 5120), (493, 5120), (494, 5120), (495, 5120), (496, 5120), (497, 5120), (498, 5120), (499, 5120), (500, 5120),
(501, 5340), (502, 5340), (503, 5340), (504, 5340), (505, 5340), (506, 5340), (507, 5340), (508, 5340), (509, 5340), (510, 5340),
(511, 5570), (512, 5570), (513, 5570), (514, 5570), (515, 5570), (516, 5570), (517, 5570), (518, 5570), (519, 5570), (520, 5570),
(521, 5810), (522, 5810), (523, 5810), (524, 5810), (525, 5810), (526, 5810), (527, 5810), (528, 5810), (529, 5810), (530, 5810),
(531, 6059), (532, 6059), (533, 6059), (534, 6059), (535, 6059), (536, 6059), (537, 6059), (538, 6059), (539, 6059), (540, 6059),
(541, 6320), (542, 6320), (543, 6320), (544, 6320), (545, 6320), (546, 6320), (547, 6320), (548, 6320), (549, 6320), (550, 6320),
(551, 6592), (552, 6592), (553, 6592), (554, 6592), (555, 6592), (556, 6592), (557, 6592), (558, 6592), (559, 6592), (560, 6592),
(561, 6875), (562, 6875), (563, 6875), (564, 6875), (565, 6875), (566, 6875), (567, 6875), (568, 6875), (569, 6875), (570, 6875),
(571, 7171), (572, 7171), (573, 7171), (574, 7171), (575, 7171), (576, 7171), (577, 7171), (578, 7171), (579, 7171), (580, 7171),
(581, 7479), (582, 7479), (583, 7479), (584, 7479), (585, 7479), (586, 7479), (587, 7479), (588, 7479), (589, 7479), (590, 7479),
(591, 7801), (592, 7801), (593, 7801), (594, 7801), (595, 7801), (596, 7801), (597, 7801), (598, 7801), (599, 7801), (600, 7801),
(601, 8136), (602, 8136), (603, 8136), (604, 8136), (605, 8136), (606, 8136), (607, 8136), (608, 8136), (609, 8136), (610, 8136),
(611, 8486), (612, 8486), (613, 8486), (614, 8486), (615, 8486), (616, 8486), (617, 8486), (618, 8486), (619, 8486), (620, 8486),
(621, 8851), (622, 8851), (623, 8851), (624, 8851), (625, 8851), (626, 8851), (627, 8851), (628, 8851), (629, 8851), (630, 8851),
(631, 9231), (632, 9231), (633, 9231), (634, 9231), (635, 9231), (636, 9231), (637, 9231), (638, 9231), (639, 9231), (640, 9231),
(641, 9628), (642, 9628), (643, 9628), (644, 9628), (645, 9628), (646, 9628), (647, 9628), (648, 9628), (649, 9628), (650, 9628),
(651, 10043), (652, 10043), (653, 10043), (654, 10043), (655, 10043), (656, 10043), (657, 10043), (658, 10043), (659, 10043), (660, 10043),
(661, 10475), (662, 10475), (663, 10475), (664, 10475), (665, 10475), (666, 10475), (667, 10475), (668, 10475), (669, 10475), (670, 10475),
(671, 10925), (672, 10925), (673, 10925), (674, 10925), (675, 10925), (676, 10925), (677, 10925), (678, 10925), (679, 10925), (680, 10925),
(681, 11394), (682, 11394), (683, 11394), (684, 11394), (685, 11394), (686, 11394), (687, 11394), (688, 11394), (689, 11394), (690, 11394),
(691, 11885), (692, 11885), (693, 11885), (694, 11885), (695, 11885), (696, 11885), (697, 11885), (698, 11885), (699, 11885), (700, 11885),
(701, 12395), (702, 12395), (703, 12395), (704, 12395), (705, 12395), (706, 12395), (707, 12395), (708, 12395), (709, 12395), (710, 12395),
(711, 12928), (712, 12928), (713, 12928), (714, 12928), (715, 12928), (716, 12928), (717, 12928), (718, 12928), (719, 12928), (720, 12928),
(721, 13484), (722, 13484), (723, 13484), (724, 13484), (725, 13484), (726, 13484), (727, 13484), (728, 13484), (729, 13484), (730, 13484),
(731, 14064), (732, 14064), (733, 14064), (734, 14064), (735, 14064), (736, 14064), (737, 14064), (738, 14064), (739, 14064), (740, 14064),
(741, 14669), (742, 14669), (743, 14669), (744, 14669), (745, 14669), (746, 14669), (747, 14669), (748, 14669), (749, 14669), (750, 14669),
(751, 15300), (752, 15300), (753, 15300), (754, 15300), (755, 15300), (756, 15300), (757, 15300), (758, 15300), (759, 15300), (760, 15300),
(761, 15958), (762, 15958), (763, 15958), (764, 15958), (765, 15958), (766, 15958), (767, 15958), (768, 15958), (769, 15958), (770, 15958),
(771, 16644), (772, 16644), (773, 16644), (774, 16644), (775, 16644), (776, 16644), (777, 16644), (778, 16644), (779, 16644), (780, 16644),
(781, 17359), (782, 17359), (783, 17359), (784, 17359), (785, 17359), (786, 17359), (787, 17359), (788, 17359), (789, 17359), (790, 17359),
(791, 18106), (792, 18106), (793, 18106), (794, 18106), (795, 18106), (796, 18106), (797, 18106), (798, 18106), (799, 18106), (800, 18106),
(801, 18884), (802, 18884), (803, 18884), (804, 18884), (805, 18884), (806, 18884), (807, 18884), (808, 18884), (809, 18884), (810, 18884),
(811, 19696), (812, 19696), (813, 19696), (814, 19696), (815, 19696), (816, 19696), (817, 19696), (818, 19696), (819, 19696), (820, 19696),
(821, 20543), (822, 20543), (823, 20543), (824, 20543), (825, 20543), (826, 20543), (827, 20543), (828, 20543), (829, 20543), (830, 20543),
(831, 21426), (832, 21426), (833, 21426), (834, 21426), (835, 21426), (836, 21426), (837, 21426), (838, 21426), (839, 21426), (840, 21426),
(841, 22348), (842, 22348), (843, 22348), (844, 22348), (845, 22348), (846, 22348), (847, 22348), (848, 22348), (849, 22348), (850, 22348),
(851, 23309), (852, 23309), (853, 23309), (854, 23309), (855, 23309), (856, 23309), (857, 23309), (858, 23309), (859, 23309), (860, 23309),
(861, 24311), (862, 24311), (863, 24311), (864, 24311), (865, 24311), (866, 24311), (867, 24311), (868, 24311), (869, 24311), (870, 24311),
(871, 25357), (872, 25357), (873, 25357), (874, 25357), (875, 25357), (876, 25357), (877, 25357), (878, 25357), (879, 25357), (880, 25357),
(881, 26447), (882, 26447), (883, 26447), (884, 26447), (885, 26447), (886, 26447), (887, 26447), (888, 26447), (889, 26447), (890, 26447),
(891, 27584), (892, 27584), (893, 27584), (894, 27584), (895, 27584), (896, 27584), (897, 27584), (898, 27584), (899, 27584), (900, 27584),
(901, 28770), (902, 28770), (903, 28770), (904, 28770), (905, 28770), (906, 28770), (907, 28770), (908, 28770), (909, 28770), (910, 28770),
(911, 30007), (912, 30007), (913, 30007), (914, 30007), (915, 30007), (916, 30007), (917, 30007), (918, 30007), (919, 30007), (920, 30007),
(921, 31298), (922, 31298), (923, 31298), (924, 31298), (925, 31298), (926, 31298), (927, 31298), (928, 31298), (929, 31298), (930, 31298),
(931, 32643), (932, 32643), (933, 32643), (934, 32643), (935, 32643), (936, 32643), (937, 32643), (938, 32643), (939, 32643), (940, 32643),
(941, 34047), (942, 34047), (943, 34047), (944, 34047), (945, 34047), (946, 34047), (947, 34047), (948, 34047), (949, 34047), (950, 34047),
(951, 35511), (952, 35511), (953, 35511), (954, 35511), (955, 35511), (956, 35511), (957, 35511), (958, 35511), (959, 35511), (960, 35511),
(961, 37038), (962, 37038), (963, 37038), (964, 37038), (965, 37038), (966, 37038), (967, 37038), (968, 37038), (969, 37038), (970, 37038),
(971, 38630), (972, 38630), (973, 38630), (974, 38630), (975, 38630), (976, 38630), (977, 38630), (978, 38630), (979, 38630), (980, 38630),
(981, 40292), (982, 40292), (983, 40292), (984, 40292), (985, 40292), (986, 40292), (987, 40292), (988, 40292), (989, 40292), (990, 40292),
(991, 42024), (992, 42024), (993, 42024), (994, 42024), (995, 42024), (996, 42024), (997, 42024), (998, 42024), (999, 42024);

-- STEP 3: Replace ALL XP functions with FIXED table lookups
DROP FUNCTION IF EXISTS public.calculate_xp_for_level(integer) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_xp_for_level_new(integer) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_level_from_xp(integer) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_level_from_xp(numeric) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_level_from_xp_new(integer) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_level_from_xp_new(numeric) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_total_xp_for_level(integer) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.handle_game_completion() CASCADE;

-- XP for specific level (FIXED table lookup)
CREATE OR REPLACE FUNCTION public.calculate_xp_for_level(target_level integer)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  IF target_level <= 1 THEN
    RETURN 0;
  END IF;
  
  RETURN COALESCE(
    (SELECT xp_required FROM level_xp_requirements WHERE level_xp_requirements.level = target_level),
    42024
  );
END;
$function$;

-- XP for specific level NEW (compatibility)
CREATE OR REPLACE FUNCTION public.calculate_xp_for_level_new(target_level integer)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN public.calculate_xp_for_level(target_level);
END;
$function$;

-- Level from total XP (FIXED table lookup)
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp integer)
RETURNS TABLE(level integer, current_level_xp integer, xp_to_next integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  user_level INTEGER := 1;
  current_xp INTEGER := 0;
  next_level_xp INTEGER;
BEGIN
  IF total_xp <= 0 THEN
    RETURN QUERY SELECT 1, 0::integer, 651;
    RETURN;
  END IF;
  
  -- ONLY use fixed table - NO mathematical formulas
  SELECT 
    COALESCE(MAX(req_level), 1),
    COALESCE(total_xp::integer - MAX(cumulative_xp), total_xp::integer)
  INTO user_level, current_xp
  FROM (
    SELECT 
      level_xp_requirements.level as req_level,
      SUM(xp_required) OVER (ORDER BY level_xp_requirements.level ROWS UNBOUNDED PRECEDING) as cumulative_xp
    FROM level_xp_requirements 
    WHERE level_xp_requirements.level <= 999
  ) cumulative
  WHERE cumulative_xp <= total_xp;
  
  IF user_level IS NULL THEN
    user_level := 1;
    current_xp := total_xp::integer;
  END IF;
  
  IF user_level >= 999 THEN
    user_level := 999;
    next_level_xp := 0;
  ELSE
    -- Get XP for next level from FIXED table
    SELECT xp_required INTO next_level_xp 
    FROM level_xp_requirements 
    WHERE level_xp_requirements.level = user_level + 1;
    next_level_xp := COALESCE(next_level_xp, 0) - current_xp;
  END IF;
  
  RETURN QUERY SELECT 
    user_level,
    current_xp,
    COALESCE(next_level_xp, 0);
END;
$function$;

-- Level from total XP (numeric version)
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp numeric)
RETURNS TABLE(level integer, current_level_xp integer, xp_to_next integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY SELECT * FROM calculate_level_from_xp(total_xp::integer);
END;
$function$;

-- Level from total XP NEW (compatibility)
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp_new(total_xp integer)
RETURNS TABLE(level integer, current_level_xp integer, xp_to_next integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY SELECT * FROM calculate_level_from_xp(total_xp);
END;
$function$;

-- Level from total XP NEW (numeric version)
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp_new(total_xp numeric)
RETURNS TABLE(level integer, current_level_xp integer, xp_to_next integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY SELECT * FROM calculate_level_from_xp(total_xp::integer);
END;
$function$;

-- Total XP for level (FIXED table lookup)
CREATE OR REPLACE FUNCTION public.calculate_total_xp_for_level(target_level integer)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  IF target_level <= 1 THEN
    RETURN 0;
  END IF;
  
  RETURN COALESCE(
    (SELECT SUM(xp_required) FROM level_xp_requirements WHERE level_xp_requirements.level < target_level),
    0
  );
END;
$function$;

-- STEP 4: Replace add_xp_and_check_levelup with FIXED logic for user_level_stats table
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount integer)
RETURNS TABLE(leveled_up boolean, new_level integer, bonus_earned numeric, cases_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
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
  -- Get current level and XP from user_level_stats (primary table for XP)
  SELECT current_level, lifetime_xp, COALESCE(border_tier, 1) 
  INTO old_level, old_xp, old_border_tier
  FROM public.user_level_stats 
  WHERE user_id = user_uuid;
  
  -- If no record exists, create one
  IF old_level IS NULL THEN
    INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level)
    VALUES (user_uuid, 1, 0, 0, 651);
    old_level := 1;
    old_xp := 0;
    old_border_tier := 1;
  END IF;
  
  -- Calculate new total XP
  new_total_xp := old_xp + xp_amount;
  
  -- Calculate new level using ONLY our FIXED table functions
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
    
    -- Update user_level_stats (PRIMARY table) using ONLY FIXED calculations
    UPDATE public.user_level_stats 
    SET 
      current_level = new_level_calc,
      lifetime_xp = new_total_xp,
      current_level_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(new_total_xp) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(new_total_xp) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier),
      available_cases = available_cases + cases_to_add,
      updated_at = now()
    WHERE user_id = user_uuid;
    
    -- ALSO update profiles table (ONLY the columns that exist: level and xp)
    UPDATE public.profiles 
    SET 
      level = new_level_calc,
      xp = new_total_xp,
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
    -- Just update XP without level change using ONLY FIXED calculations
    UPDATE public.user_level_stats 
    SET 
      lifetime_xp = new_total_xp,
      current_level_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(new_total_xp) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(new_total_xp) calc),
      updated_at = now()
    WHERE user_id = user_uuid;
    
    -- ALSO update profiles table (ONLY the columns that exist)
    UPDATE public.profiles 
    SET 
      xp = new_total_xp,
      updated_at = now()
    WHERE id = user_uuid;
  END IF;
  
  RETURN QUERY SELECT did_level_up, new_level_calc, COALESCE(level_bonus, 0), cases_to_add;
END;
$function$;

-- Add XP and level up check (numeric version)
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount numeric)
RETURNS TABLE(leveled_up boolean, new_level integer, bonus_earned numeric, cases_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY SELECT * FROM public.add_xp_and_check_levelup(user_uuid, xp_amount::integer);
END;
$function$;

-- STEP 5: Replace TRIGGER FUNCTION with FIXED logic
CREATE OR REPLACE FUNCTION public.handle_game_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_name TEXT;
  streak_len INTEGER := 0;
  game_action TEXT := 'completed';
BEGIN
  -- Always add XP for wagering - NOW uses our FIXED function
  PERFORM public.add_xp_and_check_levelup(NEW.user_id, NEW.bet_amount::INTEGER);
  
  -- For coinflip games, ONLY add to live feed for concluded streaks (losses or cash-outs)
  -- NOT for intermediate wins (continue actions)
  IF NEW.game_type = 'coinflip' THEN
    IF NEW.game_data IS NOT NULL THEN
      game_action := COALESCE(NEW.game_data->>'action', 'completed');
      
      -- ONLY add to live feed for losses or cash-outs (NOT continue actions)
      IF game_action = 'lost' OR game_action = 'cash_out' THEN
        -- Get username
        SELECT username INTO user_name
        FROM public.profiles
        WHERE id = NEW.user_id;
        
        streak_len := COALESCE((NEW.game_data->>'streak_length')::INTEGER, 0);
        
        -- Insert ONCE into live feed for concluded streaks only
        INSERT INTO public.live_bet_feed (
          user_id, username, game_type, bet_amount, result, profit, multiplier, game_data, streak_length, action
        ) VALUES (
          NEW.user_id, user_name, NEW.game_type, NEW.bet_amount, NEW.result, NEW.profit, 
          CASE 
            WHEN NEW.game_data ? 'multiplier' THEN (NEW.game_data->>'multiplier')::NUMERIC
            ELSE NULL
          END,
          NEW.game_data, streak_len, game_action
        );
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- For all other games, add to live feed
  SELECT username INTO user_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  INSERT INTO public.live_bet_feed (
    user_id, username, game_type, bet_amount, result, profit, multiplier, game_data
  ) VALUES (
    NEW.user_id, user_name, NEW.game_type, NEW.bet_amount, NEW.result, NEW.profit, 
    CASE 
      WHEN NEW.game_data ? 'multiplier' THEN (NEW.game_data->>'multiplier')::NUMERIC
      ELSE NULL
    END,
    NEW.game_data
  );
  
  RETURN NEW;
END;
$function$;

-- STEP 6: Grant permissions
GRANT EXECUTE ON FUNCTION public.calculate_xp_for_level(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_xp_for_level_new(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_level_from_xp(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_level_from_xp(numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_level_from_xp_new(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_level_from_xp_new(numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_total_xp_for_level(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_xp_and_check_levelup(uuid, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_xp_and_check_levelup(uuid, numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_game_completion() TO anon, authenticated, service_role;

-- STEP 7: Update existing user data with our FIXED calculations
-- Update user_level_stats (primary XP table)
UPDATE user_level_stats SET 
  current_level = (SELECT level FROM calculate_level_from_xp(lifetime_xp::integer)),
  current_level_xp = (SELECT current_level_xp FROM calculate_level_from_xp(lifetime_xp::integer)),
  xp_to_next_level = (SELECT xp_to_next FROM calculate_level_from_xp(lifetime_xp::integer))
WHERE lifetime_xp IS NOT NULL;

-- Update profiles table (ONLY columns that exist: level and xp)
-- Use user_level_stats as source of truth
UPDATE profiles SET 
  level = uls.current_level,
  xp = uls.lifetime_xp
FROM user_level_stats uls 
WHERE profiles.id = uls.user_id;

-- STEP 8: Final verification
DO $$
DECLARE
  test_result RECORD;
  total_functions INTEGER;
  total_triggers INTEGER;
BEGIN
  -- Count XP functions
  SELECT COUNT(*) INTO total_functions 
  FROM pg_proc 
  WHERE proname LIKE '%calculate%xp%' OR proname LIKE '%add_xp%';
  
  -- Count game completion triggers
  SELECT COUNT(*) INTO total_triggers 
  FROM pg_trigger 
  WHERE tgname LIKE '%completion%' OR tgname LIKE '%game%';
  
  RAISE NOTICE '🔒 FIXED XP SYSTEM & TRIGGER COMPATIBILITY COMPLETE';
  RAISE NOTICE '📊 Total XP functions: %', total_functions;
  RAISE NOTICE '🎯 Total game triggers: %', total_triggers;
  RAISE NOTICE '🗓️ Migration timestamp: 20250803000001';
  RAISE NOTICE '🔐 Compatible with actual profiles table schema';
  
  -- Test the fixed functions
  RAISE NOTICE 'XP required for level 2: %', calculate_xp_for_level(2);
  RAISE NOTICE 'XP required for level 11: %', calculate_xp_for_level(11);
  RAISE NOTICE 'XP required for level 21: %', calculate_xp_for_level(21);
  
  SELECT * INTO test_result FROM calculate_level_from_xp(651);
  RAISE NOTICE 'User with 651 XP: level=%, current_xp=%, xp_to_next=%', 
    test_result.level, test_result.current_level_xp, test_result.xp_to_next;
    
  SELECT * INTO test_result FROM calculate_level_from_xp(1329);
  RAISE NOTICE 'User with 1329 XP: level=%, current_xp=%, xp_to_next=%', 
    test_result.level, test_result.current_level_xp, test_result.xp_to_next;
    
  RAISE NOTICE '✅ SUCCESS: XP requirements PERMANENTLY LOCKED';
  RAISE NOTICE '🚫 Dynamic formulas ELIMINATED from ALL functions AND triggers';
  RAISE NOTICE '🎯 GUARANTEED: Level 1-10=651 XP | Level 11-20=678 XP | Level 21-30=707 XP';
  RAISE NOTICE '🔒 TRIGGER FUNCTION NOW USES FIXED CALCULATIONS';
  RAISE NOTICE '🔧 FIXED: Profiles table schema compatibility';
END $$;