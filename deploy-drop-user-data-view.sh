#!/bin/bash

echo "🗑️ Deploying user_data_view cleanup migration..."

# Apply the migration to drop unused user_data_view
echo "📋 Applying migration: 20250102000011-drop-unused-user-data-view.sql"
supabase db push

echo "✅ user_data_view cleanup deployment complete!"
echo "🧹 Database schema has been cleaned up - unused view removed"