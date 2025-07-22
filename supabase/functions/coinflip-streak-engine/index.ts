import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CoinflipRequest {
  bet_amount: number
  selected_side: 'heads' | 'tails'
  client_seed: string
  streak: number
  current_multiplier: number
}

interface CoinflipResponse {
  success: boolean
  result: 'heads' | 'tails'
  won: boolean
  multiplier: number
  payout: number
  profit: number
  new_balance: number
  server_seed: string
  combined_hash: string
  streak_length: number
  action: 'continue' | 'cash_out' | 'lost'
  error?: string
}

// Generate a cryptographically secure random seed
function generateServerSeed(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Create a hash from server seed + client seed for provably fair result
async function generateHash(serverSeed: string, clientSeed: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(serverSeed + clientSeed)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('')
}

// Determine coin result from hash (provably fair)
function getCoinResult(hash: string): 'heads' | 'tails' {
  // Use first 4 characters of hash to determine result
  const value = parseInt(hash.substring(0, 4), 16)
  return value < 32768 ? 'heads' : 'tails' // 50/50 chance
}

// Calculate multiplier with 1% house edge (1.98^n)
function calculateMultiplier(streakLength: number): number {
  return Math.pow(1.98, streakLength + 1)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { bet_amount, selected_side, client_seed, streak, current_multiplier }: CoinflipRequest = await req.json()

    // Get user from authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    console.log(`🎲 Processing coinflip for user ${user.id}, bet: $${bet_amount}, side: ${selected_side}, streak: ${streak}`)

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance, username')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    // Validate bet amount
    if (bet_amount <= 0 || bet_amount > profile.balance) {
      throw new Error('Invalid bet amount')
    }

    // Generate provably fair result
    const serverSeed = generateServerSeed()
    const combinedHash = await generateHash(serverSeed, client_seed)
    const result = getCoinResult(combinedHash)
    const won = result === selected_side

    console.log(`🎲 Result: ${result}, Won: ${won}, Hash: ${combinedHash.substring(0, 8)}...`)

    let finalMultiplier = current_multiplier
    let payout = 0
    let profit = -bet_amount // Start with loss
    let newStreakLength = streak
    let action: 'continue' | 'cash_out' | 'lost' = 'lost'

    if (won) {
      newStreakLength = streak + 1
      finalMultiplier = calculateMultiplier(newStreakLength - 1) // Current multiplier for this win
      payout = bet_amount * finalMultiplier
      profit = payout - bet_amount
      action = 'continue' // Player can choose to continue or cash out
      console.log(`✅ Win! New streak: ${newStreakLength}, Multiplier: ${finalMultiplier.toFixed(2)}x, Payout: $${payout.toFixed(2)}`)
    } else {
      newStreakLength = 0
      payout = 0
      profit = -bet_amount
      action = 'lost'
      console.log(`❌ Loss! Streak reset, Lost: $${bet_amount}`)
    }

    // Get current user stats for calculations
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('balance, total_wagered, total_profit')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      console.error('❌ Failed to get user data:', userError)
      throw new Error('Failed to get user data')
    }

    // Update user balance
    const newBalance = userData.balance + profit
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        balance: newBalance,
        total_wagered: userData.total_wagered + bet_amount,
        total_profit: userData.total_profit + profit,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Error updating profile:', updateError)
      throw new Error('Failed to update user balance')
    }

    // Add game record to history
    const { error: historyError } = await supabase
      .from('game_history')
      .insert({
        user_id: user.id,
        game_type: 'coinflip',
        bet_amount,
        result: won ? 'win' : 'lose',
        profit,
        streak_length: newStreakLength,
        final_multiplier: finalMultiplier,
        action,
        game_data: {
          choice: selected_side,
          coinResult: result,
          won,
          server_seed: serverSeed,
          client_seed,
          combined_hash: combinedHash,
          streak_length: newStreakLength,
          multiplier: finalMultiplier,
          action
        }
      })

    if (historyError) {
      console.error('❌ Error adding game history:', historyError)
    }

    // Update game stats
    const existingStats = await supabase
      .from('game_stats')
      .select('wins, losses, total_profit')
      .eq('user_id', user.id)
      .eq('game_type', 'coinflip')
      .single()

    if (existingStats.data) {
      const { error: statsError } = await supabase
        .from('game_stats')
        .update({
          wins: existingStats.data.wins + (won ? 1 : 0),
          losses: existingStats.data.losses + (won ? 0 : 1),
          total_profit: existingStats.data.total_profit + profit
        })
        .eq('user_id', user.id)
        .eq('game_type', 'coinflip')

      if (statsError) {
        console.error('❌ Error updating game stats:', statsError)
      }
    }

    const response: CoinflipResponse = {
      success: true,
      result,
      won,
      multiplier: finalMultiplier,
      payout,
      profit,
      new_balance: newBalance,
      server_seed: serverSeed,
      combined_hash: combinedHash,
      streak_length: newStreakLength,
      action
    }

    console.log(`✅ Coinflip completed for user ${user.id}`)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Coinflip engine error:', error)
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    const errorResponse: CoinflipResponse = {
      success: false,
      result: 'heads',
      won: false,
      multiplier: 0,
      payout: 0,
      profit: 0,
      new_balance: 0,
      server_seed: '',
      combined_hash: '',
      streak_length: 0,
      action: 'lost',
      error: error.message || 'Unknown error occurred'
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})