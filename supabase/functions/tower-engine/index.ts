import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DifficultyConfig {
  tilesPerRow: number;
  safeCount: number;
  mineCount: number;
  maxLevel: number;
  payoutMultipliers: number[];
}

const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy: {
    tilesPerRow: 4,
    safeCount: 3,
    mineCount: 1,
    maxLevel: 9,
    payoutMultipliers: [1.32, 1.74, 2.28, 3.00, 3.94, 5.19, 6.83, 9.01, 11.95]
  },
  medium: {
    tilesPerRow: 3,
    safeCount: 2,
    mineCount: 1,
    maxLevel: 9,
    payoutMultipliers: [1.48, 2.20, 3.26, 4.82, 7.12, 10.52, 15.56, 23.00, 33.99]
  },
  hard: {
    tilesPerRow: 2,
    safeCount: 1,
    mineCount: 1,
    maxLevel: 9,
    payoutMultipliers: [1.98, 3.92, 7.78, 15.44, 30.64, 60.80, 120.80, 239.66, 475.40]
  },
  extreme: {
    tilesPerRow: 3,
    safeCount: 1,
    mineCount: 2,
    maxLevel: 6,
    payoutMultipliers: [2.94, 8.64, 25.37, 74.51, 218.82, 643.10]
  }
};

