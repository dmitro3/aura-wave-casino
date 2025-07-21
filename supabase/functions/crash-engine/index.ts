import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrashRound {
  id: string;
  round_number: number;
  status: string;
  multiplier: number;
  crash_point?: number;
  start_time: string;
  countdown_end_time?: string;
  crash_time?: string;
}

interface CrashBet {
  id: string;
  user_id: string;
  round_id: string;
  bet_amount: number;
  auto_cashout_at?: number;
  status: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🎰 Crash Engine Started');

    // Get current round
    const { data: currentRounds, error: roundError } = await supabase
      .from('crash_rounds')
      .select('*')
      .in('status', ['countdown', 'active'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (roundError) {
      console.error('❌ Error fetching current round:', roundError);
      throw roundError;
    }

    let currentRound: CrashRound | null = currentRounds?.[0] || null;

    // If no active round, create a new one
    if (!currentRound) {
      console.log('🆕 Creating new crash round');
      
      const crashPoint = generateCrashPoint();
      const now = new Date();
      const countdownEnd = new Date(now.getTime() + 10000); // 10 second countdown
      
      const { data: newRound, error: createError } = await supabase
        .from('crash_rounds')
        .insert({
          status: 'countdown',
          multiplier: 1.00,
          crash_point: crashPoint,
          countdown_end_time: countdownEnd.toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating round:', createError);
        throw createError;
      }

      currentRound = newRound;
      console.log(`🎯 New round created: #${currentRound.round_number}, crash at ${crashPoint}x`);
    }

    const now = new Date();
    const roundStatus = currentRound.status;

    if (roundStatus === 'countdown') {
      const countdownEnd = new Date(currentRound.countdown_end_time!);
      
      if (now >= countdownEnd) {
        // Start the active phase
        console.log(`🚀 Starting round #${currentRound.round_number}`);
        
        const { error: updateError } = await supabase
          .from('crash_rounds')
          .update({ 
            status: 'active',
            start_time: now.toISOString()
          })
          .eq('id', currentRound.id);

        if (updateError) {
          console.error('❌ Error starting round:', updateError);
          throw updateError;
        }

        currentRound.status = 'active';
        currentRound.start_time = now.toISOString();
      }
    }

    if (roundStatus === 'active' || currentRound.status === 'active') {
      const startTime = new Date(currentRound.start_time);
      const elapsed = (now.getTime() - startTime.getTime()) / 1000;
      
      // Calculate current multiplier (exponential growth)
      const currentMultiplier = Math.max(1.00, 1.00 * Math.exp(elapsed * 0.1));
      
      // Check if we should crash
      if (currentMultiplier >= currentRound.crash_point!) {
        console.log(`💥 Round #${currentRound.round_number} crashed at ${currentRound.crash_point}x`);
        
        // Process all active bets as losses
        await processRoundEnd(supabase, currentRound.id, currentRound.crash_point!);
        
        // Update round to crashed
        const { error: crashError } = await supabase
          .from('crash_rounds')
          .update({
            status: 'crashed',
            multiplier: currentRound.crash_point,
            crash_time: now.toISOString()
          })
          .eq('id', currentRound.id);

        if (crashError) {
          console.error('❌ Error updating crashed round:', crashError);
        }

        // Schedule next round creation
        setTimeout(async () => {
          console.log('⏰ Creating next round in 5 seconds...');
          await fetch(req.url, { method: 'POST' });
        }, 5000);

      } else {
        // Update current multiplier
        const { error: updateError } = await supabase
          .from('crash_rounds')
          .update({ multiplier: Math.round(currentMultiplier * 100) / 100 })
          .eq('id', currentRound.id);

        if (updateError) {
          console.error('❌ Error updating multiplier:', updateError);
        }

        // Check for auto-cashouts
        await processAutoCashouts(supabase, currentRound.id, currentMultiplier);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        round: currentRound,
        timestamp: now.toISOString()
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );

  } catch (error) {
    console.error('💀 Crash engine error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      }
    );
  }
});

function generateCrashPoint(): number {
  // Generate crash point using house edge algorithm
  // Higher chance of lower multipliers, rare chance of high multipliers
  const random = Math.random();
  
  if (random < 0.5) {
    // 50% chance: 1.00x - 2.00x
    return Math.round((1.00 + Math.random() * 1.00) * 100) / 100;
  } else if (random < 0.8) {
    // 30% chance: 2.00x - 5.00x  
    return Math.round((2.00 + Math.random() * 3.00) * 100) / 100;
  } else if (random < 0.95) {
    // 15% chance: 5.00x - 20.00x
    return Math.round((5.00 + Math.random() * 15.00) * 100) / 100;
  } else {
    // 5% chance: 20.00x - 100.00x
    return Math.round((20.00 + Math.random() * 80.00) * 100) / 100;
  }
}

async function processAutoCashouts(supabase: any, roundId: string, currentMultiplier: number) {
  try {
    // Get all active bets with auto-cashout at or below current multiplier
    const { data: autoCashoutBets, error } = await supabase
      .from('crash_bets')
      .select('*')
      .eq('round_id', roundId)
      .eq('status', 'active')
      .not('auto_cashout_at', 'is', null)
      .lte('auto_cashout_at', currentMultiplier);

    if (error) {
      console.error('❌ Error fetching auto-cashout bets:', error);
      return;
    }

    for (const bet of autoCashoutBets || []) {
      const profit = Math.round((bet.bet_amount * bet.auto_cashout_at - bet.bet_amount) * 100) / 100;
      
      // Update bet as cashed out
      const { error: updateError } = await supabase
        .from('crash_bets')
        .update({
          status: 'cashed_out',
          cashed_out_at: bet.auto_cashout_at,
          profit: profit,
          cashout_time: new Date().toISOString()
        })
        .eq('id', bet.id);

      if (updateError) {
        console.error('❌ Error updating auto-cashout:', updateError);
        continue;
      }

      // Update user balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({
          balance: supabase.raw(`balance + ${bet.bet_amount + profit}`)
        })
        .eq('id', bet.user_id);

      if (balanceError) {
        console.error('❌ Error updating balance:', balanceError);
      }

      // Add to game history
      const { error: historyError } = await supabase
        .from('game_history')
        .insert({
          user_id: bet.user_id,
          game_type: 'crash',
          bet_amount: bet.bet_amount,
          result: 'win',
          profit: profit,
          game_data: {
            multiplier: bet.auto_cashout_at,
            round_number: roundId,
            auto_cashout: true
          }
        });

      if (historyError) {
        console.error('❌ Error adding to history:', historyError);
      }

      console.log(`💰 Auto-cashout: ${bet.bet_amount} at ${bet.auto_cashout_at}x = +${profit}`);
    }
  } catch (error) {
    console.error('❌ Error processing auto-cashouts:', error);
  }
}

