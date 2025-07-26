import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple roulette wheel: 15 slots (0=green, 1-14=red/black alternating)
const WHEEL_SLOTS = [
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action } = await req.json();
    console.log(`🎰 Roulette Action: ${action}`);

    switch (action) {
      case 'get_current_round': {
        // Step 1: Check if there's an active round
        const { data: activeRound } = await supabase
          .from('roulette_rounds')
          .select('*')
          .eq('status', 'betting')
          .single();

        if (activeRound) {
          console.log('✅ Found active round:', activeRound.id);
          return new Response(JSON.stringify(activeRound), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Step 2: No active round, create a new one
        console.log('🆕 Creating new round...');
        const now = new Date();
        const bettingEnd = new Date(now.getTime() + 15000); // 15 seconds
        const spinningEnd = new Date(bettingEnd.getTime() + 6000); // +6 seconds

        const { data: newRound, error } = await supabase
          .from('roulette_rounds')
          .insert({
            status: 'betting',
            betting_end_time: bettingEnd.toISOString(),
            spinning_end_time: spinningEnd.toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating round:', error);
          throw error;
        }

        console.log('✅ Created new round:', newRound.id);
        return new Response(JSON.stringify(newRound), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'place_bet': {
        const { userId, roundId, betColor, betAmount } = await req.json();
        
        // Simple bet placement
        const { data: bet, error } = await supabase
          .from('roulette_bets')
          .insert({
            round_id: roundId,
            user_id: userId,
            bet_color: betColor,
            bet_amount: betAmount,
            potential_payout: betAmount * (betColor === 'green' ? 14 : 2)
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error placing bet:', error);
          throw error;
        }

        console.log('✅ Bet placed:', bet.id);
        return new Response(JSON.stringify(bet), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'spin_round': {
        const { roundId } = await req.json();
        
        // Generate random result
        const randomBytes = new Uint32Array(1);
        crypto.getRandomValues(randomBytes);
        const winningSlot = randomBytes[0] % 15;
        const result = WHEEL_SLOTS[winningSlot];

        console.log(`🎯 Spinning result: slot ${winningSlot}, color ${result.color}`);

        // Update round with result
        const { data: updatedRound, error } = await supabase
          .from('roulette_rounds')
          .update({
            status: 'completed',
            result_slot: winningSlot,
            result_color: result.color,
            result_multiplier: result.multiplier
          })
          .eq('id', roundId)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating round:', error);
          throw error;
        }

        console.log('✅ Round completed:', updatedRound.id);
        return new Response(JSON.stringify(updatedRound), {
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
    console.error('❌ Function Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});