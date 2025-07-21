import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Roulette wheel configuration: 15 slots total
// 1 green (14x), 7 red (2x), 7 black (2x)
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { action, userId, betColor, betAmount, roundId } = await req.json();

    console.log(`🎰 Roulette Engine: ${action} action received`);

    switch (action) {
      case 'start_round': {
        // Create a new betting round
        const bettingEndTime = new Date(Date.now() + 10000); // 10 seconds betting
        const spinEndTime = new Date(Date.now() + 17000); // 7 seconds spinning after betting ends

        const { data: newRound, error } = await supabase
          .from('roulette_rounds')
          .insert({
            status: 'betting',
            betting_end_time: bettingEndTime.toISOString(),
            spin_end_time: spinEndTime.toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        console.log(`🎰 New round started: ${newRound.id}`);
        
        // Schedule round completion
        setTimeout(() => processRoundCompletion(newRound.id), 17000);

        return new Response(JSON.stringify(newRound), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'place_bet': {
        if (!userId || !betColor || !betAmount || !roundId) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Check if round is still accepting bets
        const { data: round } = await supabase
          .from('roulette_rounds')
          .select('*')
          .eq('id', roundId)
          .single();

        if (!round || round.status !== 'betting' || new Date() > new Date(round.betting_end_time)) {
          return new Response(JSON.stringify({ error: 'Betting is closed for this round' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get multiplier for bet color
        const multiplier = betColor === 'green' ? 14 : 2;
        const potentialPayout = betAmount * multiplier;

        // Check user balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', userId)
          .single();

        if (!profile || profile.balance < betAmount) {
          return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Deduct bet amount from balance
        await supabase
          .from('profiles')
          .update({ balance: profile.balance - betAmount })
          .eq('id', userId);

        // Place the bet
        const { data: bet, error } = await supabase
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

        if (error) throw error;

        console.log(`💰 Bet placed: ${betAmount} on ${betColor} by user ${userId}`);

        return new Response(JSON.stringify(bet), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'complete_round': {
        const roundId = await req.json().then(body => body.roundId);
        return await processRoundCompletion(roundId);
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

  async function processRoundCompletion(roundId: string) {
    console.log(`🎯 Processing round completion: ${roundId}`);

    try {
      // Generate random result
      const resultSlot = Math.floor(Math.random() * 15);
      const result = WHEEL_CONFIG[resultSlot];

      // Update round with result
      await supabase
        .from('roulette_rounds')
        .update({
          status: 'completed',
          result_slot: resultSlot,
          result_color: result.color,
          result_multiplier: result.multiplier
        })
        .eq('id', roundId);

      // Add to results history
      const { data: round } = await supabase
        .from('roulette_rounds')
        .select('round_number')
        .eq('id', roundId)
        .single();

      await supabase
        .from('roulette_results')
        .insert({
          round_number: round.round_number,
          result_color: result.color,
          result_slot: resultSlot
        });

      // Get all bets for this round
      const { data: bets } = await supabase
        .from('roulette_bets')
        .select('*')
        .eq('round_id', roundId);

      // Process payouts
      for (const bet of bets || []) {
        const isWinner = bet.bet_color === result.color;
        const payout = isWinner ? bet.potential_payout : 0;

        // Update bet with result
        await supabase
          .from('roulette_bets')
          .update({
            is_winner: isWinner,
            actual_payout: payout
          })
          .eq('id', bet.id);

        // Update user balance with winnings
        if (isWinner && payout > 0) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', bet.user_id)
            .single();

          await supabase
            .from('profiles')
            .update({ balance: profile.balance + payout })
            .eq('id', bet.user_id);

          console.log(`🎉 Payout: ${payout} to user ${bet.user_id}`);
        }

        // Add to game history
        await supabase
          .from('game_history')
          .insert({
            user_id: bet.user_id,
            game_type: 'roulette',
            bet_amount: bet.bet_amount,
            profit: payout - bet.bet_amount,
            result: isWinner ? 'win' : 'loss',
            game_data: {
              round_id: roundId,
              bet_color: bet.bet_color,
              result_color: result.color,
              result_slot: resultSlot,
              multiplier: result.multiplier
            }
          });
      }

      console.log(`✅ Round ${roundId} completed. Result: ${result.color} (slot ${resultSlot})`);

      return new Response(JSON.stringify({ 
        success: true, 
        result: result,
        roundId: roundId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('❌ Round completion error:', error);
      throw error;
    }
  }
});