async function processRoundEnd(supabase: any, roundId: string, crashPoint: number) {
  try {
    // Get all remaining active bets (these are losses)
    const { data: activeBets, error } = await supabase
      .from('crash_bets')
      .select('*')
      .eq('round_id', roundId)
      .eq('status', 'active');

    if (error) {
      console.error('❌ Error fetching active bets:', error);
      return;
    }

    for (const bet of activeBets || []) {
      // Update bet as lost
      const { error: updateError } = await supabase
        .from('crash_bets')
        .update({
          status: 'lost',
          profit: -bet.bet_amount
        })
        .eq('id', bet.id);

      if (updateError) {
        console.error('❌ Error updating lost bet:', updateError);
        continue;
      }

      // Add to game history
      const { error: historyError } = await supabase
        .from('game_history')
        .insert({
          user_id: bet.user_id,
          game_type: 'crash',
          bet_amount: bet.bet_amount,
          result: 'loss',
          profit: -bet.bet_amount,
          game_data: {
            multiplier: crashPoint,
            round_number: roundId,
            crashed: true
          }
        });

      if (historyError) {
        console.error('❌ Error adding to history:', historyError);
      }

      console.log(`📉 Loss: ${bet.bet_amount} (crashed at ${crashPoint}x)`);
    }
  } catch (error) {
    console.error('❌ Error processing round end:', error);
  }
}