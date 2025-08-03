#!/bin/bash

echo "🔧 Deploying admin notification broadcast policy fix..."

# Apply the notification policy fix migration
echo "📊 Applying notification policy migration..."
supabase db push

echo "✅ Admin notification broadcast policy fix deployed successfully!"
echo ""
echo "🔄 Next steps in Supabase Dashboard:"
echo "1. Go to SQL Editor"
echo "2. Run this migration: supabase/migrations/20250102000012-fix-admin-notification-policy.sql"
echo "3. Test the notification broadcast functionality"