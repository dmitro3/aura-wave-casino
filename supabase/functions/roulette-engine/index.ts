import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Roulette wheel configuration: 15 slots total
const WHEEL_CONFIG = [
  { slot: 0, color: 'green', multiplier: 14 },
  { slot: 1, color: 'red', multiplier: 2 },
  { slot: 2, color: 'black', multiplier: 2 },
  { slot: 3, color: 'red', multiplier: 2 },
  { slot: 4, color: 'black', multiplier: 2 },
  { slot: 5, color: 'red', multiplier: 2 },
  { slot: 6, color: 'black', multiplier: 2 },
  { slot: 7, color: 'red', multiplier: 2 },
  { slot: 8, color: 'black', multiplier: 2 },
  { slot: 9, color: 'red', multiplier: 2 },
  { slot: 10, color: 'black', multiplier: 2 },
  { slot: 11, color: 'red', multiplier: 2 },
  { slot: 12, color: 'black', multiplier: 2 },
  { slot: 13, color: 'red', multiplier: 2 },
  { slot: 14, color: 'black', multiplier: 2 }
];

const BETTING_DURATION = 15000; // 15 seconds
const SPINNING_DURATION = 8000; // 8 seconds for animation
const RESULT_DISPLAY_DURATION = 5000; // 5 seconds to show result

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { action, userId, betColor, betAmount, roundId } = await req.json();
    console.log(`🎰 Roulette Engine: ${action}`);

    switch (action) {
      case 'get_current_round': {
        const round = await getCurrentOrCreateRound(supabase);
        return new Response(JSON.stringify(round), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'place_bet': {
        if (!userId || !betColor || !betAmount || !roundId) {
          throw new Error('Missing required bet parameters');
        }

        const bet = await placeBet(supabase, userId, roundId, betColor, betAmount);
        return new Response(JSON.stringify(bet), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_round_bets': {
        if (!roundId) {
          throw new Error('Round ID required');
        }

        const { data: bets } = await supabase
          .from('roulette_bets')
          .select(`
            *,
            profiles!inner(username)
          `)
          .eq('round_id', roundId)
          .order('created_at', { ascending: false });

        return new Response(JSON.stringify(bets || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_recent_results': {
        const { data: results } = await supabase
          .from('roulette_results')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(15);

        return new Response(JSON.stringify(results || []), {
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

async function getCurrentOrCreateRound(supabase: any) {
  console.log('🔍 Getting or creating current round');
  
  // Check for active round
  const { data: activeRound } = await supabase
    .from('roulette_rounds')
    .select('*')
    .in('status', ['betting', 'spinning', 'revealing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeRound) {
    console.log('📋 Found active round:', activeRound.id, 'status:', activeRound.status);
    
    // Check if round needs status update
    const now = new Date();
    const bettingEnd = new Date(activeRound.betting_end_time);
    const spinningEnd = new Date(activeRound.spinning_end_time);
    const revealingEnd = new Date(activeRound.revealing_end_time);

    if (activeRound.status === 'betting' && now >= bettingEnd) {
      // Generate result and move to spinning phase
      console.log('🎲 Betting ended, generating result and starting spin');
      const result = generateProvablyFairResult(activeRound.id, activeRound.round_number);
      
      await supabase
        .from('roulette_rounds')
        .update({
          status: 'spinning',
          result_slot: result.slot,
          result_color: result.color,
          result_multiplier: result.multiplier,
          result_hash: result.hash
        })
        .eq('id', activeRound.id);

      activeRound.status = 'spinning';
      activeRound.result_slot = result.slot;
      activeRound.result_color = result.color;
      activeRound.result_multiplier = result.multiplier;
      activeRound.result_hash = result.hash;
    }
    
    if (activeRound.status === 'spinning' && now >= spinningEnd) {
      // Move to revealing phase
      console.log('🎯 Spinning ended, revealing result');
      await supabase
        .from('roulette_rounds')
        .update({ status: 'revealing' })
        .eq('id', activeRound.id);

      activeRound.status = 'revealing';
    }
    
    if (activeRound.status === 'revealing' && now >= revealingEnd) {
      // Complete round and process payouts
      console.log('🏁 Round completed, processing payouts');
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
  // Get next round number
  const { data: lastRound } = await supabase
    .from('roulette_rounds')
    .select('round_number')
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const roundNumber = (lastRound?.round_number || 0) + 1;
  const now = new Date();
  const bettingEnd = new Date(now.getTime() + BETTING_DURATION);
  const spinningEnd = new Date(bettingEnd.getTime() + SPINNING_DURATION);
  const revealingEnd = new Date(spinningEnd.getTime() + RESULT_DISPLAY_DURATION);

  const { data: newRound } = await supabase
    .from('roulette_rounds')
    .insert({
      round_number: roundNumber,
      status: 'betting',
      betting_end_time: bettingEnd.toISOString(),
      spinning_end_time: spinningEnd.toISOString(),
      revealing_end_time: revealingEnd.toISOString()
    })
    .select()
    .single();

  console.log('✅ Created new round:', newRound.id, 'number:', roundNumber);
  return newRound;
}

function generateProvablyFairResult(roundId: string, roundNumber: number) {
  // Generate cryptographically secure random result
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);
  const resultSlot = randomBytes[0] % 15; // 0-14
  const result = WHEEL_CONFIG[resultSlot];

  // Create provably fair hash
  const seed = `${roundId}-${roundNumber}-${Date.now()}`;
  const hash = btoa(seed); // Simple hash for demo (use proper crypto in production)

  console.log(`🎲 Generated result: slot ${resultSlot}, color ${result.color}, hash: ${hash.slice(0, 8)}...`);

  return {
    slot: resultSlot,
    color: result.color,
    multiplier: result.multiplier,
    hash: hash
  };
}

async function placeBet(supabase: any, userId: string, roundId: string, betColor: string, betAmount: number) {
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

  // Deduct balance and update total wagered
  const { error: balanceError } = await supabase
    .from('profiles')
    .update({
      balance: profile.balance - betAmount,
      total_wagered: (profile.total_wagered || 0) + betAmount
    })
    .eq('id', userId);

  if (balanceError) throw balanceError;

  // Create bet record
  const { data: bet } = await supabase
    .from('roulette_bets')
    .insert({
      round_id: roundId,
      user_id: userId,
      bet_color: betColor,
      bet_amount: betAmount,
      potential_payout: potentialPayout
    })
    .select()
    .single();

  console.log(`✅ Bet placed: ${bet.id}`);
  return bet;
}

async function completeRound(supabase: any, round: any) {
  console.log(`🏁 Completing round ${round.id} with result: ${round.result_color} ${round.result_slot}`);

  // Mark round as completed
  await supabase
    .from('roulette_rounds')
    .update({ status: 'completed' })
    .eq('id', round.id);

  // Add to results history
  await supabase
    .from('roulette_results')
    .insert({
      round_number: round.round_number,
      result_color: round.result_color,
      result_slot: round.result_slot
    });

  // Get all bets for this round
  const { data: bets } = await supabase
    .from('roulette_bets')
    .select('*')
    .eq('round_id', round.id);

  let totalPayouts = 0;

  // Process each bet
  for (const bet of bets || []) {
    const isWinner = bet.bet_color === round.result_color;
    const actualPayout = isWinner ? bet.potential_payout : 0;

    // Update bet record
    await supabase
      .from('roulette_bets')
      .update({
        is_winner: isWinner,
        actual_payout: actualPayout
      })
      .eq('id', bet.id);

    // Process winnings
    if (isWinner && actualPayout > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance, total_profit')
        .eq('id', bet.user_id)
        .single();

      if (profile) {
        const profit = actualPayout - bet.bet_amount;
        await supabase
          .from('profiles')
          .update({
            balance: profile.balance + actualPayout,
            total_profit: (profile.total_profit || 0) + profit
          })
          .eq('id', bet.user_id);

        totalPayouts += actualPayout;
        console.log(`💰 Winner: ${bet.user_id} won ${actualPayout} (profit: ${profit})`);
      }
    }
  }

  console.log(`🎉 Round completed. Total payouts: ${totalPayouts}`);
}