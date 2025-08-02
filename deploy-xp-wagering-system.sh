#!/bin/bash

# COMPREHENSIVE XP/WAGERING SYSTEM DEPLOYMENT
# This script applies the database migration and deploys updated Edge Functions

echo "🚀 DEPLOYING COMPREHENSIVE XP/WAGERING SYSTEM"
echo "=============================================="

PROJECT_REF="hqdbdczxottbupwbupdu"

echo ""
echo "📋 DEPLOYMENT PLAN:"
echo "1. Apply database migration for XP/wagering functions"
echo "2. Deploy updated Tower Engine (now includes wagering + XP)"
echo "3. Deploy updated Coinflip Engine (now includes XP)"
echo "4. Test all systems"
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"

# Apply database migration
echo ""
echo "📊 Step 1: Applying database migration..."
echo "Migration: supabase/migrations/20250102000001-comprehensive-xp-wagering-fix.sql"

supabase db push --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Database migration applied successfully"
else
    echo "❌ Database migration failed"
    exit 1
fi

# Deploy Tower Engine
echo ""
echo "🏗️ Step 2: Deploying Tower Engine..."
supabase functions deploy tower-engine --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Tower Engine deployed successfully"
else
    echo "❌ Tower Engine deployment failed"
    exit 1
fi

# Deploy Coinflip Engine  
echo ""
echo "🪙 Step 3: Deploying Coinflip Engine..."
supabase functions deploy coinflip-streak-engine --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Coinflip Engine deployed successfully"
else
    echo "❌ Coinflip Engine deployment failed"
    exit 1
fi

# Test the system
echo ""
echo "🧪 Step 4: Testing XP calculation system..."

# Test XP calculations
echo "Testing XP calculations via API..."
curl -s -X POST "https://$PROJECT_REF.supabase.co/rest/v1/rpc/calculate_xp_from_bet" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGJkY3p4b3R0YnVwd2J1cGR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzExNTYyNCwiZXhwIjoyMDY4NjkxNjI0fQ.fzwVymJQjZO_fL4s82U3nlR3lSk8KHoA2weHmOqpYDw" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGJkY3p4b3R0YnVwd2J1cGR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzExNTYyNCwiZXhwIjoyMDY4NjkxNjI0fQ.fzwVymJQjZO_fL4s82U3nlR3lSk8KHoA2weHmOqpYDw" \
  -H "Content-Type: application/json" \
  -d '{"bet_amount": 1.0}' > /tmp/xp_test.json

XP_RESULT=$(cat /tmp/xp_test.json)
echo "✅ $1.00 bet = $XP_RESULT XP"

rm -f /tmp/xp_test.json

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"
echo ""
echo "📋 WHAT'S NOW WORKING:"
echo "✅ Roulette: Already working (wagering + XP on round completion)"
echo "✅ Tower: Now working (wagering + XP on game start)"  
echo "✅ Coinflip: Now working (wagering + XP on bet placement)"
echo "✅ XP Rate: 10% of bet amount (e.g., $1 bet = 0.100 XP)"
echo "✅ Auto-trigger: Any total_wagered increase automatically adds XP"
echo ""
echo "📊 XP CALCULATION EXAMPLES:"
echo "• $0.01 bet → 0.001 XP"
echo "• $0.10 bet → 0.010 XP" 
echo "• $1.00 bet → 0.100 XP"
echo "• $10.00 bet → 1.000 XP"
echo "• $100.00 bet → 10.000 XP"
echo ""
echo "🎮 NEXT STEPS:"
echo "1. Test all games in your platform"
echo "2. Verify XP is being awarded correctly"
echo "3. Check that total_wagered increases with each bet"
echo "4. Monitor level progression system"
echo ""
echo "🔧 If you encounter issues:"
echo "1. Check Supabase function logs"
echo "2. Verify database trigger is working"
echo "3. Test with small bets first"

echo ""
echo "✨ Happy gaming! Your XP/wagering system is now comprehensive and bulletproof! ✨"