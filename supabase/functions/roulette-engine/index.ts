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

// Animation Configuration
const TILE_WIDTH = 120; // Width of each tile in pixels
const CONTAINER_WIDTH = 1200; // Container width for center calculation
const CENTER_OFFSET = CONTAINER_WIDTH / 2; // Center position
const FULL_ROTATION = WHEEL_SLOTS.length * TILE_WIDTH; // One complete wheel rotation
const TOTAL_ROTATIONS = 12; // Number of full rotations for dramatic effect
const TILE_REPETITIONS = 150; // Number of tile repetitions for infinite scroll

// Animation Phases
enum AnimationPhase {
  IDLE = 'idle',
  ACCELERATION = 'acceleration',
  FULL_SPEED = 'full_speed',
  DECELERATION = 'deceleration',
  STOPPED = 'stopped'
}

// Animation Timing (in milliseconds)
const ANIMATION_TIMING = {
  ACCELERATION_DURATION: 800, // 0.8s acceleration
  FULL_SPEED_DURATION: 2400,  // 2.4s full speed
  DECELERATION_DURATION: 800, // 0.8s deceleration
  TOTAL_DURATION: 4000        // 4s total
};

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

            return new Response(JSON.stringify(fallbackBets || []), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          return new Response(JSON.stringify(bets || []), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('❌ Error in get_round_bets:', error);
          return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      case 'get_animation_data': {
        if (!roundId) {
          return new Response(JSON.stringify({ error: 'Round ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const animationData = await getAnimationData(supabase, roundId);
        return new Response(JSON.stringify(animationData), {
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

// Get current round with animation data
async function getCurrentRound(supabase: any) {
  console.log('🎰 Getting current round...');
  
  try {
    // Get the most recent round
    const { data: rounds, error: roundsError } = await supabase
      .from('roulette_rounds')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (roundsError) {
      console.error('❌ Error fetching rounds:', roundsError);
      throw new Error('Failed to fetch rounds');
    }

    let currentRound = rounds?.[0];

    // If no rounds exist or the latest round is completed, create a new one
    if (!currentRound || currentRound.status === 'completed') {
      console.log('🆕 Creating new round...');
      currentRound = await createNewRound(supabase);
    }

    // Calculate time remaining
    const now = Date.now();
    const roundStartTime = new Date(currentRound.created_at).getTime();
    const timeElapsed = now - roundStartTime;
    const timeRemaining = Math.max(0, BETTING_DURATION - timeElapsed);

    // Determine round phase
    let phase = 'betting';
    if (timeRemaining <= 0) {
      if (currentRound.status === 'active') {
        // Round just ended, complete it
        console.log('🎯 Round ended, completing...');
        currentRound = await completeRound(supabase, currentRound);
        phase = 'spinning';
      } else if (currentRound.status === 'spinning') {
        // Check if spinning phase is complete
        const spinningTimeElapsed = timeElapsed - BETTING_DURATION;
        if (spinningTimeElapsed >= SPINNING_DURATION) {
          phase = 'completed';
        } else {
          phase = 'spinning';
        }
      } else {
        phase = 'completed';
      }
    }

    // Generate animation data if spinning
    let animationData = null;
    if (phase === 'spinning' && currentRound.winning_slot !== null) {
      animationData = generateAnimationData(currentRound.winning_slot);
    }

    const roundData = {
      id: currentRound.id,
      status: currentRound.status,
      phase: phase,
      timeRemaining: timeRemaining,
      totalBets: currentRound.total_bets || 0,
      totalAmount: currentRound.total_amount || 0,
      winningSlot: currentRound.winning_slot,
      winningColor: currentRound.winning_color,
      createdAt: currentRound.created_at,
      completedAt: currentRound.completed_at,
      animationData: animationData
    };

    console.log(`🎰 Current round: ${roundData.id} (${roundData.phase}) - ${roundData.timeRemaining}ms remaining`);
    return roundData;

  } catch (error) {
    console.error('❌ Error in getCurrentRound:', error);
    throw error;
  }
}

// Generate complete animation data for synchronized rolling
function generateAnimationData(winningSlot: number) {
  console.log(`🎰 Generating animation data for winning slot: ${winningSlot}`);
  
  // Find the winning slot in the wheel configuration
  const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === winningSlot);
  if (slotIndex === -1) {
    console.error(`❌ Invalid winning slot: ${winningSlot}`);
    throw new Error(`Invalid winning slot: ${winningSlot}`);
  }

  // Calculate the exact position to center the winning slot under the indicator
  const winningSlotCenter = slotIndex * TILE_WIDTH + TILE_WIDTH / 2;
  const baseTargetPosition = CENTER_OFFSET - winningSlotCenter;
  
  // Add multiple full rotations for dramatic effect
  const finalTargetPosition = baseTargetPosition - (TOTAL_ROTATIONS * FULL_ROTATION);
  
  // Generate animation keyframes for synchronized movement
  const keyframes = generateAnimationKeyframes(finalTargetPosition);
  
  const animationData = {
    winningSlot: winningSlot,
    winningColor: WHEEL_SLOTS[slotIndex].color,
    slotIndex: slotIndex,
    baseTargetPosition: baseTargetPosition,
    finalTargetPosition: finalTargetPosition,
    totalDistance: Math.abs(finalTargetPosition),
    keyframes: keyframes,
    timing: ANIMATION_TIMING,
    configuration: {
      tileWidth: TILE_WIDTH,
      containerWidth: CONTAINER_WIDTH,
      centerOffset: CENTER_OFFSET,
      fullRotation: FULL_ROTATION,
      totalRotations: TOTAL_ROTATIONS,
      tileRepetitions: TILE_REPETITIONS
    }
  };

  console.log(`🎯 Animation data generated:`);
  console.log(`🎯 Winning slot: ${winningSlot} (${WHEEL_SLOTS[slotIndex].color})`);
  console.log(`🎯 Slot index: ${slotIndex}`);
  console.log(`🎯 Base target position: ${baseTargetPosition}px`);
  console.log(`🎯 Final target position: ${finalTargetPosition}px`);
  console.log(`🎯 Total distance: ${Math.abs(finalTargetPosition)}px`);
  console.log(`🎯 Keyframes generated: ${keyframes.length}`);

  return animationData;
}

// Generate animation keyframes for synchronized movement
function generateAnimationKeyframes(finalTargetPosition: number) {
  const keyframes = [];
  const frameRate = 60; // 60 FPS for smooth animation
  const totalFrames = Math.floor(ANIMATION_TIMING.TOTAL_DURATION / (1000 / frameRate));
  
  console.log(`🎬 Generating ${totalFrames} keyframes at ${frameRate} FPS`);

  for (let frame = 0; frame <= totalFrames; frame++) {
    const elapsed = (frame / totalFrames) * ANIMATION_TIMING.TOTAL_DURATION;
    const progress = frame / totalFrames;
    
    let currentPosition: number;
    let phase: AnimationPhase;
    let velocity: number;
    
    if (elapsed < ANIMATION_TIMING.ACCELERATION_DURATION) {
      // ACCELERATION PHASE
      const phaseProgress = elapsed / ANIMATION_TIMING.ACCELERATION_DURATION;
      const easedProgress = phaseProgress * phaseProgress; // easeInQuad
      const accelerationDistance = finalTargetPosition * 0.3;
      currentPosition = accelerationDistance * easedProgress;
      phase = AnimationPhase.ACCELERATION;
      velocity = easedProgress * 100;
    } else if (elapsed < ANIMATION_TIMING.ACCELERATION_DURATION + ANIMATION_TIMING.FULL_SPEED_DURATION) {
      // FULL SPEED PHASE
      const phaseProgress = (elapsed - ANIMATION_TIMING.ACCELERATION_DURATION) / ANIMATION_TIMING.FULL_SPEED_DURATION;
      const accelerationDistance = finalTargetPosition * 0.3;
      const fullSpeedDistance = finalTargetPosition * 0.6;
      currentPosition = accelerationDistance + (fullSpeedDistance * phaseProgress);
      phase = AnimationPhase.FULL_SPEED;
      velocity = 100;
    } else {
      // DECELERATION PHASE
      const phaseProgress = (elapsed - ANIMATION_TIMING.ACCELERATION_DURATION - ANIMATION_TIMING.FULL_SPEED_DURATION) / ANIMATION_TIMING.DECELERATION_DURATION;
      const easedProgress = 1 - Math.pow(1 - phaseProgress, 4); // easeOutQuart
      const previousDistance = finalTargetPosition * 0.9;
      const decelerationDistance = finalTargetPosition * 0.1;
      currentPosition = previousDistance + (decelerationDistance * easedProgress);
      phase = AnimationPhase.DECELERATION;
      velocity = (1 - easedProgress) * 100;
    }
    
    // Apply bounce effect at the very end
    if (progress > 0.98) {
      const bounceProgress = (progress - 0.98) / 0.02;
      const bounceOffset = Math.sin(bounceProgress * Math.PI * 3) * 5;
      currentPosition += bounceOffset;
    }
    
    keyframes.push({
      frame: frame,
      elapsed: elapsed,
      progress: progress,
      position: currentPosition,
      phase: phase,
      velocity: velocity
    });
  }

  return keyframes;
}

// Get animation data for a specific round
async function getAnimationData(supabase: any, roundId: string) {
  console.log(`🎰 Getting animation data for round: ${roundId}`);
  
  try {
    const { data: round, error } = await supabase
      .from('roulette_rounds')
      .select('*')
      .eq('id', roundId)
      .single();

    if (error || !round) {
      console.error('❌ Error fetching round:', error);
      throw new Error('Round not found');
    }

    if (round.winning_slot === null) {
      console.error('❌ Round has no winning slot yet');
      throw new Error('Round not completed');
    }

    return generateAnimationData(round.winning_slot);

  } catch (error) {
    console.error('❌ Error in getAnimationData:', error);
    throw error;
  }
}

// Create new round
async function createNewRound(supabase: any) {
  console.log('🆕 Creating new roulette round...');
  
  try {
    const { data: newRound, error } = await supabase
      .from('roulette_rounds')
      .insert({
        status: 'active',
        total_bets: 0,
        total_amount: 0,
        winning_slot: null,
        winning_color: null,
        server_seed: null,
        nonce: 1
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating new round:', error);
      throw new Error('Failed to create new round');
    }

    console.log(`✅ New round created: ${newRound.id}`);
    return newRound;

  } catch (error) {
    console.error('❌ Error in createNewRound:', error);
    throw error;
  }
}

// Place bet
async function placeBet(supabase: any, userId: string, roundId: string, betColor: string, betAmount: number, clientSeed?: string) {
  console.log(`💰 Placing bet: ${betAmount} on ${betColor} for user ${userId}`);
  
  try {
    // Validate bet color
    const validColors = ['red', 'black', 'green'];
    if (!validColors.includes(betColor)) {
      throw new Error('Invalid bet color');
    }

    // Validate bet amount
    if (betAmount <= 0 || betAmount > 10000) {
      throw new Error('Invalid bet amount');
    }

    // Check if round is still active
    const { data: round, error: roundError } = await supabase
      .from('roulette_rounds')
      .select('*')
      .eq('id', roundId)
      .single();

    if (roundError || !round) {
      throw new Error('Round not found');
    }

    if (round.status !== 'active') {
      throw new Error('Round is not active');
    }

    // Check if betting time has expired
    const roundStartTime = new Date(round.created_at).getTime();
    const timeElapsed = Date.now() - roundStartTime;
    if (timeElapsed >= BETTING_DURATION) {
      throw new Error('Betting period has ended');
    }

    // Insert bet
    const { data: bet, error: betError } = await supabase
      .from('roulette_bets')
      .insert({
        user_id: userId,
        round_id: roundId,
        bet_color: betColor,
        bet_amount: betAmount,
        client_seed: clientSeed || null
      })
      .select()
      .single();

    if (betError) {
      console.error('❌ Error placing bet:', betError);
      throw new Error('Failed to place bet');
    }

    // Update round totals
    const { error: updateError } = await supabase
      .from('roulette_rounds')
      .update({
        total_bets: (round.total_bets || 0) + 1,
        total_amount: (round.total_amount || 0) + betAmount
      })
      .eq('id', roundId);

    if (updateError) {
      console.error('❌ Error updating round totals:', updateError);
    }

    console.log(`✅ Bet placed successfully: ${bet.id}`);
    return bet;

  } catch (error) {
    console.error('❌ Error in placeBet:', error);
    throw error;
  }
}

// Complete round with provably fair result
async function completeRound(supabase: any, round: any) {
  console.log(`🎯 Completing round: ${round.id}`);
  
  try {
    // Generate provably fair result
    const dailySeed = await getOrCreateDailySeed(supabase);
    const result = await generateProvablyFairResult(supabase, dailySeed, round.nonce);
    
    // Update round with result
    const { data: updatedRound, error } = await supabase
      .from('roulette_rounds')
      .update({
        status: 'spinning',
        winning_slot: result.slot,
        winning_color: result.color,
        completed_at: new Date().toISOString()
      })
      .eq('id', round.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating round:', error);
      throw new Error('Failed to update round');
    }

    console.log(`✅ Round completed: ${result.color} ${result.slot}`);
    return updatedRound;

  } catch (error) {
    console.error('❌ Error in completeRound:', error);
    throw error;
  }
}

// Generate provably fair result using daily seed
async function generateProvablyFairResult(supabase: any, dailySeed: any, nonceId: number) {
  console.log('🎲 Generating provably fair result');
  
  // Create hash input: daily_seed + lotto + nonce
  const hashInput = `${dailySeed.server_seed}:${dailySeed.lotto}:${nonceId}`;
  const hash = await sha256Hash(hashInput);
  
  // Convert first 8 characters of hash to number and mod by 15
  const hashNumber = parseInt(hash.substring(0, 8), 16);
  const resultSlot = hashNumber % 15;
  const result = WHEEL_SLOTS[resultSlot];
  
  console.log(`🎯 Provably Fair Result Generated:`);
  console.log(`📅 Daily Seed: ${dailySeed.date}`);
  console.log(`🔢 Nonce: ${nonceId}`);
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

  console.log(`✅ New daily seed created for ${today}`);
  return newDailySeed;
}

// Utility functions
async function generateSecureServerSeed(): Promise<string> {
  const array = new Uint8Array(DAILY_SEED_LENGTH / 2);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function generateSecureLotto(): Promise<string> {
  const array = new Uint8Array(LOTTO_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => (byte % 10).toString()).join('');
}

async function sha256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}