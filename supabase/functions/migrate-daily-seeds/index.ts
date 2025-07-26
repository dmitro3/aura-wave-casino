import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔧 Starting daily_seeds migration...')

    // Create daily_seeds table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.daily_seeds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE UNIQUE NOT NULL,
        server_seed TEXT NOT NULL,
        server_seed_hash TEXT NOT NULL,
        lotto TEXT NOT NULL,
        lotto_hash TEXT NOT NULL,
        is_revealed BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `

    // Check if daily_seeds table exists
    console.log('🔍 Checking if daily_seeds table exists...')
    const { data: tableExists } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'daily_seeds')
      .maybeSingle()

    if (!tableExists) {
      console.log('❌ daily_seeds table does not exist. Please run the migration manually.')
      throw new Error('daily_seeds table missing - manual migration required')
    }

    console.log('✅ daily_seeds table exists')

    // Check if daily_seed_id column exists in roulette_rounds
    console.log('🔍 Checking if daily_seed_id column exists...')
    const { data: columnExists } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'roulette_rounds')
      .eq('column_name', 'daily_seed_id')
      .maybeSingle()

    if (!columnExists) {
      console.log('❌ daily_seed_id column does not exist. Please run the migration manually.')
      throw new Error('daily_seed_id column missing - manual migration required')
    }

    console.log('✅ daily_seed_id column exists')

    // Create today's seed if it doesn't exist
    const today = new Date().toISOString().split('T')[0]
    
    // Generate secure server seed (64-char hex)
    const serverSeedBytes = new Uint8Array(32)
    crypto.getRandomValues(serverSeedBytes)
    const serverSeed = Array.from(serverSeedBytes, byte => byte.toString(16).padStart(2, '0')).join('')

    // Generate secure lotto (10-digit number)
    const lottoBytes = new Uint8Array(5)
    crypto.getRandomValues(lottoBytes)
    let lotto = ''
    for (let i = 0; i < 5; i++) {
      lotto += lottoBytes[i].toString().padStart(2, '0')
    }
    lotto = lotto.substring(0, 10)

    // Hash the seeds
    const encoder = new TextEncoder()
    
    const serverSeedData = encoder.encode(serverSeed)
    const serverSeedHashBuffer = await crypto.subtle.digest('SHA-256', serverSeedData)
    const serverSeedHash = Array.from(new Uint8Array(serverSeedHashBuffer), byte => byte.toString(16).padStart(2, '0')).join('')

    const lottoData = encoder.encode(lotto)
    const lottoHashBuffer = await crypto.subtle.digest('SHA-256', lottoData)
    const lottoHash = Array.from(new Uint8Array(lottoHashBuffer), byte => byte.toString(16).padStart(2, '0')).join('')

    console.log('🌱 Creating today\'s daily seed...')
    const { data: dailySeed, error: seedError } = await supabase
      .from('daily_seeds')
      .upsert({
        date: today,
        server_seed: serverSeed,
        server_seed_hash: serverSeedHash,
        lotto: lotto,
        lotto_hash: lottoHash,
        is_revealed: false
      }, {
        onConflict: 'date'
      })
      .select()
      .single()

    if (seedError) {
      console.error('❌ Daily seed creation error:', seedError)
      throw seedError
    }

    console.log('✅ Migration completed successfully!')
    console.log('📊 Daily seed created:', {
      date: today,
      server_seed_hash: serverSeedHash,
      lotto_hash: lottoHash
    })

    return new Response(JSON.stringify({
      success: true,
      message: 'Daily seeds migration completed successfully',
      daily_seed: {
        date: today,
        server_seed_hash: serverSeedHash,
        lotto_hash: lottoHash
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Migration error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})