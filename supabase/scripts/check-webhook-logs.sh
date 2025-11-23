#!/bin/bash
# Helper script to check webhook function status and logs

echo "🔍 Checking Stripe Webhook Handler Status"
echo "=========================================="
echo ""

# Check if stripe listen is running
if pgrep -f "stripe listen" > /dev/null; then
    echo "✅ Stripe listen is running"
    echo "   PID: $(pgrep -f 'stripe listen' | head -1)"
else
    echo "❌ Stripe listen is NOT running"
    echo "   Start it with: stripe listen --forward-to https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/stripe-webhook"
fi

echo ""
echo "📊 Dashboard Links:"
echo "   Supabase Function Logs:"
echo "   https://supabase.com/dashboard/project/dynxqnrkmjcvgzsugxtm/functions/stripe-webhook/logs"
echo ""
echo "   Stripe Dashboard Webhooks:"
echo "   https://dashboard.stripe.com/test/webhooks"
echo ""
echo "🧪 Testing Commands:"
echo "   Trigger test event: stripe trigger invoice.paid"
echo "   Trigger checkout: stripe trigger checkout.session.completed"
echo ""
echo "📝 Note: Logs may take a few seconds to appear in Supabase Dashboard"
echo ""

