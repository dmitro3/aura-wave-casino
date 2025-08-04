-- 🔍 CHECK RLS POLICIES - Find what's blocking stats updates

-- Check all RLS policies on user_level_stats
SELECT 
  'RLS POLICY' as check_type,
  policyname as policy_name,
  cmd as command_type,
  permissive as is_permissive,
  roles as applies_to_roles,
  qual as policy_condition
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_level_stats'

UNION ALL

-- Check table permissions
SELECT 
  'TABLE PERMISSIONS' as check_type,
  'UPDATE permission for service_role' as policy_name,
  '' as command_type,
  '' as is_permissive,
  '' as applies_to_roles,
  CASE WHEN has_table_privilege('service_role', 'public.user_level_stats', 'UPDATE')
    THEN 'GRANTED' 
    ELSE 'DENIED' 
  END as policy_condition

UNION ALL

SELECT 
  'TABLE PERMISSIONS' as check_type,
  'INSERT permission for service_role' as policy_name,
  '' as command_type,
  '' as is_permissive,
  '' as applies_to_roles,
  CASE WHEN has_table_privilege('service_role', 'public.user_level_stats', 'INSERT')
    THEN 'GRANTED' 
    ELSE 'DENIED' 
  END as policy_condition;