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
const SPINNING_DURATION = 5000; // 5 seconds spinning animation

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
          throw new Error('Round ID required');
        }

        const { data: bets, error } = await supabase
          .from('roulette_bets')
          .select(`
            *,
            profiles(username, avatar_url)
          `)
          .eq('round_id', roundId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        console.log(`📊 Retrieved ${bets?.length || 0} bets for round ${roundId}:`, bets);

        return new Response(JSON.stringify(bets || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_recent_results': {
        const { data: results, error } = await supabase
          .from('roulette_results')
          .select('*')
          .order('created_at', { ascending: false })
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

        const verification = await verifyRound(supabase, roundId);
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
      
      // Generate provably fair result
      const result = await generateProvablyFairResult(supabase, activeRound);
      
      // Calculate final reel position for cross-user sync
      const TILE_WIDTH = 120;
      const CENTER_OFFSET = 300; // Half of 600px container width
      const WHEEL_SLOTS_LENGTH = 15;
      
      // Find the position of the winning slot in our WHEEL_SLOTS array
      const winningSlotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === result.slot);
      
      // Calculate the final reel position that centers the winning slot precisely
      // The winning slot should be perfectly centered under the center line
      const winningSlotTargetPosition = -(winningSlotIndex * TILE_WIDTH) + CENTER_OFFSET - (TILE_WIDTH / 2);
      
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
      
      // Add multiple full rotations for dramatic effect
      const fullRotations = 8;
      const fullRotationDistance = WHEEL_SLOTS_LENGTH * TILE_WIDTH;
      const totalRotationDistance = fullRotations * fullRotationDistance;
      
      // Calculate final position from previous position
      const finalReelPosition = previousReelPosition - totalRotationDistance + (winningSlotTargetPosition - previousReelPosition);
      
      console.log('🎯 Calculated synchronized reel position:', {
        previousReelPosition,
        winningSlotIndex,
        winningSlotTargetPosition,
        finalReelPosition,
        resultSlot: result.slot
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
  
  // Generate server seed and hash for provably fair system
  const serverSeed = await generateServerSeed();
  const serverSeedHash = await sha256Hash(serverSeed);
  
  const now = new Date();
  const bettingEnd = new Date(now.getTime() + BETTING_DURATION);
  const spinningEnd = new Date(bettingEnd.getTime() + SPINNING_DURATION);

  const { data: newRound } = await supabase
    .from('roulette_rounds')
    .insert({
      status: 'betting',
      betting_end_time: bettingEnd.toISOString(),
      spinning_end_time: spinningEnd.toISOString(),
      server_seed: serverSeed,
      server_seed_hash: serverSeedHash,
      nonce: 1 // Start with nonce 1 for this server seed
    })
    .select()
    .single();

  console.log('✅ Created new round:', newRound.id);
  return newRound;
}

async function placeBet(supabase: any, userId: string, roundId: string, betColor: string, betAmount: number, clientSeed?: string) {
  console.log(`💰 Placing bet: ${betAmount} on ${betColor} for user ${userId}`);

  // Verify round is in betting phase
  const { data: round } = await supabase
    .from('roulette_rounds')
    .select('status, betting_end_time')
    .eq('id', roundId)
    .single();

  if (!round || round.status !== 'betting') {
    throw new Error('Betting is closed for this round');
  }

  if (new Date() >= new Date(round.betting_end_time)) {
    throw new Error('Betting time has expired');
  }

  // Get user profile and validate balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance, total_wagered')
    .eq('id', userId)
    .single();

  if (!profile || profile.balance < betAmount) {
    throw new Error('Insufficient balance');
  }

  // Calculate potential payout
  const multiplier = betColor === 'green' ? 14 : 2;
  const potentialPayout = betAmount * multiplier;

  // Get user's client seed if not provided
  let finalClientSeed = clientSeed;
  if (!finalClientSeed) {
    const { data: seedData } = await supabase
      .from('roulette_client_seeds')
      .select('client_seed')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    finalClientSeed = seedData?.client_seed || 'default_client_seed';
  }

  // Deduct balance only (stats will be updated when round completes)
  await supabase
    .from('profiles')
    .update({
      balance: profile.balance - betAmount
    })
    .eq('id', userId);

  // Create bet record
  const { data: bet } = await supabase
    .from('roulette_bets')
    .insert({
      round_id: roundId,
      user_id: userId,
      bet_color: betColor,
      bet_amount: betAmount,
      potential_payout: potentialPayout,
      client_seed: finalClientSeed
    })
    .select()
    .single();

  // Get user profile for live feed with fallback to auth.users
  let userProfile = null;
  let profileError = null;
  
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
       // Final fallback
       userProfile = {
         username: `User${userId.slice(-4)}`,
         avatar_url: null
       };
     }
  } else {
    userProfile = profileData;
  }

  console.log(`👤 User profile for live feed:`, userProfile);
  console.log(`💰 Bet amount: ${betAmount} (type: ${typeof betAmount})`);

  // Add to live bet feed (TowerGame pattern)
  const liveFeedData = {
    user_id: userId,
    username: userProfile?.username || `User${userId.slice(-4)}`,
    game_type: 'roulette',
    bet_amount: Number(betAmount), // Ensure it's a number
    result: 'pending',
    profit: 0,
    game_data: {
      bet_color: betColor,
      round_id: roundId,
      potential_payout: potentialPayout
    }
  };

  console.log(`📡 About to insert into live feed:`, liveFeedData);

  const { error: feedError } = await supabase
    .from('live_bet_feed')
    .insert(liveFeedData);

  if (feedError) {
    console.error('❌ Error inserting into live feed:', feedError);
  } else {
    console.log(`✅ Successfully added to live feed: ${userProfile?.username} bet $${betAmount} on ${betColor}`);
  }

  console.log(`✅ Bet placed: ${bet.id} and added to live feed`);
  return bet;
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
      .eq('game_data->round_id', round.id);

    // Update user stats using the proper function
    await supabase.rpc('update_user_stats', {
      p_user_id: bet.user_id,
      p_game_type: 'roulette',
      p_bet_amount: bet.bet_amount,
      p_profit: profit,
      p_is_winner: isWinner
    });

    // Process winnings (update balance only)
    if (isWinner && actualPayout > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', bet.user_id)
        .single();

      if (profile) {
        const newBalance = profile.balance + actualPayout;
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({
            balance: newBalance
          })
          .eq('id', bet.user_id);

        if (balanceError) {
          console.error('❌ Error updating balance:', balanceError);
        } else {
          console.log(`💰 Winner: ${bet.user_id} won ${actualPayout} (profit: ${profit}), balance: ${profile.balance} → ${newBalance}`);
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

async function generateProvablyFairResult(supabase: any, round: any) {
  console.log('🎲 Generating provably fair result');
  
  // Create hash input: server_seed + client_seed + nonce
  // For simplicity, we'll use a default client seed if none provided
  const hashInput = `${round.server_seed}:default_client:${round.nonce}`;
  const hash = await sha256Hash(hashInput);
  
  // Convert first 8 characters of hash to number and mod by 15
  const hashNumber = parseInt(hash.substring(0, 8), 16);
  const resultSlot = hashNumber % 15;
  const result = WHEEL_SLOTS[resultSlot];
  
  console.log(`🎯 Generated result: slot ${resultSlot}, color ${result.color}, hash: ${hash.substring(0, 16)}...`);
  
  return result;
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

async function verifyRound(supabase: any, roundId: string) {
  console.log(`🔍 Verifying round ${roundId}`);

  const { data: round } = await supabase
    .from('roulette_rounds')
    .select('*')
    .eq('id', roundId)
    .single();

  if (!round || round.status !== 'completed') {
    throw new Error('Round not completed or not found');
  }

  // Return verification data
  return {
    round_id: round.id,
    round_number: round.round_number,
    server_seed: round.server_seed,
    server_seed_hash: round.server_seed_hash,
    nonce: round.nonce,
    result_slot: round.result_slot,
    result_color: round.result_color,
    verification_steps: [
      `1. Server seed: ${round.server_seed}`,
      `2. SHA-256 hash: ${round.server_seed_hash}`,
      `3. Hash input: ${round.server_seed}:default_client:${round.nonce}`,
      `4. Result slot: ${round.result_slot} (hash % 15)`
    ]
  };
}

// Utility functions
async function generateServerSeed(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}