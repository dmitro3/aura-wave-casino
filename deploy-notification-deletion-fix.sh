#!/bin/bash

echo "🔧 Deploying notification deletion policy fix..."

# Apply the notification deletion policy fix migration
echo "📊 Applying notification deletion policy migration..."
supabase db push

echo "✅ Notification deletion policy fix deployed successfully!"
echo ""
echo "🔄 Next steps in Supabase Dashboard:"
echo "1. Go to SQL Editor"
echo "2. Run this migration: supabase/migrations/20250102000013-fix-notification-deletion-policy.sql"
echo "3. Test notification deletion functionality"
echo ""
echo "📝 After deployment, users should be able to:"
echo "   - Delete their own notifications permanently"
echo "   - Have deleted notifications stay deleted (no reappearing)"