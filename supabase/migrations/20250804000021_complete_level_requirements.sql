-- 🔧 COMPLETE LEVEL REQUIREMENTS - ALL 999 LEVELS
-- Fix the "level" column reference ambiguity in calculate_level_from_xp function
-- Include EVERY SINGLE level from 1-999 with exact XP requirements

BEGIN;

DO $$ BEGIN RAISE NOTICE '🔧 Creating complete level system with ALL 999 levels...'; END $$;

-- 1. First, populate the level_xp_requirements table with ALL exact values
TRUNCATE TABLE public.level_xp_requirements;

-- Insert ALL level requirements (1-999)
INSERT INTO public.level_xp_requirements (level, xp_required) VALUES
-- Levels 1-10: 651 XP each
(1, 651), (2, 651), (3, 651), (4, 651), (5, 651), (6, 651), (7, 651), (8, 651), (9, 651), (10, 651),
-- Levels 11-20: 678 XP each
(11, 678), (12, 678), (13, 678), (14, 678), (15, 678), (16, 678), (17, 678), (18, 678), (19, 678), (20, 678),
-- Levels 21-30: 707 XP each
(21, 707), (22, 707), (23, 707), (24, 707), (25, 707), (26, 707), (27, 707), (28, 707), (29, 707), (30, 707),
-- Levels 31-40: 738 XP each
(31, 738), (32, 738), (33, 738), (34, 738), (35, 738), (36, 738), (37, 738), (38, 738), (39, 738), (40, 738),
-- Levels 41-50: 770 XP each
(41, 770), (42, 770), (43, 770), (44, 770), (45, 770), (46, 770), (47, 770), (48, 770), (49, 770), (50, 770),
-- Levels 51-60: 803 XP each
(51, 803), (52, 803), (53, 803), (54, 803), (55, 803), (56, 803), (57, 803), (58, 803), (59, 803), (60, 803),
-- Levels 61-70: 837 XP each
(61, 837), (62, 837), (63, 837), (64, 837), (65, 837), (66, 837), (67, 837), (68, 837), (69, 837), (70, 837),
-- Levels 71-80: 874 XP each
(71, 874), (72, 874), (73, 874), (74, 874), (75, 874), (76, 874), (77, 874), (78, 874), (79, 874), (80, 874),
-- Levels 81-90: 911 XP each
(81, 911), (82, 911), (83, 911), (84, 911), (85, 911), (86, 911), (87, 911), (88, 911), (89, 911), (90, 911),
-- Levels 91-100: 950 XP each
(91, 950), (92, 950), (93, 950), (94, 950), (95, 950), (96, 950), (97, 950), (98, 950), (99, 950), (100, 950),
-- Levels 101-110: 992 XP each
(101, 992), (102, 992), (103, 992), (104, 992), (105, 992), (106, 992), (107, 992), (108, 992), (109, 992), (110, 992),
-- Levels 111-120: 1034 XP each
(111, 1034), (112, 1034), (113, 1034), (114, 1034), (115, 1034), (116, 1034), (117, 1034), (118, 1034), (119, 1034), (120, 1034),
-- Levels 121-130: 1078 XP each
(121, 1078), (122, 1078), (123, 1078), (124, 1078), (125, 1078), (126, 1078), (127, 1078), (128, 1078), (129, 1078), (130, 1078),
-- Levels 131-140: 1124 XP each
(131, 1124), (132, 1124), (133, 1124), (134, 1124), (135, 1124), (136, 1124), (137, 1124), (138, 1124), (139, 1124), (140, 1124),
-- Levels 141-150: 1173 XP each
(141, 1173), (142, 1173), (143, 1173), (144, 1173), (145, 1173), (146, 1173), (147, 1173), (148, 1173), (149, 1173), (150, 1173),
-- Levels 151-160: 1222 XP each
(151, 1222), (152, 1222), (153, 1222), (154, 1222), (155, 1222), (156, 1222), (157, 1222), (158, 1222), (159, 1222), (160, 1222),
-- Levels 161-170: 1274 XP each
(161, 1274), (162, 1274), (163, 1274), (164, 1274), (165, 1274), (166, 1274), (167, 1274), (168, 1274), (169, 1274), (170, 1274),
-- Levels 171-180: 1328 XP each
(171, 1328), (172, 1328), (173, 1328), (174, 1328), (175, 1328), (176, 1328), (177, 1328), (178, 1328), (179, 1328), (180, 1328),
-- Levels 181-190: 1384 XP each
(181, 1384), (182, 1384), (183, 1384), (184, 1384), (185, 1384), (186, 1384), (187, 1384), (188, 1384), (189, 1384), (190, 1384),
-- Levels 191-200: 1441 XP each
(191, 1441), (192, 1441), (193, 1441), (194, 1441), (195, 1441), (196, 1441), (197, 1441), (198, 1441), (199, 1441), (200, 1441),
-- Levels 201-210: 1501 XP each
(201, 1501), (202, 1501), (203, 1501), (204, 1501), (205, 1501), (206, 1501), (207, 1501), (208, 1501), (209, 1501), (210, 1501),
-- Levels 211-220: 1564 XP each
(211, 1564), (212, 1564), (213, 1564), (214, 1564), (215, 1564), (216, 1564), (217, 1564), (218, 1564), (219, 1564), (220, 1564),
-- Levels 221-230: 1629 XP each
(221, 1629), (222, 1629), (223, 1629), (224, 1629), (225, 1629), (226, 1629), (227, 1629), (228, 1629), (229, 1629), (230, 1629),
-- Levels 231-240: 1696 XP each
(231, 1696), (232, 1696), (233, 1696), (234, 1696), (235, 1696), (236, 1696), (237, 1696), (238, 1696), (239, 1696), (240, 1696),
-- Levels 241-250: 1767 XP each
(241, 1767), (242, 1767), (243, 1767), (244, 1767), (245, 1767), (246, 1767), (247, 1767), (248, 1767), (249, 1767), (250, 1767),
-- Levels 251-260: 1840 XP each
(251, 1840), (252, 1840), (253, 1840), (254, 1840), (255, 1840), (256, 1840), (257, 1840), (258, 1840), (259, 1840), (260, 1840),
-- Levels 261-270: 1916 XP each
(261, 1916), (262, 1916), (263, 1916), (264, 1916), (265, 1916), (266, 1916), (267, 1916), (268, 1916), (269, 1916), (270, 1916),
-- Levels 271-280: 1995 XP each
(271, 1995), (272, 1995), (273, 1995), (274, 1995), (275, 1995), (276, 1995), (277, 1995), (278, 1995), (279, 1995), (280, 1995),
-- Levels 281-290: 2078 XP each
(281, 2078), (282, 2078), (283, 2078), (284, 2078), (285, 2078), (286, 2078), (287, 2078), (288, 2078), (289, 2078), (290, 2078),
-- Levels 291-300: 2163 XP each
(291, 2163), (292, 2163), (293, 2163), (294, 2163), (295, 2163), (296, 2163), (297, 2163), (298, 2163), (299, 2163), (300, 2163),
-- Levels 301-310: 2252 XP each
(301, 2252), (302, 2252), (303, 2252), (304, 2252), (305, 2252), (306, 2252), (307, 2252), (308, 2252), (309, 2252), (310, 2252),
-- Levels 311-320: 2344 XP each
(311, 2344), (312, 2344), (313, 2344), (314, 2344), (315, 2344), (316, 2344), (317, 2344), (318, 2344), (319, 2344), (320, 2344),
-- Levels 321-330: 2440 XP each
(321, 2440), (322, 2440), (323, 2440), (324, 2440), (325, 2440), (326, 2440), (327, 2440), (328, 2440), (329, 2440), (330, 2440),
-- Levels 331-340: 2540 XP each
(331, 2540), (332, 2540), (333, 2540), (334, 2540), (335, 2540), (336, 2540), (337, 2540), (338, 2540), (339, 2540), (340, 2540),
-- Levels 341-350: 2643 XP each
(341, 2643), (342, 2643), (343, 2643), (344, 2643), (345, 2643), (346, 2643), (347, 2643), (348, 2643), (349, 2643), (350, 2643),
-- Levels 351-360: 2751 XP each
(351, 2751), (352, 2751), (353, 2751), (354, 2751), (355, 2751), (356, 2751), (357, 2751), (358, 2751), (359, 2751), (360, 2751),
-- Levels 361-370: 2862 XP each
(361, 2862), (362, 2862), (363, 2862), (364, 2862), (365, 2862), (366, 2862), (367, 2862), (368, 2862), (369, 2862), (370, 2862),
-- Levels 371-380: 2978 XP each
(371, 2978), (372, 2978), (373, 2978), (374, 2978), (375, 2978), (376, 2978), (377, 2978), (378, 2978), (379, 2978), (380, 2978),
-- Levels 381-390: 3099 XP each
(381, 3099), (382, 3099), (383, 3099), (384, 3099), (385, 3099), (386, 3099), (387, 3099), (388, 3099), (389, 3099), (390, 3099),
-- Levels 391-400: 3223 XP each
(391, 3223), (392, 3223), (393, 3223), (394, 3223), (395, 3223), (396, 3223), (397, 3223), (398, 3223), (399, 3223), (400, 3223),
-- Levels 401-410: 3353 XP each
(401, 3353), (402, 3353), (403, 3353), (404, 3353), (405, 3353), (406, 3353), (407, 3353), (408, 3353), (409, 3353), (410, 3353),
-- Levels 411-420: 3488 XP each
(411, 3488), (412, 3488), (413, 3488), (414, 3488), (415, 3488), (416, 3488), (417, 3488), (418, 3488), (419, 3488), (420, 3488),
-- Levels 421-430: 3628 XP each
(421, 3628), (422, 3628), (423, 3628), (424, 3628), (425, 3628), (426, 3628), (427, 3628), (428, 3628), (429, 3628), (430, 3628),
-- Levels 431-440: 3773 XP each
(431, 3773), (432, 3773), (433, 3773), (434, 3773), (435, 3773), (436, 3773), (437, 3773), (438, 3773), (439, 3773), (440, 3773),
-- Levels 441-450: 3924 XP each
(441, 3924), (442, 3924), (443, 3924), (444, 3924), (445, 3924), (446, 3924), (447, 3924), (448, 3924), (449, 3924), (450, 3924),
-- Levels 451-460: 4081 XP each
(451, 4081), (452, 4081), (453, 4081), (454, 4081), (455, 4081), (456, 4081), (457, 4081), (458, 4081), (459, 4081), (460, 4081),
-- Levels 461-470: 4243 XP each
(461, 4243), (462, 4243), (463, 4243), (464, 4243), (465, 4243), (466, 4243), (467, 4243), (468, 4243), (469, 4243), (470, 4243),
-- Levels 471-480: 4412 XP each
(471, 4412), (472, 4412), (473, 4412), (474, 4412), (475, 4412), (476, 4412), (477, 4412), (478, 4412), (479, 4412), (480, 4412),
-- Levels 481-490: 4588 XP each
(481, 4588), (482, 4588), (483, 4588), (484, 4588), (485, 4588), (486, 4588), (487, 4588), (488, 4588), (489, 4588), (490, 4588),
-- Levels 491-500: 4770 XP each
(491, 4770), (492, 4770), (493, 4770), (494, 4770), (495, 4770), (496, 4770), (497, 4770), (498, 4770), (499, 4770), (500, 4770),
-- Levels 501-510: 4960 XP each
(501, 4960), (502, 4960), (503, 4960), (504, 4960), (505, 4960), (506, 4960), (507, 4960), (508, 4960), (509, 4960), (510, 4960),
-- Levels 511-520: 5157 XP each
(511, 5157), (512, 5157), (513, 5157), (514, 5157), (515, 5157), (516, 5157), (517, 5157), (518, 5157), (519, 5157), (520, 5157),
-- Levels 521-530: 5362 XP each
(521, 5362), (522, 5362), (523, 5362), (524, 5362), (525, 5362), (526, 5362), (527, 5362), (528, 5362), (529, 5362), (530, 5362),
-- Levels 531-540: 5576 XP each
(531, 5576), (532, 5576), (533, 5576), (534, 5576), (535, 5576), (536, 5576), (537, 5576), (538, 5576), (539, 5576), (540, 5576),
-- Levels 541-550: 5798 XP each
(541, 5798), (542, 5798), (543, 5798), (544, 5798), (545, 5798), (546, 5798), (547, 5798), (548, 5798), (549, 5798), (550, 5798),
-- Levels 551-560: 6030 XP each
(551, 6030), (552, 6030), (553, 6030), (554, 6030), (555, 6030), (556, 6030), (557, 6030), (558, 6030), (559, 6030), (560, 6030),
-- Levels 561-570: 6271 XP each
(561, 6271), (562, 6271), (563, 6271), (564, 6271), (565, 6271), (566, 6271), (567, 6271), (568, 6271), (569, 6271), (570, 6271),
-- Levels 571-580: 6522 XP each
(571, 6522), (572, 6522), (573, 6522), (574, 6522), (575, 6522), (576, 6522), (577, 6522), (578, 6522), (579, 6522), (580, 6522),
-- Levels 581-590: 6784 XP each
(581, 6784), (582, 6784), (583, 6784), (584, 6784), (585, 6784), (586, 6784), (587, 6784), (588, 6784), (589, 6784), (590, 6784),
-- Levels 591-600: 7057 XP each
(591, 7057), (592, 7057), (593, 7057), (594, 7057), (595, 7057), (596, 7057), (597, 7057), (598, 7057), (599, 7057), (600, 7057),
-- Levels 601-610: 7341 XP each
(601, 7341), (602, 7341), (603, 7341), (604, 7341), (605, 7341), (606, 7341), (607, 7341), (608, 7341), (609, 7341), (610, 7341),
-- Levels 611-620: 7637 XP each
(611, 7637), (612, 7637), (613, 7637), (614, 7637), (615, 7637), (616, 7637), (617, 7637), (618, 7637), (619, 7637), (620, 7637),
-- Levels 621-630: 7945 XP each
(621, 7945), (622, 7945), (623, 7945), (624, 7945), (625, 7945), (626, 7945), (627, 7945), (628, 7945), (629, 7945), (630, 7945),
-- Levels 631-640: 8266 XP each
(631, 8266), (632, 8266), (633, 8266), (634, 8266), (635, 8266), (636, 8266), (637, 8266), (638, 8266), (639, 8266), (640, 8266),
-- Levels 641-650: 8600 XP each
(641, 8600), (642, 8600), (643, 8600), (644, 8600), (645, 8600), (646, 8600), (647, 8600), (648, 8600), (649, 8600), (650, 8600),
-- Levels 651-660: 8948 XP each
(651, 8948), (652, 8948), (653, 8948), (654, 8948), (655, 8948), (656, 8948), (657, 8948), (658, 8948), (659, 8948), (660, 8948),
-- Levels 661-670: 9309 XP each
(661, 9309), (662, 9309), (663, 9309), (664, 9309), (665, 9309), (666, 9309), (667, 9309), (668, 9309), (669, 9309), (670, 9309),
-- Levels 671-680: 9685 XP each
(671, 9685), (672, 9685), (673, 9685), (674, 9685), (675, 9685), (676, 9685), (677, 9685), (678, 9685), (679, 9685), (680, 9685),
-- Levels 681-690: 10076 XP each
(681, 10076), (682, 10076), (683, 10076), (684, 10076), (685, 10076), (686, 10076), (687, 10076), (688, 10076), (689, 10076), (690, 10076),
-- Levels 691-700: 10483 XP each
(691, 10483), (692, 10483), (693, 10483), (694, 10483), (695, 10483), (696, 10483), (697, 10483), (698, 10483), (699, 10483), (700, 10483),
-- Levels 701-710: 10902 XP each
(701, 10902), (702, 10902), (703, 10902), (704, 10902), (705, 10902), (706, 10902), (707, 10902), (708, 10902), (709, 10902), (710, 10902),
-- Levels 711-720: 11336 XP each
(711, 11336), (712, 11336), (713, 11336), (714, 11336), (715, 11336), (716, 11336), (717, 11336), (718, 11336), (719, 11336), (720, 11336),
-- Levels 721-730: 11790 XP each
(721, 11790), (722, 11790), (723, 11790), (724, 11790), (725, 11790), (726, 11790), (727, 11790), (728, 11790), (729, 11790), (730, 11790),
-- Levels 731-740: 12262 XP each
(731, 12262), (732, 12262), (733, 12262), (734, 12262), (735, 12262), (736, 12262), (737, 12262), (738, 12262), (739, 12262), (740, 12262),
-- Levels 741-750: 12752 XP each
(741, 12752), (742, 12752), (743, 12752), (744, 12752), (745, 12752), (746, 12752), (747, 12752), (748, 12752), (749, 12752), (750, 12752),
-- Levels 751-760: 13262 XP each
(751, 13262), (752, 13262), (753, 13262), (754, 13262), (755, 13262), (756, 13262), (757, 13262), (758, 13262), (759, 13262), (760, 13262),
-- Levels 761-770: 13792 XP each
(761, 13792), (762, 13792), (763, 13792), (764, 13792), (765, 13792), (766, 13792), (767, 13792), (768, 13792), (769, 13792), (770, 13792),
-- Levels 771-780: 14344 XP each
(771, 14344), (772, 14344), (773, 14344), (774, 14344), (775, 14344), (776, 14344), (777, 14344), (778, 14344), (779, 14344), (780, 14344),
-- Levels 781-790: 14917 XP each
(781, 14917), (782, 14917), (783, 14917), (784, 14917), (785, 14917), (786, 14917), (787, 14917), (788, 14917), (789, 14917), (790, 14917),
-- Levels 791-800: 15513 XP each
(791, 15513), (792, 15513), (793, 15513), (794, 15513), (795, 15513), (796, 15513), (797, 15513), (798, 15513), (799, 15513), (800, 15513),
-- Levels 801-810: 16133 XP each
(801, 16133), (802, 16133), (803, 16133), (804, 16133), (805, 16133), (806, 16133), (807, 16133), (808, 16133), (809, 16133), (810, 16133),
-- Levels 811-820: 16777 XP each
(811, 16777), (812, 16777), (813, 16777), (814, 16777), (815, 16777), (816, 16777), (817, 16777), (818, 16777), (819, 16777), (820, 16777),
-- Levels 821-830: 17446 XP each
(821, 17446), (822, 17446), (823, 17446), (824, 17446), (825, 17446), (826, 17446), (827, 17446), (828, 17446), (829, 17446), (830, 17446),
-- Levels 831-840: 18142 XP each
(831, 18142), (832, 18142), (833, 18142), (834, 18142), (835, 18142), (836, 18142), (837, 18142), (838, 18142), (839, 18142), (840, 18142),
-- Levels 841-850: 18866 XP each
(841, 18866), (842, 18866), (843, 18866), (844, 18866), (845, 18866), (846, 18866), (847, 18866), (848, 18866), (849, 18866), (850, 18866),
-- Levels 851-860: 19619 XP each
(851, 19619), (852, 19619), (853, 19619), (854, 19619), (855, 19619), (856, 19619), (857, 19619), (858, 19619), (859, 19619), (860, 19619),
-- Levels 861-870: 20403 XP each
(861, 20403), (862, 20403), (863, 20403), (864, 20403), (865, 20403), (866, 20403), (867, 20403), (868, 20403), (869, 20403), (870, 20403),
-- Levels 871-880: 21219 XP each
(871, 21219), (872, 21219), (873, 21219), (874, 21219), (875, 21219), (876, 21219), (877, 21219), (878, 21219), (879, 21219), (880, 21219),
-- Levels 881-890: 22068 XP each
(881, 22068), (882, 22068), (883, 22068), (884, 22068), (885, 22068), (886, 22068), (887, 22068), (888, 22068), (889, 22068), (890, 22068),
-- Levels 891-900: 22951 XP each
(891, 22951), (892, 22951), (893, 22951), (894, 22951), (895, 22951), (896, 22951), (897, 22951), (898, 22951), (899, 22951), (900, 22951),
-- Levels 901-910: 23870 XP each
(901, 23870), (902, 23870), (903, 23870), (904, 23870), (905, 23870), (906, 23870), (907, 23870), (908, 23870), (909, 23870), (910, 23870),
-- Levels 911-920: 24825 XP each
(911, 24825), (912, 24825), (913, 24825), (914, 24825), (915, 24825), (916, 24825), (917, 24825), (918, 24825), (919, 24825), (920, 24825),
-- Levels 921-930: 25818 XP each
(921, 25818), (922, 25818), (923, 25818), (924, 25818), (925, 25818), (926, 25818), (927, 25818), (928, 25818), (929, 25818), (930, 25818),
-- Levels 931-940: 26851 XP each
(931, 26851), (932, 26851), (933, 26851), (934, 26851), (935, 26851), (936, 26851), (937, 26851), (938, 26851), (939, 26851), (940, 26851),
-- Levels 941-950: 27925 XP each
(941, 27925), (942, 27925), (943, 27925), (944, 27925), (945, 27925), (946, 27925), (947, 27925), (948, 27925), (949, 27925), (950, 27925),
-- Levels 951-960: 29042 XP each
(951, 29042), (952, 29042), (953, 29042), (954, 29042), (955, 29042), (956, 29042), (957, 29042), (958, 29042), (959, 29042), (960, 29042),
-- Levels 961-970: 30203 XP each
(961, 30203), (962, 30203), (963, 30203), (964, 30203), (965, 30203), (966, 30203), (967, 30203), (968, 30203), (969, 30203), (970, 30203),
-- Levels 971-980: 31410 XP each
(971, 31410), (972, 31410), (973, 31410), (974, 31410), (975, 31410), (976, 31410), (977, 31410), (978, 31410), (979, 31410), (980, 31410),
-- Levels 981-990: 32664 XP each
(981, 32664), (982, 32664), (983, 32664), (984, 32664), (985, 32664), (986, 32664), (987, 32664), (988, 32664), (989, 32664), (990, 32664),
-- Levels 991-999: 33968 XP each (final tier)
(991, 33968), (992, 33968), (993, 33968), (994, 33968), (995, 33968), (996, 33968), (997, 33968), (998, 33968), (999, 33968);