function generateMinePositions(difficulty: string): number[][] {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const positions: number[][] = [];
  
  for (let level = 0; level < config.maxLevel; level++) {
    const levelMines: number[] = [];
    const availablePositions = Array.from({ length: config.tilesPerRow }, (_, i) => i);
    
    // Shuffle and pick mine positions
    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
    }
    
    for (let i = 0; i < config.mineCount; i++) {
      levelMines.push(availablePositions[i]);
    }
    
    positions.push(levelMines.sort((a, b) => a - b));
  }
  
  return positions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, gameId, difficulty, betAmount, tileSelected } = await req.json();
    console.log(`🎯 Tower action: ${action} for user: ${user.id}`);

    switch (action) {
      case 'start': {
        // Validate inputs
        if (!difficulty || !DIFFICULTY_CONFIGS[difficulty]) {
          return new Response(JSON.stringify({ error: 'Invalid difficulty' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!betAmount || betAmount <= 0) {
          return new Response(JSON.stringify({ error: 'Invalid bet amount' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check user balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single();

        if (!profile || profile.balance < betAmount) {
          return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Deduct bet amount
        await supabase
          .from('profiles')
          .update({ balance: profile.balance - betAmount })
          .eq('id', user.id);

        // Generate mine positions
        const minePositions = generateMinePositions(difficulty);
        const config = DIFFICULTY_CONFIGS[difficulty];

        // Create game
        const { data: game, error: gameError } = await supabase
          .from('tower_games')
          .insert({
            user_id: user.id,
            difficulty,
            bet_amount: betAmount,
            max_level: config.maxLevel,
            mine_positions: minePositions
          })
          .select()
          .single();

        if (gameError) {
          console.error('❌ Error creating game:', gameError);
          return new Response(JSON.stringify({ error: 'Failed to create game' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`✅ Game created: ${game.id}`);
        return new Response(JSON.stringify({ 
          success: true, 
          game: {
            ...game,
            mine_positions: undefined // Don't send mine positions to client
          },
          config: {
            tilesPerRow: config.tilesPerRow,
            maxLevel: config.maxLevel
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'selectTile': {
        if (!gameId || tileSelected === undefined) {
          return new Response(JSON.stringify({ error: 'Missing gameId or tileSelected' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get game
        const { data: game, error: gameError } = await supabase
          .from('tower_games')
          .select('*')
          .eq('id', gameId)
          .eq('user_id', user.id)
          .single();

        if (gameError || !game) {
          return new Response(JSON.stringify({ error: 'Game not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (game.status !== 'active') {
          return new Response(JSON.stringify({ error: 'Game is not active' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const config = DIFFICULTY_CONFIGS[game.difficulty];
        const minePositions = game.mine_positions as number[][];
        const currentLevelMines = minePositions[game.current_level];
        const isMine = currentLevelMines.includes(tileSelected);
        const nextLevel = game.current_level + 1;
        const wasLastLevel = nextLevel >= config.maxLevel;

        let newStatus = game.status;
        let newMultiplier = game.current_multiplier;
        let finalPayout = 0;

        if (isMine) {
          // Hit a mine - game over
          newStatus = 'lost';
          finalPayout = 0;
          console.log(`💥 Player hit mine at level ${game.current_level + 1}`);
        } else {
          // Safe tile - advance to next level or complete game
          newMultiplier = config.payoutMultipliers[game.current_level];
          
          if (wasLastLevel) {
            // Reached max level - auto cash out
            newStatus = 'cashed_out';
            finalPayout = game.bet_amount * newMultiplier;
            console.log(`🏆 Player completed tower! Payout: ${finalPayout}`);
          }
        }

        // Record the level attempt
        await supabase
          .from('tower_levels')
          .insert({
            game_id: gameId,
            level_number: game.current_level + 1,
            tile_selected: tileSelected,
            was_safe: !isMine,
            multiplier_at_level: newMultiplier
          });

        // Update game state
        const updateData: any = {
          current_level: isMine ? game.current_level : nextLevel,
          current_multiplier: newMultiplier,
          status: newStatus
        };

        if (finalPayout > 0) {
          updateData.final_payout = finalPayout;
        }

        await supabase
          .from('tower_games')
          .update(updateData)
          .eq('id', gameId);

        // If game ended with payout, credit user balance and add to feeds
        if (finalPayout > 0) {
          await supabase
            .from('profiles')
            .update({ 
              balance: supabase.raw(`balance + ${finalPayout}`)
            })
            .eq('id', user.id);

          // Add to game history
          await supabase
            .from('game_history')
            .insert({
              user_id: user.id,
              game_type: 'tower',
              bet_amount: game.bet_amount,
              profit: finalPayout - game.bet_amount,
              result: newStatus === 'cashed_out' ? 'win' : 'lose',
              game_data: {
                difficulty: game.difficulty,
                level_reached: nextLevel,
                multiplier: newMultiplier
              }
            });

          // Add to live feed for big wins (5x+ multiplier)
          if (newMultiplier >= 5) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', user.id)
              .single();

            await supabase
              .from('live_bet_feed')
              .insert({
                user_id: user.id,
                username: profile?.username || 'Unknown',
                game_type: 'tower',
                bet_amount: game.bet_amount,
                result: 'win',
                profit: finalPayout - game.bet_amount,
                multiplier: newMultiplier,
                game_data: {
                  difficulty: game.difficulty,
                  level_reached: nextLevel
                }
              });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          isMine,
          newLevel: nextLevel,
          multiplier: newMultiplier,
          gameStatus: newStatus,
          payout: finalPayout,
          wasLastLevel,
          minePositions: isMine ? currentLevelMines : null // Only reveal mines if game over
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'cashOut': {
        if (!gameId) {
          return new Response(JSON.stringify({ error: 'Missing gameId' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get game
        const { data: game, error: gameError } = await supabase
          .from('tower_games')
          .select('*')
          .eq('id', gameId)
          .eq('user_id', user.id)
          .single();

        if (gameError || !game) {
          return new Response(JSON.stringify({ error: 'Game not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (game.status !== 'active' || game.current_level === 0) {
          return new Response(JSON.stringify({ error: 'Cannot cash out' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const config = DIFFICULTY_CONFIGS[game.difficulty];
        const multiplier = config.payoutMultipliers[game.current_level - 1];
        const payout = game.bet_amount * multiplier;

        // Update game status
        await supabase
          .from('tower_games')
          .update({
            status: 'cashed_out',
            final_payout: payout
          })
          .eq('id', gameId);

        // Credit user balance
        await supabase
          .from('profiles')
          .update({ 
            balance: supabase.raw(`balance + ${payout}`)
          })
          .eq('id', user.id);

        // Add to game history
        await supabase
          .from('game_history')
          .insert({
            user_id: user.id,
            game_type: 'tower',
            bet_amount: game.bet_amount,
            profit: payout - game.bet_amount,
            result: 'win',
            game_data: {
              difficulty: game.difficulty,
              level_reached: game.current_level,
              multiplier
            }
          });

        console.log(`💰 Player cashed out: ${payout} at level ${game.current_level}`);

        return new Response(JSON.stringify({
          success: true,
          payout,
          multiplier
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('❌ Tower error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});