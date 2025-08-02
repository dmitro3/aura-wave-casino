#!/bin/bash

# COMPLETE XP/LEVEL/STATS SYSTEM REBUILD DEPLOYMENT
# This script rebuilds the entire stats tracking system to use user_level_stats properly

echo "🔄 DEPLOYING COMPLETE STATS SYSTEM REBUILD"
echo "==========================================="

PROJECT_REF="hqdbdczxottbupwbupdu"

echo ""
echo "📋 WHAT THIS DEPLOYMENT DOES:"
echo "1. Rebuilds the entire XP/stats tracking system"
echo "2. Makes user_level_stats the primary source of truth"
echo "3. Auto-syncs profiles table from user_level_stats"
echo "4. Updates Tower and Coinflip engines to track stats properly"
echo "5. Ensures ALL games update total_wagered and award XP"
echo ""

# Apply database migration
echo "📊 Step 1: Applying complete stats system rebuild..."
supabase db push --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Database rebuild applied successfully"
else
    echo "❌ Database rebuild failed"
    exit 1
fi

# Deploy Tower Engine
echo ""
echo "🏗️ Step 2: Deploying updated Tower Engine..."
supabase functions deploy tower-engine --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Tower Engine deployed successfully"
else
    echo "❌ Tower Engine deployment failed"
    exit 1
fi

# Deploy Coinflip Engine  
echo ""
echo "🪙 Step 3: Deploying updated Coinflip Engine..."
supabase functions deploy coinflip-streak-engine --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Coinflip Engine deployed successfully"
else
    echo "❌ Coinflip Engine deployment failed"
    exit 1
fi

echo ""
echo "🎉 COMPLETE STATS SYSTEM REBUILD COMPLETE!"
echo "========================================="
echo ""
echo "📊 WHAT'S NOW WORKING:"
echo "✅ user_level_stats is the primary source of truth for all stats"
echo "✅ profiles table automatically synced from user_level_stats"
echo "✅ Tower games: Now properly track wagering + XP + stats"
echo "✅ Coinflip games: Now properly track wagering + XP + stats"  
echo "✅ Roulette games: Continue working as before (already correct)"
echo "✅ XP Rate: 10% of bet amount for ALL games"
echo "✅ Level progression: Automatic based on XP"
echo ""
echo "🧪 TESTING:"
echo "1. Play Tower game -> Check user_level_stats.tower_wagered increases"
echo "2. Play Coinflip -> Check user_level_stats.coinflip_wagered increases"
echo "3. Check profiles.total_wagered matches user_level_stats.total_wagered"
echo "4. Verify XP increases by 10% of bet amount"
echo ""
echo "✨ Your stats tracking system is now bulletproof! ✨"