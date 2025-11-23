#!/bin/bash
# Automated Function Deployment Script
# Deploys Edge Functions to both dev and prod

set -e

DEV_PROJECT="eygpejbljuqpxwwoawkn"
PROD_PROJECT="dynxqnrkmjcvgzsugxtm"

echo "🚀 Supabase Function Deployment Tool"
echo "====================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    exit 1
fi

# Get function name from argument
FUNCTION_NAME=$1

if [ -z "$FUNCTION_NAME" ]; then
    echo "Usage: ./sync-functions.sh <function-name>"
    echo ""
    echo "Available functions:"
    ls -1 supabase/functions/ | grep -v "^_" | grep -v "types.d.ts" | head -20
    exit 1
fi

# Check if function exists
if [ ! -d "supabase/functions/$FUNCTION_NAME" ]; then
    echo "❌ Function '$FUNCTION_NAME' not found in supabase/functions/"
    exit 1
fi

echo "📦 Function: $FUNCTION_NAME"
echo ""

# Deploy to DEV
echo "🔵 Step 1: Deploying to DEV ($DEV_PROJECT)..."
supabase link --project-ref $DEV_PROJECT --password "" 2>&1 | grep -v "password" || true
supabase functions deploy $FUNCTION_NAME --no-verify-jwt 2>&1 | tail -10

echo ""
read -p "✅ Deployed to DEV. Deploy to PROD? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔴 Step 2: Deploying to PROD ($PROD_PROJECT)..."
    supabase link --project-ref $PROD_PROJECT --password "" 2>&1 | grep -v "password" || true
    supabase functions deploy $FUNCTION_NAME --no-verify-jwt 2>&1 | tail -10
    echo ""
    echo "✅ Deployed to both DEV and PROD!"
else
    echo "⏭️  Skipped PROD deployment"
fi

echo ""
echo "📝 Don't forget to:"
echo "   1. Set environment variables in Supabase Dashboard"
echo "   2. Test the function"
echo "   3. Update deployed-functions.md"

