import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaseOpenRequest {
  caseId: string;
  level: number;
}

interface CaseReward {
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  amount: number;
  level: number;
  animationType: string;
}

// Rarity configuration with level-based scaling
const RARITY_CONFIG = {
  common: { chance: 60, minMultiplier: 0.5, maxMultiplier: 2.5 },
  rare: { chance: 25, minMultiplier: 3, maxMultiplier: 12 },
  epic: { chance: 12, minMultiplier: 15, maxMultiplier: 40 },
  legendary: { chance: 3, minMultiplier: 50, maxMultiplier: 100 }
};

function generateSecureReward(level: number): CaseReward {
  // Use crypto.getRandomValues for secure random generation
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  const random = randomArray[0] / (0xFFFFFFFF + 1) * 100;
  
  let rarity: CaseReward['rarity'] = 'common';
  
  // Determine rarity based on chances
  if (random < RARITY_CONFIG.legendary.chance) {
    rarity = 'legendary';
  } else if (random < RARITY_CONFIG.legendary.chance + RARITY_CONFIG.epic.chance) {
    rarity = 'epic';
  } else if (random < RARITY_CONFIG.legendary.chance + RARITY_CONFIG.epic.chance + RARITY_CONFIG.rare.chance) {
    rarity = 'rare';
  } else {
    rarity = 'common';
  }
  
  // Calculate reward amount based on level and rarity
  const config = RARITY_CONFIG[rarity];
  const baseAmount = Math.max(1, level * 0.1); // Base scaling
  
  // Generate another secure random for amount within range
  crypto.getRandomValues(randomArray);
  const amountRandom = randomArray[0] / (0xFFFFFFFF + 1);
  const multiplier = config.minMultiplier + (amountRandom * (config.maxMultiplier - config.minMultiplier));
  const amount = Math.round(baseAmount * multiplier * 100) / 100; // Round to 2 decimals
  
  return {
    rarity,
    amount,
    level,
    animationType: rarity === 'legendary' ? 'explosion' : rarity === 'epic' ? 'sparkle' : 'glow'
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    if (req.method === 'POST') {
      const { caseId, level }: CaseOpenRequest = await req.json();
      
      console.log(`🎲 Opening case ${caseId} for user ${user.id} at level ${level}`);

      // Verify case ownership and that it hasn't been opened
      const { data: caseData, error: caseError } = await supabase
        .from('case_rewards')
        .select('*')
        .eq('id', caseId)
        .eq('user_id', user.id)
        .eq('rarity', 'pending')
        .eq('level_unlocked', level)
        .single();

      if (caseError || !caseData) {
        console.error('❌ Case verification failed:', caseError);
        throw new Error('Invalid case or already opened');
      }

      // Generate secure reward
      const reward = generateSecureReward(level);
      console.log(`🎁 Generated reward: ${reward.rarity} - $${reward.amount}`);

      // Update case with reward (lock it immediately)
      const { error: updateError } = await supabase
        .from('case_rewards')
        .update({
          rarity: reward.rarity,
          reward_amount: reward.amount,
          opened_at: new Date().toISOString()
        })
        .eq('id', caseId);

      if (updateError) {
        console.error('❌ Failed to update case:', updateError);
        throw new Error('Failed to update case');
      }

      // Update user balance and case statistics
      const { data: stats, error: statsError } = await supabase
        .from('user_level_stats')
        .select('available_cases, total_cases_opened, total_case_value')
        .eq('user_id', user.id)
        .single();

      if (statsError) {
        console.error('❌ Failed to get user stats:', statsError);
        throw new Error('Failed to get user stats');
      }

      // Update user level stats
      const { error: statsUpdateError } = await supabase
        .from('user_level_stats')
        .update({
          available_cases: Math.max(0, stats.available_cases - 1),
          total_cases_opened: stats.total_cases_opened + 1,
          total_case_value: stats.total_case_value + reward.amount
        })
        .eq('user_id', user.id);

      if (statsUpdateError) {
        console.error('❌ Failed to update user stats:', statsUpdateError);
        throw new Error('Failed to update user stats');
      }

      // Update user balance in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Failed to get profile:', profileError);
        throw new Error('Failed to get profile');
      }

      const { error: balanceUpdateError } = await supabase
        .from('profiles')
        .update({
          balance: profile.balance + reward.amount
        })
        .eq('id', user.id);

      if (balanceUpdateError) {
        console.error('❌ Failed to update balance:', balanceUpdateError);
        throw new Error('Failed to update balance');
      }

      console.log(`✅ Case opened successfully! User received $${reward.amount}`);

      return new Response(
        JSON.stringify({
          success: true,
          reward: {
            rarity: reward.rarity,
            amount: reward.amount,
            level: reward.level,
            animationType: reward.animationType,
            caseId: caseId
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );

  } catch (error) {
    console.error('🚨 Case opening error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});