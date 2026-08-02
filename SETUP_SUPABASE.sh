#!/bin/bash

# Setup Supabase schema for ValueSkins
# Run this once to set up all tables, RLS, and realtime

echo "🔧 Setting up Supabase schema..."
echo ""
echo "Step 1: Install Supabase CLI globally"
npm install -g supabase

echo ""
echo "Step 2: Login to Supabase"
supabase login

echo ""
echo "Step 3: Link project"
cd "$(dirname "$0")/marketplace"
supabase link --project-ref yqdttucebzvaeucymzox

echo ""
echo "Step 4: Push migrations"
supabase db push

echo ""
echo "✅ Schema setup complete!"
echo ""
echo "Verify in Supabase Dashboard:"
echo "  - Go to https://supabase.com/dashboard/project/yqdttucebzvaeucymzox"
echo "  - Check 'Table Editor' for campaigns, deals, messages tables"
echo "  - Check 'Replication' to confirm realtime is enabled"

