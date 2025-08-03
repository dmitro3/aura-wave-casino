import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hqdbdczxottbupwbupdu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGJkY3p4b3R0YnVwd2J1cGR1Iiwicm9sZSI6InNlcnZpY2Vcm9sZSIsImlhdCI6MTc1MzExNTYyNCwiZXhwIjoyMDY4NjkxNjI0fQ.fzwVymJQjZO_fL4s82U3nlR3lSk8KHoA2weHmOqpYDw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    // Check user_level_stats table structure
    console.log('🔍 Checking user_level_stats table...');
    const { data: userLevelStats, error: userError } = await supabase
      .from('user_level_stats')
      .select('*')
      .limit(1);
    
    if (userError) {
      console.error('❌ Error querying user_level_stats:', userError);
    } else {
      console.log('✅ user_level_stats columns:', Object.keys(userLevelStats[0] || {}));
      if (userLevelStats[0]) {
        console.log('📊 Sample data:', userLevelStats[0]);
      }
    }

    // Check profiles table structure  
    console.log('🔍 Checking profiles table...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profileError) {
      console.error('❌ Error querying profiles:', profileError);
    } else {
      console.log('✅ profiles columns:', Object.keys(profiles[0] || {}));
      if (profiles[0]) {
        console.log('👤 Sample data:', profiles[0]);
      }
    }

    // Check if level_xp_requirements table exists
    console.log('🔍 Checking level_xp_requirements table...');
    const { data: levelReqs, error: levelError } = await supabase
      .from('level_xp_requirements')
      .select('*')
      .limit(1);
    
    if (levelError) {
      console.log('⚠️ level_xp_requirements table does not exist yet (expected):', levelError.message);
    } else {
      console.log('✅ level_xp_requirements exists:', Object.keys(levelReqs[0] || {}));
    }

    // Test existing functions by calling them
    console.log('🔍 Testing calculate_level_from_xp_new function...');
    const { data: levelTest, error: levelTestError } = await supabase
      .rpc('calculate_level_from_xp_new', { total_xp: 10000 });
    
    if (levelTestError) {
      console.log('⚠️ calculate_level_from_xp_new error:', levelTestError.message);
    } else {
      console.log('✅ Function works:', levelTest);
    }

    console.log('🔍 Testing calculate_xp_for_level_new function...');
    const { data: xpTest, error: xpTestError } = await supabase
      .rpc('calculate_xp_for_level_new', { target_level: 17 });
    
    if (xpTestError) {
      console.log('⚠️ calculate_xp_for_level_new error:', xpTestError.message);
    } else {
      console.log('✅ Function works:', xpTest);
    }

  } catch (error) {
    console.error('❌ Connection error:', error);
  }
}

checkSchema();