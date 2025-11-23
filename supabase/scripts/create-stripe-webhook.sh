#!/bin/bash
# Create Stripe webhook endpoint via Stripe API
# This script creates a webhook in Stripe (live mode) for the production Supabase function

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

PROD_PROJECT="dynxqnrkmjcvgzsugxtm"
WEBHOOK_URL="https://${PROD_PROJECT}.supabase.co/functions/v1/stripe-webhook"

# Read live Stripe secret key from .env-prod
if [ ! -f ".env-prod" ]; then
    echo "❌ .env-prod file not found!"
    exit 1
fi

STRIPE_SECRET_KEY_LIVE=$(grep "^STRIPE_SECRET_KEY_LIVE=" .env-prod | cut -d'=' -f2 | xargs)

if [ -z "$STRIPE_SECRET_KEY_LIVE" ] || [[ "$STRIPE_SECRET_KEY_LIVE" == *"your_"* ]] || [[ "$STRIPE_SECRET_KEY_LIVE" == *"placeholder"* ]]; then
    echo "❌ STRIPE_SECRET_KEY_LIVE not found or is a placeholder in .env-prod"
    echo "   Please add your live Stripe secret key to .env-prod first"
    exit 1
fi

echo "🔗 Creating Stripe Live Webhook"
echo "================================"
echo ""
echo "Webhook URL: $WEBHOOK_URL"
echo "Stripe Secret Key: ${STRIPE_SECRET_KEY_LIVE:0:20}..."
echo ""

# All 29 events handled by the webhook function
EVENTS=(
    "checkout.session.completed"
    "customer.subscription.created"
    "customer.subscription.updated"
    "customer.subscription.deleted"
    "customer.subscription.paused"
    "customer.subscription.resumed"
    "invoice.paid"
    "invoice.payment_failed"
    "invoice.payment_action_required"
    "invoice.upcoming"
    "invoice.created"
    "invoice.updated"
    "invoice.finalized"
    "invoice.voided"
    "invoice.marked_uncollectible"
    "charge.succeeded"
    "charge.failed"
    "charge.refunded"
    "refund.created"
    "refund.failed"
    "refund.updated"
    "charge.dispute.created"
    "charge.dispute.updated"
    "charge.dispute.closed"
    "charge.dispute.funds_withdrawn"
    "charge.dispute.funds_reinstated"
    "customer.subscription.trial_will_end"
    "customer.subscription.pending_update_applied"
    "customer.subscription.pending_update_expired"
)

echo "📋 Events to subscribe to (29 total):"
for event in "${EVENTS[@]}"; do
    echo "   - $event"
done
echo ""

# Build curl data with multiple enabled_events[] parameters
CURL_DATA="url=${WEBHOOK_URL}&description=BitMinded Production Webhook - Supabase Edge Function&api_version=2024-11-20.acacia"
for event in "${EVENTS[@]}"; do
    CURL_DATA+="&enabled_events[]=${event}"
done

# Create the webhook endpoint
echo "🚀 Creating webhook endpoint..."
RESPONSE=$(curl -s -X POST "https://api.stripe.com/v1/webhook_endpoints" \
    -u "${STRIPE_SECRET_KEY_LIVE}:" \
    -d "$CURL_DATA")

# Check if request was successful
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // .error')
    ERROR_TYPE=$(echo "$RESPONSE" | jq -r '.error.type // "unknown"')
    echo "❌ Failed to create webhook:"
    echo "   Type: $ERROR_TYPE"
    echo "   Message: $ERROR_MSG"
    exit 1
fi

# Extract webhook details
WEBHOOK_ID=$(echo "$RESPONSE" | jq -r '.id')
WEBHOOK_SECRET=$(echo "$RESPONSE" | jq -r '.secret // .signing_secret')

if [ -z "$WEBHOOK_ID" ] || [ "$WEBHOOK_ID" == "null" ]; then
    echo "❌ Failed to create webhook - no ID returned"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "✅ Webhook created successfully!"
echo ""
echo "📋 Webhook Details:"
echo "   ID: $WEBHOOK_ID"
echo "   URL: $WEBHOOK_URL"
echo "   Status: $(echo "$RESPONSE" | jq -r '.status')"
echo ""

if [ -n "$WEBHOOK_SECRET" ] && [ "$WEBHOOK_SECRET" != "null" ]; then
    echo "🔑 Webhook Signing Secret:"
    echo "   $WEBHOOK_SECRET"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Add this secret to .env-prod as STRIPE_WEBHOOK_SECRET_LIVE"
    echo "   2. Update Supabase secrets:"
    echo "      supabase secrets set STRIPE_WEBHOOK_SECRET_LIVE=$WEBHOOK_SECRET --project-ref $PROD_PROJECT"
    echo ""
    
    # Ask if user wants to update automatically
    read -p "Would you like to update .env-prod and Supabase secrets automatically? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Update .env-prod
        if grep -q "^STRIPE_WEBHOOK_SECRET_LIVE=" .env-prod; then
            sed -i "s|^STRIPE_WEBHOOK_SECRET_LIVE=.*|STRIPE_WEBHOOK_SECRET_LIVE=$WEBHOOK_SECRET|" .env-prod
        else
            echo "STRIPE_WEBHOOK_SECRET_LIVE=$WEBHOOK_SECRET" >> .env-prod
        fi
        echo "✅ Updated .env-prod"
        
        # Update Supabase secret
        if supabase secrets set "STRIPE_WEBHOOK_SECRET_LIVE=$WEBHOOK_SECRET" --project-ref "$PROD_PROJECT" > /dev/null 2>&1; then
            echo "✅ Updated Supabase secret"
        else
            echo "⚠️  Failed to update Supabase secret - please do it manually:"
            echo "   supabase secrets set STRIPE_WEBHOOK_SECRET_LIVE=$WEBHOOK_SECRET --project-ref $PROD_PROJECT"
        fi
    fi
else
    echo "⚠️  Warning: No webhook secret returned in response"
    echo "   You may need to retrieve it from the Stripe Dashboard:"
    echo "   https://dashboard.stripe.com/webhooks"
    echo "   Look for webhook ID: $WEBHOOK_ID"
fi

echo ""
echo "🔗 View webhook in Stripe Dashboard:"
echo "   https://dashboard.stripe.com/webhooks/$WEBHOOK_ID"

