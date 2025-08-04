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

// Level-based reward ranges
const LEVEL_REWARDS = {
  2: {
    common: { min: 0.05, max: 0.07 },
    rare: { min: 0.12, max: 0.15 },
    epic: { min: 0.27, max: 0.33 },
    legendary: { min: 0.80, max: 0.98 }
  },
  5: {
    common: { min: 0.21, max: 0.26 },
    rare: { min: 0.48, max: 0.59 },
    epic: { min: 1.07, max: 1.31 },
    legendary: { min: 3.21, max: 3.92 }
  },
  25: {
    common: { min: 0.81, max: 0.99 },
    rare: { min: 1.82, max: 2.23 },
    epic: { min: 4.05, max: 4.95 },
    legendary: { min: 12.15, max: 14.85 }
  },
  50: {
    common: { min: 2.91, max: 3.56 },
    rare: { min: 6.55, max: 8.01 },
    epic: { min: 14.56, max: 17.80 },
    legendary: { min: 43.68, max: 53.39 }
  },
  75: {
    common: { min: 6.48, max: 7.92 },
    rare: { min: 14.59, max: 17.83 },
    epic: { min: 32.42, max: 39.62 },
    legendary: { min: 97.25, max: 118.86 }
  },
  100: {
    common: { min: 11.38, max: 13.91 },
    rare: { min: 25.61, max: 31.30 },
    epic: { min: 56.91, max: 69.56 },
    legendary: { min: 170.73, max: 208.67 }
  },
  125: {
    common: { min: 17.68, max: 21.61 },
    rare: { min: 39.77, max: 48.61 },
    epic: { min: 88.38, max: 108.03 },
    legendary: { min: 265.15, max: 324.08 }
  },
  150: {
    common: { min: 24.71, max: 30.20 },
    rare: { min: 55.60, max: 67.96 },
    epic: { min: 123.56, max: 151.02 },
    legendary: { min: 370.68, max: 453.05 }
  },
  200: {
    common: { min: 34.03, max: 41.59 },
    rare: { min: 76.57, max: 93.58 },
    epic: { min: 170.15, max: 207.96 },
    legendary: { min: 510.45, max: 623.88 }
  },
  250: {
    common: { min: 44.37, max: 54.23 },
    rare: { min: 99.84, max: 122.02 },
    epic: { min: 221.86, max: 271.16 },
    legendary: { min: 665.57, max: 813.47 }
  },
  300: {
    common: { min: 55.46, max: 67.79 },
    rare: { min: 124.79, max: 152.52 },
    epic: { min: 277.32, max: 338.94 },
    legendary: { min: 831.95, max: 1016.82 }
  },
  350: {
    common: { min: 67.43, max: 82.41 },
    rare: { min: 151.71, max: 185.42 },
    epic: { min: 337.13, max: 412.05 },
    legendary: { min: 1011.40, max: 1236.16 }
  },
  400: {
    common: { min: 80.76, max: 98.71 },
    rare: { min: 181.71, max: 222.09 },
    epic: { min: 403.80, max: 493.53 },
    legendary: { min: 1211.40, max: 1480.58 }
  },
  450: {
    common: { min: 95.26, max: 116.04 },
    rare: { min: 214.71, max: 262.61 },
    epic: { min: 477.56, max: 584.44 },
    legendary: { min: 1432.67, max: 1750.04 }
  },
  500: {
    common: { min: 110.90, max: 135.05 },
    rare: { min: 250.33, max: 306.40 },
    epic: { min: 556.18, max: 680.26 },
    legendary: { min: 1668.55, max: 2038.98 }
  },
  600: {
    common: { min: 144.24, max: 175.75 },
    rare: { min: 325.32, max: 398.07 },
    epic: { min: 723.72, max: 884.61 },
    legendary: { min: 2171.15, max: 2642.31 }
  },
  700: {
    common: { min: 180.27, max: 219.80 },
    rare: { min: 406.65, max: 497.05 },
    epic: { min: 904.97, max: 1105.14 },
    legendary: { min: 2714.90, max: 3315.43 }
  },
  800: {
    common: { min: 219.00, max: 267.38 },
    rare: { min: 493.75, max: 603.88 },
    epic: { min: 1099.88, max: 1344.85 },
    legendary: { min: 3299.64, max: 4034.55 }
  },
  900: {
    common: { min: 260.44, max: 317.97 },
    rare: { min: 586.48, max: 717.12 },
    epic: { min: 1307.99, max: 1599.63 },
    legendary: { min: 3923.96, max: 4798.90 }
  },
  1000: {
    common: { min: 304.58, max: 372.59 },
    rare: { min: 684.64, max: 837.41 },
    epic: { min: 1522.88, max: 1862.18 },
    legendary: { min: 4568.65, max: 5594.31 }
  }
};

// Rarity chances
const RARITY_CHANCES = {
  common: 75,
  rare: 20,
  epic: 4,
  legendary: 1
};

function generateSecureReward(level: number): CaseReward {
  // Use crypto.getRandomValues for secure random generation
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  const random = randomArray[0] / (0xFFFFFFFF + 1) * 100;
  
  let rarity: CaseReward['rarity'] = 'common';
  
  // Determine rarity based on chances
  if (random < RARITY_CHANCES.legendary) {
    rarity = 'legendary';
  } else if (random < RARITY_CHANCES.legendary + RARITY_CHANCES.epic) {
    rarity = 'epic';
  } else if (random < RARITY_CHANCES.legendary + RARITY_CHANCES.epic + RARITY_CHANCES.rare) {
    rarity = 'rare';
  } else {
    rarity = 'common';
  }
  
  // Get the closest level for reward calculation
  const availableLevels = Object.keys(LEVEL_REWARDS).map(Number).sort((a, b) => a - b);
  let targetLevel = availableLevels[0]; // Default to lowest level
  
  for (const availableLevel of availableLevels) {
    if (level >= availableLevel) {
      targetLevel = availableLevel;
    } else {
      break;
    }
  }
  
  // Get reward range for the target level and rarity
  const rewardRange = LEVEL_REWARDS[targetLevel][rarity];
  
  // Generate another secure random for amount within range
  crypto.getRandomValues(randomArray);
  const amountRandom = randomArray[0] / (0xFFFFFFFF + 1);
  const amount = rewardRange.min + (amountRandom * (rewardRange.max - rewardRange.min));
  const roundedAmount = Math.round(amount * 100) / 100; // Round to 2 decimals
  
  return {
    rarity,
    amount: roundedAmount,
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