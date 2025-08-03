#!/bin/bash

echo "🔧 Fixing notification deletion RLS policy..."

# Apply the RLS policy fix migration
echo "📊 Applying RLS policy fix migration..."
supabase db push

echo "✅ Notification RLS policy fix deployed!"
echo ""
echo "🔄 Manual deployment in Supabase Dashboard:"
echo "1. Go to SQL Editor"
echo "2. Run: supabase/migrations/20250102000015-fix-notification-deletion-rls.sql"
echo "3. Check the logs for 'SUCCESS: Test notification deleted successfully'"
echo "4. Test notification deletion in the app"
echo ""
echo "📝 This migration:"
echo "   - Removes all conflicting DELETE policies"
echo "   - Creates a simple policy allowing users to delete their own notifications"
echo "   - Tests the policy automatically"