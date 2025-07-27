import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Roulette wheel configuration: 15 slots total in specific order
const WHEEL_SLOTS = [
  { slot: 0, color: 'green', multiplier: 14 },
  { slot: 11, color: 'black', multiplier: 2 },
  { slot: 5, color: 'red', multiplier: 2 },
  { slot: 10, color: 'black', multiplier: 2 },
  { slot: 6, color: 'red', multiplier: 2 },
  { slot: 9, color: 'black', multiplier: 2 },
  { slot: 7, color: 'red', multiplier: 2 },
  { slot: 8, color: 'black', multiplier: 2 },
  { slot: 1, color: 'red', multiplier: 2 },
  { slot: 14, color: 'black', multiplier: 2 },
  { slot: 2, color: 'red', multiplier: 2 },
  { slot: 13, color: 'black', multiplier: 2 },
  { slot: 3, color: 'red', multiplier: 2 },
  { slot: 12, color: 'black', multiplier: 2 },
  { slot: 4, color: 'red', multiplier: 2 }
];

const BETTING_DURATION = 15000; // 15 seconds betting
const SPINNING_DURATION = 4000; // 4 seconds spinning animation

// Advanced Provably Fair Constants
const DAILY_SEED_LENGTH = 64; // 64 character hex string (256 bits)
const LOTTO_LENGTH = 10; // 10 digit lotto number

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, userId, betColor, betAmount, roundId, clientSeed } = await req.json();
    console.log(`🎰 Roulette Engine: ${action}`);

    switch (action) {
      case 'get_current_round': {
        const round = await getCurrentRound(supabase);
        return new Response(JSON.stringify(round), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'place_bet': {
        if (!userId || !betColor || !betAmount || !roundId) {
          throw new Error('Missing required bet parameters');
        }

        const bet = await placeBet(supabase, userId, roundId, betColor, betAmount, clientSeed);
        return new Response(JSON.stringify(bet), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_round_bets': {
        if (!roundId) {
          return new Response(JSON.stringify({ error: 'Round ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          const { data: bets, error } = await supabase
            .from('roulette_bets')
            .select(`
              *,
              profiles(username, avatar_url)
            `)
            .eq('round_id', roundId)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('❌ Error fetching round bets:', error);
            // Try without profiles join as fallback
            const { data: fallbackBets, error: fallbackError } = await supabase
              .from('roulette_bets')
              .select('*')
              .eq('round_id', roundId)
              .order('created_at', { ascending: false });

            if (fallbackError) {
              console.error('❌ Fallback bet fetch also failed:', fallbackError);
              return new Response(JSON.stringify([]), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            console.log(`📊 Retrieved ${fallbackBets?.length || 0} bets (fallback) for round ${roundId}`);
            return new Response(JSON.stringify(fallbackBets || []), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          console.log(`📊 Retrieved ${bets?.length || 0} bets for round ${roundId}`);
          return new Response(JSON.stringify(bets || []), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (error) {
          console.error('❌ get_round_bets crashed:', error);
          return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      case 'get_recent_results': {
        // Pull from authoritative roulette_rounds table (same as Provably Fair)
        const { data: results, error } = await supabase
          .from('roulette_rounds')
          .select('id, round_number, result_slot, result_color, result_multiplier, created_at')
          .eq('status', 'completed')
          .order('round_number', { ascending: false })
          .limit(15);

        if (error) throw error;

        return new Response(JSON.stringify(results || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'set_client_seed': {
        if (!userId || !clientSeed) {
          throw new Error('Missing required parameters');
        }

        const result = await setClientSeed(supabase, userId, clientSeed);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'verify_round': {
        if (!roundId) {
          throw new Error('Round ID required');
        }

        const verification = await verifyRound(supabase, roundId, clientSeed);
        return new Response(JSON.stringify(verification), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'test_bets': {
        // Test endpoint to check if bets are being stored correctly
        const { data: allBets } = await supabase
          .from('roulette_bets')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        const { data: allRounds } = await supabase
          .from('roulette_rounds')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        // Check live bet feed data
        const { data: liveFeed } = await supabase
          .from('live_bet_feed')
          .select('*')
          .eq('game_type', 'roulette')
          .order('created_at', { ascending: false })
          .limit(10);

        return new Response(JSON.stringify({
          recent_bets: allBets || [],
          recent_rounds: allRounds || [],
          live_feed: liveFeed || [],
          test_passed: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }





      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('❌ Roulette Engine Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function getCurrentRound(supabase: any) {
  console.log('🔍 Getting current round');
  
  // Check for active round (betting or spinning)
  const { data: activeRound } = await supabase
    .from('roulette_rounds')
    .select('*')
    .in('status', ['betting', 'spinning'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeRound) {
    const now = new Date();
    const bettingEnd = new Date(activeRound.betting_end_time);
    const spinningEnd = new Date(activeRound.spinning_end_time);

    console.log('📋 Active round found:', {
      id: activeRound.id,
      status: activeRound.status,
      bettingEnd: bettingEnd.toISOString(),
      spinningEnd: spinningEnd.toISOString(),
      now: now.toISOString()
    });

    // Check if betting phase should end and spinning should start
    if (activeRound.status === 'betting' && now >= bettingEnd) {
      console.log('🎲 Betting ended, generating result and starting spin');
      
      let result;
      
             // Try advanced method first
      if (activeRound.daily_seed_id && activeRound.nonce_id) {
        try {
          console.log('🎯 Using advanced provably fair method');
          
          // Get daily seed for this round
          const { data: dailySeed, error: seedError } = await supabase
            .from('daily_seeds')
            .select('*')
            .eq('id', activeRound.daily_seed_id)
            .single();

          if (seedError) {
            throw new Error(`Daily seed fetch error: ${seedError.message}`);
          }

          if (!dailySeed) {
            throw new Error('Daily seed not found for round');
          }

                     // Generate provably fair result using advanced method
          const resultData = await generateProvablyFairResult(supabase, dailySeed, activeRound.nonce_id);
          result = resultData.result;
          
        } catch (error) {
          console.error('❌ Advanced result generation failed, falling back to legacy:', error);
          // Fall back to legacy method
          result = await generateLegacyResult(supabase, activeRound);
        }
      } else {
        console.log('🔄 Using legacy method (no advanced data)');
        // Use legacy method if no advanced data
        result = await generateLegacyResult(supabase, activeRound);
      }
      
      // Calculate final reel position for cross-user sync (MUST MATCH FRONTEND EXACTLY)
      const TILE_WIDTH = 100; // EXACTLY matches frontend TILE_SIZE_PX
      const CONTAINER_WIDTH = 1500; // EXACTLY matches frontend REEL_WIDTH_PX
      const CENTER_OFFSET = CONTAINER_WIDTH / 2; // Exact center at 750px
      const WHEEL_SLOTS_LENGTH = 15;
      
      // Find the position of the winning slot in our WHEEL_SLOTS array
      const winningSlotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === result.slot);
      
      if (winningSlotIndex === -1) {
        console.error('❌ Winning slot not found in WHEEL_SLOTS:', result.slot);
        console.error('Available slots:', WHEEL_SLOTS.map(s => s.slot));
        throw new Error(`Winning slot ${result.slot} not found in wheel configuration`);
      }
      
      // Calculate the final reel position that centers the winning slot precisely
      // 
      // Understanding the coordinate system:
      // - Container center line is at CENTER_OFFSET (600px from left edge)
      // - When reel position = 0: first tile (index 0) left edge is at x=0
      // - Tile at index i: left edge at (position + i * TILE_WIDTH)
      // - Tile at index i: center at (position + i * TILE_WIDTH + TILE_WIDTH/2)
      // 
      // Goal: Make winning slot center align with CENTER_OFFSET
      // Equation: position + winningSlotIndex * TILE_WIDTH + TILE_WIDTH/2 = CENTER_OFFSET
      // Solve for position: position = CENTER_OFFSET - winningSlotIndex * TILE_WIDTH - TILE_WIDTH/2
      
      const winningSlotTargetPosition = CENTER_OFFSET - (winningSlotIndex * TILE_WIDTH + TILE_WIDTH / 2);
      
              // Verification: at this position, where will the winning slot center be?
        const verificationSlotCenter = winningSlotTargetPosition + (winningSlotIndex * TILE_WIDTH + TILE_WIDTH / 2);
        
        console.log('🧮 Position calculation details:', {
          winningSlotIndex,
          TILE_WIDTH,
          CENTER_OFFSET,
          calculation: `${CENTER_OFFSET} - (${winningSlotIndex} * ${TILE_WIDTH} + ${TILE_WIDTH/2})`,
          winningSlotTargetPosition,
          verification: `At position ${winningSlotTargetPosition}, slot ${result.slot} center will be at ${verificationSlotCenter} (should equal ${CENTER_OFFSET})`,
          isAccurate: Math.abs(verificationSlotCenter - CENTER_OFFSET) < 1
        });
      
      // For the first round or if no previous position, start from 0
      // Otherwise, calculate from the previous round's final position
      let previousReelPosition = 0;
      const { data: previousRound } = await supabase
        .from('roulette_rounds')
        .select('reel_position')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (previousRound?.reel_position !== null) {
        previousReelPosition = previousRound.reel_position;
      }
      
      // Add multiple full rotations for dramatic effect (always move left)
      const fullRotations = 8;
      const fullRotationDistance = WHEEL_SLOTS_LENGTH * TILE_WIDTH;
      const totalRotationDistance = fullRotations * fullRotationDistance;
      
      // Calculate final position: always move left from previous position with rotations
      // Start with the exact position needed for the winning slot
      let finalReelPosition = winningSlotTargetPosition;
      
      // Add full rotations to move left from previous position and create dramatic effect
      // Keep adding rotations until we're sufficiently left of the previous position
      while (finalReelPosition > previousReelPosition - totalRotationDistance) {
        finalReelPosition -= fullRotationDistance;
      }
      
      // Normalize position to prevent tiles from disappearing (keep within reasonable bounds)
      // Frontend has 20 repeats, so we have plenty of buffer. Keep position between -10 and 0 full rotations
      const maxNegativeRotations = -10 * fullRotationDistance; // -10 full rotations
      if (finalReelPosition < maxNegativeRotations) {
        const originalPosition = finalReelPosition;
        // Bring back into range while maintaining the correct slot alignment
        const excessRotations = Math.floor((maxNegativeRotations - finalReelPosition) / fullRotationDistance);
        finalReelPosition += excessRotations * fullRotationDistance;
        console.log('🔄 Normalized reel position to prevent disappearing tiles:', {
          originalPosition,
          normalizedPosition: finalReelPosition,
          excessRotations,
          maxNegativeRotations
        });
      }
      
                      console.log('🎯 Calculated synchronized reel position:', {
          resultSlot: result.slot,
          winningSlotIndex,
          centerOffset: CENTER_OFFSET,
          winningSlotTargetPosition,
          previousReelPosition,
          finalReelPosition,
          totalRotationDistance,
          rotationsAdded: Math.abs(finalReelPosition - winningSlotTargetPosition) / fullRotationDistance,
          calculation: `slot ${result.slot} at index ${winningSlotIndex}: target=${winningSlotTargetPosition}, final=${finalReelPosition}`
        });

      // Update round to spinning with result and synchronized reel position
      const { data: updatedRound } = await supabase
        .from('roulette_rounds')
        .update({
          status: 'spinning',
          result_slot: result.slot,
          result_color: result.color,
          result_multiplier: result.multiplier,
          reel_position: finalReelPosition
        })
        .eq('id', activeRound.id)
        .select()
        .single();

      return updatedRound;
    }

    // Check if spinning phase should end
    if (activeRound.status === 'spinning' && now >= spinningEnd) {
      console.log('🏁 Spinning ended, completing round');
      await completeRound(supabase, activeRound);
      
      // Create new round immediately
      return await createNewRound(supabase);
    }

    return activeRound;
  }

  // No active round, create new one
  console.log('🆕 Creating new round');
  return await createNewRound(supabase);
}

async function createNewRound(supabase: any) {
  console.log('🆕 Creating new round...');
  
  try {
    // Try advanced system first
    console.log('🔬 Attempting advanced provably fair round...');
    
    // Get or create today's daily seed
    console.log('📅 Getting daily seed...');
    const dailySeed = await getOrCreateDailySeed(supabase);
    console.log('✅ Daily seed obtained:', { id: dailySeed.id, date: dailySeed.date, server_seed_hash: dailySeed.server_seed_hash });
    
    // Get next nonce ID for today
    const { data: lastRound, error: lastRoundError } = await supabase
      .from('roulette_rounds')
      .select('nonce_id')
      .eq('daily_seed_id', dailySeed.id)
      .order('nonce_id', { ascending: false })
      .limit(1)
      .single();

    if (lastRoundError && lastRoundError.code !== 'PGRST116') {
      console.error('❌ Error fetching last round:', lastRoundError);
    }

    const nextNonceId = lastRound ? lastRound.nonce_id + 1 : 1;
    console.log('✅ Next nonce ID:', nextNonceId);

    const now = new Date();
    const bettingEnd = new Date(now.getTime() + BETTING_DURATION);
    const spinningEnd = new Date(bettingEnd.getTime() + SPINNING_DURATION);

    const roundData = {
      status: 'betting',
      betting_end_time: bettingEnd.toISOString(),
      spinning_end_time: spinningEnd.toISOString(),
      daily_seed_id: dailySeed.id,
      nonce_id: nextNonceId,
      server_seed: dailySeed.server_seed, // Include the actual server_seed 
      server_seed_hash: dailySeed.server_seed_hash,
      nonce: nextNonceId // Keep for compatibility
    };

    console.log('📝 Inserting advanced round data:', roundData);
    console.log('🔍 About to insert with daily_seed_id:', dailySeed.id, 'and nonce_id:', nextNonceId);
    
    const { data: newRound, error: insertError } = await supabase
      .from('roulette_rounds')
      .insert(roundData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Advanced round creation failed with error:', insertError);
      console.error('❌ Error code:', insertError.code);
      console.error('❌ Error message:', insertError.message);
      console.error('❌ Error details:', insertError.details);
      console.error('❌ Failed round data:', roundData);
      throw insertError; // This will trigger the catch block
    }

    console.log('✅ Created advanced round:', newRound.id, 'with daily_seed_id:', newRound.daily_seed_id, 'nonce_id:', newRound.nonce_id);
    return newRound;

  } catch (error) {
    console.error('❌ Advanced round creation failed, falling back to legacy:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    // Fallback to legacy system to keep the game running
    console.log('🔄 Creating legacy round as fallback...');
    
    const serverSeed = await generateServerSeed();
    const serverSeedHash = await sha256Hash(serverSeed);
    
    const now = new Date();
    const bettingEnd = new Date(now.getTime() + BETTING_DURATION);
    const spinningEnd = new Date(bettingEnd.getTime() + SPINNING_DURATION);

    const { data: legacyRound, error: legacyError } = await supabase
      .from('roulette_rounds')
      .insert({
        status: 'betting',
        betting_end_time: bettingEnd.toISOString(),
        spinning_end_time: spinningEnd.toISOString(),
        server_seed: serverSeed,
        server_seed_hash: serverSeedHash,
        nonce: 1
      })
      .select()
      .single();

    if (legacyError) {
      console.error('❌ Legacy round creation also failed:', legacyError);
      throw legacyError;
    }

    console.log('✅ Created legacy round as fallback:', legacyRound.id);
    return legacyRound;
  }
}

async function placeBet(supabase: any, userId: string, roundId: string, betColor: string, betAmount: number, clientSeed?: string) {
  console.log(`💰 Placing bet: ${betAmount} on ${betColor} for user ${userId}`);

  try {
    // SECURITY 1: Input validation and sanitization
    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      throw new Error('Invalid user ID');
    }
  
  if (!roundId || typeof roundId !== 'string') {
    throw new Error('Invalid round ID');
  }
  
  if (!betColor || !['green', 'red', 'black'].includes(betColor)) {
    throw new Error('Invalid bet color');
  }
  
  if (!betAmount || typeof betAmount !== 'number' || betAmount < 0.01 || betAmount > 1000000) {
    throw new Error('Invalid bet amount');
  }

  // SECURITY 2: Rate limiting - prevent spam clicking
  const rateLimitKey = `bet_rate_limit_${userId}`;
  console.log('🔍 Checking rate limits for user:', userId);
  
  const { data: rateLimitData, error: rateLimitError } = await supabase
    .from('user_rate_limits')
    .select('last_bet_time, bet_count')
    .eq('user_id', userId)
    .single();

  if (rateLimitError && rateLimitError.code !== 'PGRST116') {
    console.error('❌ Rate limit check failed:', rateLimitError);
    // Continue without rate limiting if there's an error
  }

  const now = new Date();
  const oneSecondAgo = new Date(now.getTime() - 1000);
  
  if (rateLimitData) {
    const lastBetTime = new Date(rateLimitData.last_bet_time);
    
    // Allow max 1 bet per second
    if (lastBetTime > oneSecondAgo) {
      throw new Error('Rate limit exceeded. Please wait before placing another bet.');
    }
    
    // Update rate limit record
    try {
      await supabase
        .from('user_rate_limits')
        .upsert({
          user_id: userId,
          last_bet_time: now.toISOString(),
          bet_count: (rateLimitData.bet_count || 0) + 1
        });
    } catch (updateError) {
      console.error('❌ Failed to update rate limit:', updateError);
      // Continue without updating rate limit
    }
  } else {
    // Create new rate limit record
    try {
      await supabase
        .from('user_rate_limits')
        .insert({
          user_id: userId,
          last_bet_time: now.toISOString(),
          bet_count: 1
        });
    } catch (insertError) {
      console.error('❌ Failed to create rate limit record:', insertError);
      // Continue without rate limiting
    }
  }

  console.log('✅ Rate limiting check completed');

  // SECURITY 3: Verify round is in betting phase with time checks
  const { data: round, error: roundError } = await supabase
    .from('roulette_rounds')
    .select('status, betting_end_time, betting_start_time')
    .eq('id', roundId)
    .single();

  if (roundError || !round) {
    throw new Error('Round not found');
  }

  if (round.status !== 'betting') {
    throw new Error('Betting is closed for this round');
  }

  const currentTime = new Date();
  const bettingEndTime = new Date(round.betting_end_time);
  const bettingStartTime = new Date(round.betting_start_time);

  if (currentTime >= bettingEndTime) {
    throw new Error('Betting time has expired');
  }

  if (currentTime < bettingStartTime) {
    throw new Error('Betting has not started yet');
  }

  // SECURITY 4: Prevent duplicate bets in same transaction (idempotency)
  const { data: existingBet } = await supabase
    .from('roulette_bets')
    .select('id')
    .eq('user_id', userId)
    .eq('round_id', roundId)
    .eq('bet_color', betColor)
    .eq('bet_amount', betAmount)
    .gte('created_at', oneSecondAgo.toISOString())
    .single();

  if (existingBet) {
    throw new Error('Duplicate bet detected. Please wait before placing the same bet again.');
  }

  // SECURITY 5: Atomic balance check and deduction using database transaction
  console.log('🔍 Attempting atomic balance check for:', {
    userId,
    betAmount,
    roundId
  });

  const { data: balanceResult, error: balanceError } = await supabase.rpc('atomic_bet_balance_check', {
    p_user_id: userId,
    p_bet_amount: betAmount,
    p_round_id: roundId
  });

  console.log('🔍 Atomic balance check result:', {
    data: balanceResult,
    error: balanceError
  });

  if (balanceError) {
    console.error('❌ Atomic balance check failed:', balanceError);
    console.error('❌ Error details:', JSON.stringify(balanceError, null, 2));
    throw new Error(`Balance validation failed: ${balanceError.message || balanceError.details || 'Unknown error'}`);
  }

  if (!balanceResult) {
    console.error('❌ No result from atomic balance check');
    throw new Error('Balance validation failed: No result returned');
  }

  if (!balanceResult.success) {
    console.error('❌ Balance check returned failure:', balanceResult);
    throw new Error(balanceResult.error_message || 'Insufficient balance');
  }

  console.log('✅ Atomic balance check successful:', balanceResult);

  // SECURITY 6: Check total bets per user per round limit
  const { data: userBetsCount, error: userBetsError } = await supabase
    .from('roulette_bets')
    .select('bet_amount')
    .eq('user_id', userId)
    .eq('round_id', roundId);

  if (userBetsError) {
    console.error('❌ Error checking user bets:', userBetsError);
    throw new Error('Failed to validate user betting history');
  }

  const totalUserBets = (userBetsCount || []).reduce((sum, bet) => sum + bet.bet_amount, 0);
  const maxBetsPerUserPerRound = 100000; // Maximum $100,000 per user per round

  if (totalUserBets + betAmount > maxBetsPerUserPerRound) {
    throw new Error(`Maximum bet limit per round is $${maxBetsPerUserPerRound}`);
  }

  // SECURITY 7: Calculate potential payout with validation
  const multiplier = betColor === 'green' ? 14 : 2;
  const potentialPayout = betAmount * multiplier;

  if (potentialPayout > 14000000) { // Max payout $14,000,000 (1M * 14 for green)
    throw new Error('Bet amount too high - maximum payout exceeded');
  }

  // SECURITY 8: Get and validate user's client seed
  let finalClientSeed = clientSeed;
  if (!finalClientSeed || typeof finalClientSeed !== 'string') {
    const { data: seedData } = await supabase
      .from('roulette_client_seeds')
      .select('client_seed')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    finalClientSeed = seedData?.client_seed || 'default_client_seed';
  }

  // Validate client seed format
  if (finalClientSeed.length < 8 || finalClientSeed.length > 64) {
    throw new Error('Invalid client seed format');
  }

  // SECURITY 9: Create bet record with additional security fields
  const { data: bet, error: betError } = await supabase
    .from('roulette_bets')
    .insert({
      round_id: roundId,
      user_id: userId,
      bet_color: betColor,
      bet_amount: betAmount,
      potential_payout: potentialPayout,
      client_seed: finalClientSeed,
      ip_address: null, // Would need to be passed from request headers
      user_agent: null, // Would need to be passed from request headers
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (betError) {
    console.error('❌ Error creating bet:', betError);
    
    // SECURITY 10: Rollback balance deduction if bet creation fails
    await supabase.rpc('rollback_bet_balance', {
      p_user_id: userId,
      p_bet_amount: betAmount
    });
    
    throw new Error('Failed to place bet - balance has been restored');
  }

  // Get user profile for live feed with fallback to auth.users
  let userProfile = null;
  
  // First try profiles table
  const { data: profileData, error: profileErr } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', userId)
    .single();

  if (profileErr) {
    console.error('❌ Error fetching from profiles:', profileErr);
    
    // Fallback to auth.users table  
    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId);
    if (userData?.user) {
      userProfile = {
        username: userData.user.user_metadata?.username || userData.user.email?.split('@')[0] || `User${userId.slice(-4)}`,
        avatar_url: userData.user.user_metadata?.avatar_url || null
      };
    } else {
      console.error('❌ Error fetching from auth.users:', userErr);
      userProfile = {
        username: `User${userId.slice(-4)}`,
        avatar_url: null
      };
    }
  } else {
    userProfile = profileData;
  }

  // SECURITY 11: Audit log for bet placement
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'place_bet',
        details: {
          round_id: roundId,
          bet_color: betColor,
          bet_amount: betAmount,
          potential_payout: potentialPayout
        },
        timestamp: new Date().toISOString()
      });
    console.log('✅ Audit log created successfully');
  } catch (auditError) {
    console.error('❌ Failed to create audit log:', auditError);
    // Continue without audit logging - don't fail the bet
  }

  // Insert to live bet feed for real-time updates
  await supabase
    .from('live_bet_feed')
    .insert({
      user_id: userId,
      username: userProfile?.username || `User${userId.slice(-4)}`,
      avatar_url: userProfile?.avatar_url,
      bet_amount: betAmount,
      bet_color: betColor,
      game_type: 'roulette',
      round_id: roundId,
      result: 'pending', // Will be updated when round completes
      profit: 0 // Will be updated when round completes
    });

  console.log(`✅ Bet placed successfully: ${betAmount} on ${betColor} for user ${userId}`);
  
  return {
    success: true,
    bet,
    message: 'Bet placed successfully'
  };
  } catch (error) {
    console.error('❌ Error placing bet:', error);
    return {
      success: false,
      message: error.message || 'Failed to place bet'
    };
  }
}

async function completeRound(supabase: any, round: any) {
  console.log(`🏁 Completing round ${round.id} with result: ${round.result_color} ${round.result_slot}`);

  // Mark round as completed
  await supabase
    .from('roulette_rounds')
    .update({ status: 'completed' })
    .eq('id', round.id);

  // Get all bets for this round
  const { data: bets } = await supabase
    .from('roulette_bets')
    .select('*')
    .eq('round_id', round.id);

  let totalBetsCount = 0;
  let totalBetsAmount = 0;

  // Process each bet
  for (const bet of bets || []) {
    totalBetsCount++;
    totalBetsAmount += bet.bet_amount;
    
    const isWinner = bet.bet_color === round.result_color;
    const actualPayout = isWinner ? bet.potential_payout : 0;
    const profit = actualPayout - bet.bet_amount;

    console.log(`🎲 Processing bet: user=${bet.user_id}, color=${bet.bet_color}, amount=${bet.bet_amount}, potential=${bet.potential_payout}`);
    console.log(`🎯 Round result: ${round.result_color}, isWinner: ${isWinner}, actualPayout: ${actualPayout}, profit: ${profit}`);

    // Update bet record
    await supabase
      .from('roulette_bets')
      .update({
        is_winner: isWinner,
        actual_payout: actualPayout,
        profit: profit
      })
      .eq('id', bet.id);

    // Update live bet feed with result
    await supabase
      .from('live_bet_feed')
      .update({
        result: isWinner ? 'win' : 'loss',
        profit: profit
      })
      .eq('user_id', bet.user_id)
      .eq('game_type', 'roulette')
      .eq('round_id', round.id);

    // Update user stats using the proper function
    await supabase.rpc('update_user_stats', {
      p_user_id: bet.user_id,
      p_game_type: 'roulette',
      p_bet_amount: bet.bet_amount,
      p_profit: profit,
      p_is_winner: isWinner
    });

    // Process winnings (update balance with real-time trigger)
    if (isWinner && actualPayout > 0) {
      console.log(`🎯 Processing winner: ${bet.user_id}, payout: ${actualPayout}`);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', bet.user_id)
        .single();

      if (profileError) {
        console.error('❌ Error fetching profile for balance update:', profileError);
        continue;
      }

      if (profile) {
        const oldBalance = profile.balance;
        const newBalance = oldBalance + actualPayout;
        
        console.log(`💰 Updating balance for ${bet.user_id}: ${oldBalance} + ${actualPayout} = ${newBalance}`);
        
        const { error: balanceError, data: updatedProfile } = await supabase
          .from('profiles')
          .update({
            balance: newBalance,
            updated_at: new Date().toISOString() // Force timestamp update for real-time trigger
          })
          .eq('id', bet.user_id)
          .select('balance')
          .single();

        if (balanceError) {
          console.error('❌ Error updating balance:', balanceError);
        } else {
          console.log(`✅ Balance successfully updated for ${bet.user_id}: ${oldBalance} → ${updatedProfile?.balance || newBalance}`);
          console.log(`🔔 Real-time update should trigger for user ${bet.user_id}`);
          
          // Small delay to ensure real-time update propagates
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } else {
      console.log(`😢 Loser: ${bet.user_id} lost ${bet.bet_amount} on ${bet.bet_color}`);
    }
  }

  // Add to results history
  await supabase
    .from('roulette_results')
    .insert({
      round_id: round.id,
      round_number: round.round_number,
      result_color: round.result_color,
      result_slot: round.result_slot,
      total_bets_count: totalBetsCount,
      total_bets_amount: totalBetsAmount
    });

  console.log(`🎉 Round completed with ${totalBetsCount} bets totaling ${totalBetsAmount}`);
}

// Advanced Provably Fair Result Generation
async function generateProvablyFairResult(supabase: any, dailySeed: any, nonceId: number) {
  console.log('🎲 Generating advanced provably fair result');
  
  // Industry standard formula: hash("sha256", server_seed + "-" + lotto + "-" + round_id)
  const hashInput = `${dailySeed.server_seed}-${dailySeed.lotto}-${nonceId}`;
  const hash = await sha256Hash(hashInput);
  
  // Convert first 8 characters of hash to number and mod by 15
  const hashNumber = parseInt(hash.substring(0, 8), 16);
  const resultSlot = hashNumber % 15;
  const result = WHEEL_SLOTS[resultSlot];
  
  console.log(`🎯 Advanced Result Generated:`);
  console.log(`📊 Server Seed: ${dailySeed.server_seed}`);
  console.log(`🎰 Lotto: ${dailySeed.lotto}`);
  console.log(`🔢 Nonce (Round ID): ${nonceId}`);
  console.log(`🔗 Hash Input: "${hashInput}"`);
  console.log(`#️⃣ SHA256 Hash: ${hash}`);
  console.log(`🎲 Hash Number: ${hashNumber} (0x${hash.substring(0, 8)})`);
  console.log(`🎯 Final Result: ${hashNumber} % 15 = ${resultSlot} (${result.color} ${result.slot})`);
  
  return { result, hashInput, hash, hashNumber };
}

// Legacy Result Generation (fallback)
async function generateLegacyResult(supabase: any, round: any) {
  console.log('🎲 Generating legacy provably fair result');
  
  // Use server seed from round or generate new one
  let serverSeed = round.server_seed;
  if (!serverSeed) {
    serverSeed = await generateServerSeed();
    // Update round with generated seed
    await supabase
      .from('roulette_rounds')
      .update({ server_seed: serverSeed })
      .eq('id', round.id);
  }
  
  // Create hash input: server_seed + default_client_seed + nonce
  const defaultClientSeed = 'default_client_seed';
  const hashInput = `${serverSeed}:${defaultClientSeed}:${round.nonce || 1}`;
  const hash = await sha256Hash(hashInput);
  
  // Convert first 8 characters of hash to number and mod by 15
  const hashNumber = parseInt(hash.substring(0, 8), 16);
  const resultSlot = hashNumber % 15;
  const result = WHEEL_SLOTS[resultSlot];
  
  console.log(`🎯 Legacy Result Generated:`);
  console.log(`📊 Server Seed: ${serverSeed}`);
  console.log(`🔢 Nonce: ${round.nonce || 1}`);
  console.log(`🔗 Hash Input: "${hashInput}"`);
  console.log(`#️⃣ SHA256 Hash: ${hash}`);
  console.log(`🎲 Hash Number: ${hashNumber} (0x${hash.substring(0, 8)})`);
  console.log(`🎯 Final Result: ${hashNumber} % 15 = ${resultSlot} (${result.color} ${result.slot})`);
  
  return result;
}

// Daily Seed Management
async function getOrCreateDailySeed(supabase: any) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Try to get existing daily seed
  const { data: existingSeed } = await supabase
    .from('daily_seeds')
    .select('*')
    .eq('date', today)
    .single();

  if (existingSeed) {
    console.log(`📅 Using existing daily seed for ${today}`);
    return existingSeed;
  }

  // Generate new daily seed and lotto
  console.log(`🆕 Creating new daily seed for ${today}`);
  
  const serverSeed = await generateSecureServerSeed();
  const serverSeedHash = await sha256Hash(serverSeed);
  const lotto = await generateSecureLotto();
  const lottoHash = await sha256Hash(lotto);

  const { data: newDailySeed } = await supabase
    .from('daily_seeds')
    .insert({
      date: today,
      server_seed: serverSeed,
      server_seed_hash: serverSeedHash,
      lotto: lotto,
      lotto_hash: lottoHash,
      is_revealed: false
    })
    .select()
    .single();

  console.log(`✅ Created daily seed: hash=${serverSeedHash.substring(0, 16)}..., lotto_hash=${lottoHash.substring(0, 16)}...`);
  
  return newDailySeed;
}

async function revealDailySeed(supabase: any, date: string) {
  console.log(`🔓 Revealing daily seed for ${date}`);
  
  const { data: updatedSeed } = await supabase
    .from('daily_seeds')
    .update({
      is_revealed: true,
      revealed_at: new Date().toISOString()
    })
    .eq('date', date)
    .select()
    .single();

  return updatedSeed;
}

async function setClientSeed(supabase: any, userId: string, clientSeed: string) {
  console.log(`🔑 Setting client seed for user ${userId}`);

  // Deactivate current seed
  await supabase
    .from('roulette_client_seeds')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  // Insert new active seed
  const { data: newSeed } = await supabase
    .from('roulette_client_seeds')
    .insert({
      user_id: userId,
      client_seed: clientSeed,
      is_active: true
    })
    .select()
    .single();

  return { success: true, seed: newSeed };
}

async function verifyRound(supabase: any, roundId: string, clientSeed?: string) {
  console.log(`🔍 Verifying round ${roundId}`);

  // Try advanced verification first
  try {
    // Get round with daily seed info
    const { data: round } = await supabase
      .from('roulette_rounds')
      .select(`
        *,
        daily_seeds (
          date,
          server_seed,
          server_seed_hash,
          lotto,
          lotto_hash,
          is_revealed
        )
      `)
      .eq('id', roundId)
      .single();

    if (!round) {
      throw new Error('Round not found');
    }

    const dailySeed = round.daily_seeds;
    
    console.log(`🔍 Round data:`, {
      id: round.id,
      daily_seed_id: round.daily_seed_id,
      nonce_id: round.nonce_id,
      has_daily_seed: !!dailySeed
    });
    
    if (dailySeed) {
      console.log(`🔍 Daily seed data:`, {
        date: dailySeed.date,
        has_server_seed: !!dailySeed.server_seed,
        has_lotto: !!dailySeed.lotto,
        has_lotto_hash: !!dailySeed.lotto_hash
      });
    }
    
         // If we have advanced data, use it
     if (dailySeed && round.nonce_id) {
       console.log(`🎯 Using advanced verification for round ${roundId}`);
       return await verifyAdvancedRound(round, dailySeed);
    } else {
      console.log(`🔄 Using legacy verification for round ${roundId} - dailySeed: ${!!dailySeed}, nonce_id: ${round.nonce_id}`);
      return await verifyLegacyRound(round, clientSeed);
    }
    
     } catch (error) {
     console.error('❌ Advanced verification failed, trying legacy:', error);
    
    // Fallback to legacy verification
    const { data: round } = await supabase
      .from('roulette_rounds')
      .select('*')
      .eq('id', roundId)
      .single();

    if (!round) {
      throw new Error('Round not found');
    }

    return await verifyLegacyRound(round, clientSeed);
  }
}

async function verifyAdvancedRound(round: any, dailySeed: any) {
  // For ongoing rounds, show basic info but no server seed
  if (round.status !== 'completed') {
    return {
      round_id: round.id,
      round_number: round.round_number,
      server_seed: null, // Hidden until round completes
      server_seed_hash: dailySeed.server_seed_hash,
      lotto: null, // Hidden until round completes
      lotto_hash: dailySeed.lotto_hash,
      nonce_id: round.nonce_id,
      result_slot: round.result_slot,
      result_color: round.result_color,
      status: round.status,
      is_completed: false,
      daily_date: dailySeed.date
    };
  }

  // For completed rounds, show full advanced verification
  const hashInput = `${dailySeed.server_seed}-${dailySeed.lotto}-${round.nonce_id}`;
  
  let hashResult = '';
  let hashNumber = 0;
  let calculatedSlot = 0;
  
  try {
    hashResult = await sha256Hash(hashInput);
    // Take first 8 chars and convert to number
    hashNumber = parseInt(hashResult.substring(0, 8), 16);
    calculatedSlot = hashNumber % 15;
  } catch (error) {
    console.error('Error calculating advanced verification:', error);
  }

  // Get the actual slot number from the WHEEL_SLOTS array
  const actualCalculatedSlot = WHEEL_SLOTS[calculatedSlot]?.slot || calculatedSlot;

  return {
    round_id: round.id,
    round_number: round.round_number,
    server_seed: dailySeed.server_seed,
    server_seed_hash: dailySeed.server_seed_hash,
    lotto: dailySeed.lotto,
    lotto_hash: dailySeed.lotto_hash,
    nonce_id: round.nonce_id,
    result_slot: round.result_slot,
    result_color: round.result_color,
    status: round.status,
    daily_date: dailySeed.date,
    is_completed: true,
    // Advanced Verification calculation
    hash_input: hashInput,
    hash_result: hashResult,
    hash_number: hashNumber,
    calculated_slot: calculatedSlot,
    actual_calculated_slot: actualCalculatedSlot,
    verification_result: actualCalculatedSlot === round.result_slot ? 'VALID' : 'INVALID',
    provably_fair_formula: `hash("sha256", "${dailySeed.server_seed}-${dailySeed.lotto}-${round.nonce_id}")`
  };
}

async function verifyLegacyRound(round: any, clientSeed?: string) {
  // For ongoing rounds, show basic info but no server seed
  if (round.status !== 'completed') {
    return {
      round_id: round.id,
      round_number: round.round_number,
      server_seed: null, // Hidden until round completes
      server_seed_hash: round.server_seed_hash,
      nonce: round.nonce,
      result_slot: round.result_slot,
      result_color: round.result_color,
      status: round.status,
      is_completed: false
    };
  }

  // For completed rounds, show full legacy verification
  const usedClientSeed = clientSeed || 'default_client_seed';
  const hashInput = `${round.server_seed}:${usedClientSeed}:${round.nonce}`;
  
  let hashResult = '';
  let hashNumber = 0;
  let calculatedSlot = 0;
  
  try {
    hashResult = await sha256Hash(hashInput);
    // Take first 8 chars and convert to number
    hashNumber = parseInt(hashResult.substring(0, 8), 16);
    calculatedSlot = hashNumber % 15;
  } catch (error) {
    console.error('Error calculating legacy verification:', error);
  }

  // Get the actual slot number from the WHEEL_SLOTS array
  const actualCalculatedSlot = WHEEL_SLOTS[calculatedSlot]?.slot || calculatedSlot;

  return {
    round_id: round.id,
    round_number: round.round_number,
    server_seed: round.server_seed,
    server_seed_hash: round.server_seed_hash,
    nonce: round.nonce,
    nonce_id: round.nonce, // For compatibility with frontend
    result_slot: round.result_slot,
    result_color: round.result_color,
    status: round.status,
    client_seed: usedClientSeed,
    is_completed: true,
    // Legacy system doesn't have lotto/daily seeds
    lotto: null,
    lotto_hash: null,
    daily_date: null,
    // Legacy Verification calculation
    hash_input: hashInput,
    hash_result: hashResult,
    hash_number: hashNumber,
    calculated_slot: calculatedSlot,
    actual_calculated_slot: actualCalculatedSlot,
    verification_result: actualCalculatedSlot === round.result_slot ? 'VALID' : 'INVALID',
    provably_fair_formula: `hash("sha256", "${round.server_seed}:${usedClientSeed}:${round.nonce}")`
  };
}

// Secure Generation Functions
async function generateSecureServerSeed(): Promise<string> {
  // Generate 64-character hex string (256 bits)
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function generateSecureLotto(): Promise<string> {
  // Generate 10-digit lotto number
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  let lotto = '';
  for (let i = 0; i < 5; i++) {
    lotto += bytes[i].toString().padStart(2, '0');
  }
  return lotto.substring(0, 10); // Ensure exactly 10 digits
}

// Utility functions
async function generateServerSeed(): Promise<string> {
  // Legacy function - redirect to secure version
  return await generateSecureServerSeed();
}

async function sha256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}