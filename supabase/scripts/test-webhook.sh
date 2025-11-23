#!/bin/bash
# Test webhook handler with Stripe CLI
# This script helps test the Stripe webhook handler

echo "🔧 Stripe Webhook Testing Script"
echo "================================="
echo ""

# Check if stripe listen is already running
if pgrep -f "stripe listen" > /dev/null; then
    echo "✅ Stripe listen is already running"
    echo ""
    echo "You can now trigger events in another terminal:"
    echo "  stripe trigger checkout.session.completed"
    echo "  stripe trigger customer.subscription.created"
    echo ""
    echo "Then check logs in Supabase Dashboard:"
    echo "  https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/functions/stripe-webhook/logs"
    echo ""
    read -p "Press Enter to trigger a test event now..."
    echo ""
    echo "🔄 Triggering checkout.session.completed event..."
    stripe trigger checkout.session.completed
    echo ""
    echo "✅ Event triggered! Check Supabase logs to see if it was received."
else
    echo "📡 Starting Stripe webhook listener..."
    echo ""
    echo "This will forward events to:"
    echo "  https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/stripe-webhook"
    echo ""
    echo "Keep this terminal open to see event forwarding status."
    echo "In another terminal, trigger events with:"
    echo "  stripe trigger checkout.session.completed"
    echo ""
    echo "================================="
    echo ""
    
    stripe listen --forward-to https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/stripe-webhook
fi

