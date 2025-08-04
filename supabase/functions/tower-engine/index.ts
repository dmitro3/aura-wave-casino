import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
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
    payoutMultipliers: [1.32, 1.76, 2.34, 3.11, 4.14, 5.51, 7.34, 9.78, 13.04]
  },
  medium: {
    tilesPerRow: 3,
    safeCount: 2,
    mineCount: 1,
    maxLevel: 9,
    payoutMultipliers: [1.49, 2.24, 3.36, 5.04, 7.56, 11.34, 17.01, 25.52, 38.28]
  },
  hard: {
    tilesPerRow: 2,
    safeCount: 1,
    mineCount: 1,
    maxLevel: 9,
    payoutMultipliers: [1.98, 3.92, 7.76, 15.37, 30.46, 60.22, 119.64, 237.09, 469.81]
  },
  extreme: {
    tilesPerRow: 3,
    safeCount: 1,
    mineCount: 2,
    maxLevel: 6,
    payoutMultipliers: [2.97, 8.82, 26.21, 77.88, 231.58, 688.84]
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
  console.log(`🚀 TOWER ENGINE: Function called with method: ${req.method}`);
  console.log(`🚀 TOWER ENGINE: URL: ${req.url}`);
  console.log(`🚀 TOWER ENGINE: Headers:`, Object.fromEntries(req.headers.entries()));
  
  if (req.method === 'OPTIONS') {
    console.log('✅ TOWER ENGINE: OPTIONS request handled');
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    console.log('✅ TOWER ENGINE: GET health check');
    return new Response(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      message: 'Tower Engine is running'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('📨 TOWER ENGINE: Processing POST request');
  
  try {
    console.log('🔧 TOWER ENGINE: Initializing Supabase client');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log(`🔧 TOWER ENGINE: URL present: ${!!supabaseUrl}`);
    console.log(`🔧 TOWER ENGINE: Key present: ${!!supabaseKey}`);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ TOWER ENGINE: Missing environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ TOWER ENGINE: Supabase client initialized');

    const authHeader = req.headers.get('Authorization');
    console.log(`🔐 Auth header present: ${!!authHeader}`);
    
    if (!authHeader) {
      console.error('❌ Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (userError || !user) {
      console.error('❌ Auth error:', userError);
      console.error('❌ User:', user);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`✅ Authenticated user: ${user.id}`);

    let requestBody;
    try {
      requestBody = await req.json();
      console.log(`📝 Raw request body:`, requestBody);
    } catch (error) {
      console.error('❌ Failed to parse request body:', error);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { action, game_id, difficulty, bet_amount, tile_index } = requestBody;
    console.log(`🎯 Tower action: ${action} for user: ${user.id}`);
    console.log(`📊 Parsed values: action=${action}, difficulty=${difficulty}, bet_amount=${bet_amount}, user=${user.id}`);

    switch (action) {
      case 'start': {
        console.log('🎮 TOWER ENGINE: Starting game validation');
        
        // Validate inputs
        if (!difficulty || !DIFFICULTY_CONFIGS[difficulty]) {
          console.error('❌ TOWER ENGINE: Invalid difficulty:', difficulty);
          return new Response(JSON.stringify({ error: 'Invalid difficulty' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!bet_amount || bet_amount <= 0) {
          console.error('❌ TOWER ENGINE: Invalid bet amount:', bet_amount);
          return new Response(JSON.stringify({ error: 'Invalid bet amount' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        console.log('✅ TOWER ENGINE: Input validation passed');
        
        // Check user balance
        // Get user profile with balance info
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('id, balance')
          .eq('id', user.id)
          .single();

        if (userError || !userProfile) {
          console.error('❌ Failed to get user profile:', userError);
          return new Response(JSON.stringify({ error: 'User profile not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (userProfile.balance < bet_amount) {
          return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Deduct bet from balance
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ 
            balance: userProfile.balance - bet_amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (balanceError) {
          console.error('❌ Balance update error:', balanceError);
          return new Response(JSON.stringify({ error: 'Failed to update balance', details: balanceError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`✅ Deducted $${bet_amount} from balance for tower game start`);

        // Generate mine positions
        const minePositions = generateMinePositions(difficulty);
        const config = DIFFICULTY_CONFIGS[difficulty];

        // Create game
        const { data: game, error: gameError } = await supabase
          .from('tower_games')
          .insert({
            user_id: user.id,
            difficulty,
            bet_amount: bet_amount,
            max_level: config.maxLevel,
            mine_positions: minePositions,
            current_level: 0,
            status: 'active',
            current_multiplier: 1.0
          })
          .select()
          .single();

        if (gameError) {
          console.error('❌ Game creation error:', gameError);
          return new Response(JSON.stringify({ error: 'Failed to create game', details: gameError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`🎮 New Tower game started: ${game.id} for user: ${user.id}`);
        return new Response(JSON.stringify(game), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'select_tile': {
        if (!game_id || tile_index === undefined) {
          return new Response(JSON.stringify({ error: 'Missing game_id or tile_index' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get game
        const { data: game, error: gameError } = await supabase
          .from('tower_games')
          .select('*')
          .eq('id', game_id)
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

        // Check if tile selection is valid
        const currentLevelMines = game.mine_positions[game.current_level];
        const isMine = currentLevelMines.includes(tile_index);
        const config = DIFFICULTY_CONFIGS[game.difficulty];
        
        console.log(`🎯 Tile selected: ${tile_index}, Level: ${game.current_level}, Is Mine: ${isMine}`);

        if (isMine) {
          // Record the tile selection in tower_levels before ending the game
          await supabase
            .from('tower_levels')
            .insert({
              game_id: game_id,
              level_number: game.current_level,
              tile_selected: tile_index,
              was_safe: false,
              multiplier_at_level: game.current_multiplier
            });

          // Hit a mine - game over
          await supabase
            .from('tower_games')
            .update({
              status: 'lost',
              final_payout: 0
            })
            .eq('id', game_id);

          // Record loss in game history
          await supabase
            .from('game_history')
            .insert({
              user_id: user.id,
              game_type: 'tower',
              bet_amount: game.bet_amount,
              profit: -game.bet_amount,
              result: 'loss',
              game_data: {
                difficulty: game.difficulty,
                level_reached: game.current_level + 1,
                hit_mine: true
              }
            });

          // Update user stats and XP for the loss
          try {
            const { error: statsError } = await supabase.rpc('update_user_stats_and_level', {
              p_user_id: user.id,
              p_game_type: 'tower',
              p_bet_amount: game.bet_amount,
              p_result: 'loss',
              p_profit: -game.bet_amount,
              p_streak_length: 0
            });

            if (statsError) {
              console.error('❌ Stats update error (loss):', statsError);
            } else {
              console.log('✅ Stats updated for tower loss');
            }
          } catch (rpcError) {
            console.warn('⚠️ Stats function not available yet (migration not applied):', rpcError);
          }

          console.log(`💥 Player hit mine at level ${game.current_level + 1}`);

          // Insert into live bet feed
          try {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', user.id)
              .single();

            await supabase
              .from('live_bet_feed')
              .insert({
                user_id: user.id,
                username: userProfile?.username || 'Unknown',
                avatar_url: userProfile?.avatar_url,
                game_type: 'tower',
                bet_amount: game.bet_amount,
                result: 'loss',
                profit: -game.bet_amount,
                multiplier: game.current_multiplier,
                game_data: {
                  difficulty: game.difficulty,
                  level_reached: game.current_level,
                  max_level: DIFFICULTY_CONFIGS[game.difficulty].maxLevel,
                  mine_positions: game.mine_positions,
                  selected_tiles: game.selected_tiles || []
                }
              });

            console.log('✅ Successfully inserted tower loss into live_bet_feed');
          } catch (liveFeedError) {
            console.error('❌ Failed to insert into live_bet_feed:', liveFeedError);
          }

          // Return updated game state
          const { data: updatedGame } = await supabase
            .from('tower_games')
            .select('*')
            .eq('id', game_id)
            .single();

          return new Response(JSON.stringify(updatedGame), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // Safe tile - advance to next level
          const nextLevel = game.current_level + 1;
          const multiplier = config.payoutMultipliers[game.current_level];
          
          let newStatus = 'active';
          let finalPayout = 0;

          // Check if this was the last level
          if (nextLevel >= config.maxLevel) {
            newStatus = 'cashed_out';
            finalPayout = game.bet_amount * multiplier;
          }

          // Record the tile selection in tower_levels
          await supabase
            .from('tower_levels')
            .insert({
              game_id: game_id,
              level_number: game.current_level,
              tile_selected: tile_index,
              was_safe: true,
              multiplier_at_level: multiplier
            });

          await supabase
            .from('tower_games')
            .update({
              current_level: nextLevel,
              current_multiplier: multiplier,
              status: newStatus,
              final_payout: newStatus === 'cashed_out' ? finalPayout : 0
            })
            .eq('id', game_id);

          // If game completed, credit the payout and record win
          if (newStatus === 'cashed_out') {
            // Credit user balance
            const { data: currentProfile } = await supabase
              .from('profiles')
              .select('balance')
              .eq('id', user.id)
              .single();

            await supabase
              .from('profiles')
              .update({ 
                balance: (currentProfile?.balance || 0) + finalPayout
              })
              .eq('id', user.id);

            // Record win in game history
            await supabase
              .from('game_history')
              .insert({
                user_id: user.id,
                game_type: 'tower',
                bet_amount: game.bet_amount,
                profit: finalPayout - game.bet_amount,
                result: 'win',
                game_data: {
                  difficulty: game.difficulty,
                  level_reached: nextLevel,
                  multiplier,
                  completed: true
                }
              });

            // Update user stats and XP for the win (auto completion)
            try {
              const { error: statsError } = await supabase.rpc('update_user_stats_and_level', {
                p_user_id: user.id,
                p_game_type: 'tower',
                p_bet_amount: game.bet_amount,
                p_result: 'win',
                p_profit: finalPayout - game.bet_amount,
                p_streak_length: 0
              });

              if (statsError) {
                console.error('❌ Stats update error (win):', statsError);
              } else {
                console.log('✅ Stats updated for tower win');
              }
            } catch (rpcError) {
              console.warn('⚠️ Stats function not available yet (migration not applied):', rpcError);
            }

            console.log(`🏆 Player completed tower: ${finalPayout} at level ${nextLevel}`);
          } else {
            console.log(`✅ Player advanced to level ${nextLevel}, multiplier: ${multiplier}`);
          }

          // Return updated game state
          const { data: updatedGame } = await supabase
            .from('tower_games')
            .select('*')
            .eq('id', game_id)
            .single();

          return new Response(JSON.stringify(updatedGame), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'cash_out': {
        if (!game_id) {
          return new Response(JSON.stringify({ error: 'Missing game_id' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get game
        const { data: game, error: gameError } = await supabase
          .from('tower_games')
          .select('*')
          .eq('id', game_id)
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
          .eq('id', game_id);

        // Credit user balance
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single();

        await supabase
          .from('profiles')
          .update({ 
            balance: (currentProfile?.balance || 0) + payout
          })
          .eq('id', user.id);

        // Record win in game history
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
              multiplier,
              cashed_out: true
            }
          });

        // Update user stats and XP for the cash out (manual cash-out, not completion)
        try {
          const { error: statsError } = await supabase.rpc('update_user_stats_and_level', {
            p_user_id: user.id,
            p_game_type: 'tower',
            p_bet_amount: game.bet_amount,
            p_result: 'win',
            p_profit: payout - game.bet_amount,
            p_streak_length: 0
          });

          if (statsError) {
            console.error('❌ Stats update error (cash out):', statsError);
          } else {
            console.log('✅ Stats updated for tower cash out');
          }
        } catch (rpcError) {
          console.warn('⚠️ Stats function not available yet (migration not applied):', rpcError);
        }

        console.log(`💰 Player cashed out: ${payout} at level ${game.current_level}`);

        // Insert into live bet feed
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', user.id)
            .single();

          await supabase
            .from('live_bet_feed')
            .insert({
              user_id: user.id,
              username: userProfile?.username || 'Unknown',
              avatar_url: userProfile?.avatar_url,
              game_type: 'tower',
              bet_amount: game.bet_amount,
              result: 'win',
              profit: payout - game.bet_amount,
              multiplier: multiplier,
              game_data: {
                difficulty: game.difficulty,
                level_reached: game.current_level,
                max_level: config.maxLevel,
                mine_positions: game.mine_positions,
                selected_tiles: game.selected_tiles || []
              }
            });

          console.log('✅ Successfully inserted tower win into live_bet_feed');
        } catch (liveFeedError) {
          console.error('❌ Failed to insert into live_bet_feed:', liveFeedError);
        }

        // Return updated game state
        const { data: updatedGame } = await supabase
          .from('tower_games')
          .select('*')
          .eq('id', game_id)
          .single();

        return new Response(JSON.stringify(updatedGame), {
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
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
