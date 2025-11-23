#!/bin/bash
# Update Supabase secrets from .env files
# This script reads from .env-dev and .env-prod and updates the corresponding Supabase projects

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

DEV_PROJECT="eygpejbljuqpxwwoawkn"
PROD_PROJECT="dynxqnrkmjcvgzsugxtm"

echo "🔐 Updating Supabase Secrets"
echo "=============================="
echo ""

# Function to set a secret
set_secret() {
    local key=$1
    local value=$2
    local project_ref=$3
    
    if [ -z "$value" ] || [[ "$value" == *"your_"* ]] || [[ "$value" == *"placeholder"* ]] || [[ "$value" == *"here"* ]]; then
        return 1
    fi
    
    echo -n "   🔑 Setting $key... "
    if supabase secrets set "$key=$value" --project-ref "$project_ref" > /dev/null 2>&1; then
        echo "✅"
        return 0
    else
        echo "❌ (failed)"
        return 1
    fi
}

# Function to set secrets from env file
set_secrets_from_file() {
    local env_file=$1
    local project_ref=$2
    local env_name=$3
    
    echo "📋 Updating secrets for $env_name project ($project_ref)..."
    echo ""
    
    # Read the env file and extract key=value pairs
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        
        # Remove any leading/trailing whitespace
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        
        # Skip Supabase URL and keys (these are project-specific, not secrets)
        if [[ "$key" == "SUPABASE_URL" ]] || [[ "$key" == "SUPABASE_ANON_KEY" ]] || [[ "$key" == "SUPABASE_SERVICE_ROLE_KEY" ]]; then
            continue
        fi
        
        # Skip site URLs (these are configuration, not secrets)
        if [[ "$key" == "SITE_URL" ]] || [[ "$key" == "PUBLIC_SITE_URL" ]] || [[ "$key" == "MAINTENANCE_BYPASS_BASE_URL" ]]; then
            continue
        fi
        
        # Set the secret
        set_secret "$key" "$value" "$project_ref"
        
        # For backward compatibility, also set old Stripe variable names
        if [[ "$key" == "STRIPE_SECRET_KEY_TEST" ]]; then
            set_secret "STRIPE_SECRET_KEY" "$value" "$project_ref"
        fi
        if [[ "$key" == "STRIPE_PUBLISHABLE_KEY_TEST" ]]; then
            set_secret "STRIPE_PUBLISHABLE_KEY" "$value" "$project_ref"
        fi
        if [[ "$key" == "STRIPE_WEBHOOK_SECRET_TEST" ]]; then
            set_secret "STRIPE_WEBHOOK_SECRET" "$value" "$project_ref"
        fi
        if [[ "$key" == "STRIPE_SECRET_KEY_LIVE" ]]; then
            # Only set old name in prod
            if [[ "$env_name" == "PROD" ]]; then
                set_secret "STRIPE_SECRET_KEY" "$value" "$project_ref"
            fi
        fi
        
    done < <(grep -v '^#' "$env_file" | grep '=' | grep -v '^$')
    
    echo ""
}

# Update DEV secrets
if [ -f ".env-dev" ]; then
    set_secrets_from_file ".env-dev" "$DEV_PROJECT" "DEV"
else
    echo "❌ .env-dev file not found!"
    exit 1
fi

# Update PROD secrets
if [ -f ".env-prod" ]; then
    set_secrets_from_file ".env-prod" "$PROD_PROJECT" "PROD"
else
    echo "❌ .env-prod file not found!"
    exit 1
fi

echo "✅ Secrets update complete!"
echo ""
echo "📝 Note: Set both new (STRIPE_SECRET_KEY_TEST) and old (STRIPE_SECRET_KEY) names"
echo "   for backward compatibility. Update your Edge Functions code to use new names."
