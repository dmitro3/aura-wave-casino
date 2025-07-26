#!/bin/bash

echo "🚀 Deploying Roulette Engine to Supabase..."

# Check if we're in the right directory
if [ ! -f "supabase/functions/roulette-engine/index.ts" ]; then
    echo "❌ Error: supabase/functions/roulette-engine/index.ts not found"
    echo "Make sure you're running this from the project root directory"
    exit 1
fi

echo "📁 Found roulette-engine function"

# Deploy the function
echo "🔧 Deploying function..."
npx supabase functions deploy roulette-engine

if [ $? -eq 0 ]; then
    echo "✅ Roulette Engine deployed successfully!"
    echo "🎰 The provably fair modal should now work correctly"
else
    echo "❌ Deployment failed"
    echo "Please check your Supabase CLI setup and try again"
    exit 1
fi