DO $$ BEGIN RAISE NOTICE '✅ Updated level_xp_requirements with ALL 999 levels'; END $$;

-- 2. Recreate the calculate_level_from_xp function with fixed column references
DROP FUNCTION IF EXISTS public.calculate_level_from_xp(integer);
DROP FUNCTION IF EXISTS public.calculate_level_from_xp(numeric);

CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp integer)
RETURNS TABLE(user_level integer, current_level_xp integer, xp_to_next integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_level INTEGER := 1;
  v_current_xp INTEGER := 0;
  v_next_level_xp INTEGER := 651;  -- Default for level 1->2
  v_remaining_xp INTEGER;
  level_record RECORD;
BEGIN
  -- Handle edge cases
  IF total_xp <= 0 THEN
    RETURN QUERY SELECT 1, 0::integer, 651;
    RETURN;
  END IF;
  
  -- Calculate level by going through cumulative XP requirements
  v_remaining_xp := total_xp;
  
  -- Loop through levels with proper table aliases
  FOR level_record IN 
    SELECT req.level as req_level, req.xp_required as req_xp
    FROM public.level_xp_requirements req 
    ORDER BY req.level ASC
  LOOP
    -- If we have enough XP to complete this level
    IF v_remaining_xp >= level_record.req_xp THEN
      v_remaining_xp := v_remaining_xp - level_record.req_xp;
      v_user_level := level_record.req_level;
      v_current_xp := 0;  -- We completed this level
    ELSE
      -- We're currently in this level
      v_current_xp := v_remaining_xp;
      v_next_level_xp := level_record.req_xp - v_remaining_xp;
      EXIT;  -- Stop here, we found our current level
    END IF;
  END LOOP;
  
  -- If we've gone through all levels, we're at max level
  IF v_user_level >= 999 THEN
    v_user_level := 999;
    v_current_xp := v_remaining_xp;
    v_next_level_xp := 0;  -- No more levels
  ELSE
    -- Get XP requirement for next level if we haven't set it yet
    -- Use explicit table alias to avoid ambiguity
    IF v_next_level_xp IS NULL OR v_next_level_xp = 651 THEN
      SELECT req.xp_required INTO v_next_level_xp 
      FROM public.level_xp_requirements req
      WHERE req.level = v_user_level + 1;
      v_next_level_xp := COALESCE(v_next_level_xp, 0) - v_current_xp;
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    v_user_level,
    v_current_xp,
    GREATEST(0, v_next_level_xp);
END;
$function$;

-- Create numeric version for compatibility
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp numeric)
RETURNS TABLE(user_level integer, current_level_xp integer, xp_to_next integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY SELECT * FROM public.calculate_level_from_xp(total_xp::integer);
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.calculate_level_from_xp(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_level_from_xp(numeric) TO anon, authenticated, service_role;

-- 3. Test the new level calculation with comprehensive tests
DO $$
DECLARE
  test_result RECORD;
BEGIN
  RAISE NOTICE '🧪 Testing complete level calculation system...';
  
  -- Test level 1 start (0 XP)
  SELECT * INTO test_result FROM public.calculate_level_from_xp(0);
  RAISE NOTICE 'Test 0 XP: Level %, Current %, To Next %', test_result.user_level, test_result.current_level_xp, test_result.xp_to_next;
  
  -- Test middle of level 1 (325 XP)
  SELECT * INTO test_result FROM public.calculate_level_from_xp(325);
  RAISE NOTICE 'Test 325 XP: Level %, Current %, To Next %', test_result.user_level, test_result.current_level_xp, test_result.xp_to_next;
  
  -- Test level 2 start (651 XP)
  SELECT * INTO test_result FROM public.calculate_level_from_xp(651);
  RAISE NOTICE 'Test 651 XP: Level %, Current %, To Next %', test_result.user_level, test_result.current_level_xp, test_result.xp_to_next;
  
  -- Test level 11 start (6510 XP = 651*10)
  SELECT * INTO test_result FROM public.calculate_level_from_xp(6510);
  RAISE NOTICE 'Test 6510 XP: Level %, Current %, To Next %', test_result.user_level, test_result.current_level_xp, test_result.xp_to_next;
  
  -- Test level 21 start (6510 + 6780 = 13290 XP)
  SELECT * INTO test_result FROM public.calculate_level_from_xp(13290);
  RAISE NOTICE 'Test 13290 XP: Level %, Current %, To Next %', test_result.user_level, test_result.current_level_xp, test_result.xp_to_next;
  
  -- Test level 100 boundary
  SELECT * INTO test_result FROM public.calculate_level_from_xp(90000);
  RAISE NOTICE 'Test 90000 XP: Level %, Current %, To Next %', test_result.user_level, test_result.current_level_xp, test_result.xp_to_next;
  
  -- Test very high level
  SELECT * INTO test_result FROM public.calculate_level_from_xp(1000000);
  RAISE NOTICE 'Test 1000000 XP: Level %, Current %, To Next %', test_result.user_level, test_result.current_level_xp, test_result.xp_to_next;
  
END $$;

-- 4. Update all existing users to have correct level calculations based on their lifetime XP
UPDATE public.user_level_stats
SET 
  current_level = (SELECT user_level FROM public.calculate_level_from_xp(lifetime_xp::integer)),
  current_level_xp = (SELECT current_level_xp FROM public.calculate_level_from_xp(lifetime_xp::integer)),
  xp_to_next_level = (SELECT xp_to_next FROM public.calculate_level_from_xp(lifetime_xp::integer))
WHERE lifetime_xp IS NOT NULL AND lifetime_xp >= 0;

-- 5. Create a helper function to recalculate user levels (for future use)
CREATE OR REPLACE FUNCTION public.recalculate_user_levels()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE public.user_level_stats
  SET 
    current_level = (SELECT user_level FROM public.calculate_level_from_xp(lifetime_xp::integer)),
    current_level_xp = (SELECT current_level_xp FROM public.calculate_level_from_xp(lifetime_xp::integer)),
    xp_to_next_level = (SELECT xp_to_next FROM public.calculate_level_from_xp(lifetime_xp::integer))
  WHERE lifetime_xp IS NOT NULL AND lifetime_xp >= 0;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.recalculate_user_levels() TO anon, authenticated, service_role;

DO $$ BEGIN RAISE NOTICE '✅ Complete level system created with ALL 999 levels!'; END $$;

COMMIT;