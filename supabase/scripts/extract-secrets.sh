#!/bin/bash
# Extract secrets from Supabase projects and populate .env files
# This script helps extract secrets that can be retrieved via CLI

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

DEV_PROJECT="eygpejbljuqpxwwoawkn"
PROD_PROJECT="dynxqnrkmjcvgzsugxtm"

echo "🔐 Extracting Secrets from Supabase Projects"
echo "=============================================="
echo ""

# Function to get API keys
get_api_keys() {
    local project_ref=$1
    local env_name=$2
    
    echo "📋 Getting API keys for $env_name project..."
    
    # Get anon and service_role keys
    local api_keys=$(supabase projects api-keys --project-ref "$project_ref" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        local anon_key=$(echo "$api_keys" | grep "anon" | awk '{print $3}')
        local service_role_key=$(echo "$api_keys" | grep "service_role" | awk '{print $3}')
        
        echo "   ✅ Anon key: ${anon_key:0:20}..."
        echo "   ✅ Service role key: ${service_role_key:0:20}..."
        
        # Return values
        echo "$anon_key|$service_role_key"
    else
        echo "   ❌ Failed to get API keys"
        echo "||"
    fi
}

# Get DEV API keys
DEV_KEYS=$(get_api_keys "$DEV_PROJECT" "DEV")
DEV_ANON_KEY=$(echo "$DEV_KEYS" | cut -d'|' -f1)
DEV_SERVICE_KEY=$(echo "$DEV_KEYS" | cut -d'|' -f2)

echo ""
# Get PROD API keys
PROD_KEYS=$(get_api_keys "$PROD_PROJECT" "PROD")
PROD_ANON_KEY=$(echo "$PROD_KEYS" | cut -d'|' -f1)
PROD_SERVICE_KEY=$(echo "$PROD_KEYS" | cut -d'|' -f2)

echo ""
echo "📝 Note: Other secrets (Stripe, Turnstile, etc.) cannot be retrieved via CLI"
echo "   They are stored encrypted. You'll need to get them from:"
echo "   - Supabase Dashboard → Project Settings → Edge Functions → Secrets"
echo "   - Or from your original source"
echo ""
echo "✅ API keys extracted successfully!"
echo ""
echo "Next steps:"
echo "1. Update .env-dev and .env-prod with the extracted API keys"
echo "2. Manually add other secrets from Supabase Dashboard"
echo "3. Add live Stripe keys when ready"

