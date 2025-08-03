#!/bin/bash

# Supabase configuration
SUPABASE_URL="https://hqdbdczxottbupwbupdu.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGJkY3p4b3R0YnVwd2J1cGR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzExNTYyNCwiZXhwIjoyMDY4NjkxNjI0fQ.RH7wKAjmh6xjJ1d1PDvbcr6-xvz1lbvqCqD_ZO2LnwQ"

echo "🚀 Applying guest profile viewing migration..."

# Apply the SQL migration using Supabase RPC
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "-- Migration: Allow guest users to view public profile information\n-- This enables unauthenticated users to view other users profiles\n\n-- Add a policy that allows public/guest users to read basic profile information\nCREATE POLICY \"profiles_public_select_basic\" \nON public.profiles \nFOR SELECT \nUSING (true);\n\n-- Also need to allow public access to user_level_stats for profile viewing\nCREATE POLICY \"user_level_stats_public_select\" \nON public.user_level_stats \nFOR SELECT \nUSING (true);"
  }'

echo ""
echo "✅ Migration applied! Guest users can now view profiles."