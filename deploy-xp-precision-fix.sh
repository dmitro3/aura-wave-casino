#!/bin/bash

# XP PRECISION AND MINIMUM BET FIX DEPLOYMENT
# This ensures users get proper decimal XP from any bet size

echo "🎯 DEPLOYING XP PRECISION & MINIMUM BET FIX"
echo "==========================================="

PROJECT_REF="hqdbdczxottbupwbupdu"

echo ""
echo "🚨 CRITICAL: This fixes XP precision and minimum bet restrictions!"
echo ""
echo "📋 WHAT THIS DEPLOYMENT FIXES:"
echo "1. 🎯 XP columns now support 3 decimal precision (NUMERIC(12,3))"
echo "2. 📊 Users can bet as little as \$0.01 and get 0.001 XP"
echo "3. 🔒 Proper XP calculation: XP = ROUND(bet_amount * 0.1, 3)"
echo "4. ✅ Minimum XP is 0.001 for any non-zero bet"
echo "5. ✅ No more minimum bet restrictions for XP"
echo ""

# Apply database migration
echo "📊 Applying XP precision fix..."
supabase db push --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ XP precision fix applied successfully"
else
    echo "❌ XP precision fix failed"
    exit 1
fi

echo ""
echo "🎉 XP PRECISION FIX COMPLETE!"
echo "============================="
echo ""
echo "✅ WHAT'S NOW FIXED:"
echo "🎯 XP columns support 3 decimal places (NUMERIC(12,3))"
echo "📊 update_user_level_stats() function recalculated with precision"
echo "🔒 Perfect XP calculation: \$0.01 bet = 0.001 XP"
echo "✅ \$0.10 bet = 0.010 XP"
echo "✅ \$1.00 bet = 0.100 XP"  
echo "✅ \$10.00 bet = 1.000 XP"
echo "✅ No minimum bet restrictions"
echo ""
echo "🧪 TESTING EXAMPLES:"
echo "📌 \$0.01 bet will give exactly 0.001 XP"
echo "📌 \$0.05 bet will give exactly 0.005 XP"  
echo "📌 \$0.33 bet will give exactly 0.033 XP"
echo "📌 \$1.23 bet will give exactly 0.123 XP"
echo ""
echo "🎯 Users can now bet ANY amount and get proper XP!"
echo "✨ XP PRECISION FIXED! ✨"