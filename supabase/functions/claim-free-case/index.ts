import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClaimRequest {
  caseType: 'common' | 'rare' | 'epic';
}

interface ClaimResponse {
  success: boolean;
  amount?: number;
  error?: string;
  nextClaimTime?: string;
}

const CASE_CONFIG = {
  common: { min: 500, max: 2500, cooldown: 1 },
  rare: { min: 2500, max: 10000, cooldown: 5 },
  epic: { min: 10000, max: 50000, cooldown: 15 }
};

function generateSecureReward(caseType: keyof typeof CASE_CONFIG): number {
  const config = CASE_CONFIG[caseType];
  const crypto = globalThis.crypto;
  
  // Generate secure random number for reward amount
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  const randomFloat = randomArray[0] / (0xffffffff + 1);
  
  const amount = config.min + (randomFloat * (config.max - config.min));
  return Math.round(amount);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { caseType }: ClaimRequest = await req.json();

    console.log(`🎁 User ${user.id} attempting to claim ${caseType} free case`);

    // Validate case type
    if (!caseType || !CASE_CONFIG[caseType]) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid case type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user can claim this case type (server-side verification)
    const { data: canClaim, error: canClaimError } = await supabase.rpc(
      'can_claim_free_case',
      { p_user_id: user.id, p_case_type: caseType }
    );

    if (canClaimError) {
      console.error('Error checking claim eligibility:', canClaimError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error checking claim eligibility' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!canClaim) {
      // Get next claim time
      const { data: nextClaimTime } = await supabase.rpc(
        'get_next_free_case_claim_time',
        { p_user_id: user.id, p_case_type: caseType }
      );

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Case still on cooldown',
          nextClaimTime: nextClaimTime 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure reward amount
    const rewardAmount = generateSecureReward(caseType);
    console.log(`💰 Generated ${caseType} reward: $${rewardAmount}`);

    // Begin transaction - update user balance and record claim
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        balance: supabase.sql`balance + ${rewardAmount}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user balance:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record the claim
    const { error: claimError } = await supabase
      .from('free_case_claims')
      .insert({
        user_id: user.id,
        case_type: caseType,
        amount: rewardAmount
      });

    if (claimError) {
      console.error('Error recording claim:', claimError);
      // Try to rollback balance update
      await supabase
        .from('profiles')
        .update({ 
          balance: supabase.sql`balance - ${rewardAmount}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to record claim' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Free case claimed successfully! User received $${rewardAmount}`);

    const response: ClaimResponse = {
      success: true,
      amount: rewardAmount
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});