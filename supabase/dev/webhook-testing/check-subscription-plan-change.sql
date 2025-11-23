-- ============================================================================
-- Check for evidence of subscription plan changes (updates)
-- ============================================================================
-- If a subscription was updated, we'd see multiple records or period mismatches

-- 1. Check if subscription interval matches period duration
-- (Yearly should have ~1 year period, monthly should have ~1 month period)
SELECT 
    'Subscription Period Analysis' as analysis,
    stripe_subscription_id,
    subscription_interval,
    current_period_start,
    current_period_end,
    EXTRACT(EPOCH FROM (current_period_end - current_period_start)) / 86400 as period_days,
    amount_paid,
    updated_at,
    CASE 
        WHEN subscription_interval = 'yearly' AND EXTRACT(EPOCH FROM (current_period_end - current_period_start)) / 86400 < 30 THEN '⚠️ Yearly interval but period < 1 month - possible downgrade'
        WHEN subscription_interval = 'monthly' AND EXTRACT(EPOCH FROM (current_period_end - current_period_start)) / 86400 > 35 THEN '⚠️ Monthly interval but period > 1 month - possible upgrade'
        WHEN subscription_interval = 'yearly' AND EXTRACT(EPOCH FROM (current_period_end - current_period_start)) / 86400 BETWEEN 360 AND 366 THEN '✅ Yearly interval matches period'
        WHEN subscription_interval = 'monthly' AND EXTRACT(EPOCH FROM (current_period_end - current_period_start)) / 86400 BETWEEN 28 AND 31 THEN '✅ Monthly interval matches period'
        ELSE '⚠️ Interval/period mismatch - check Stripe Dashboard'
    END as verification_status
FROM product_purchases
WHERE purchase_type = 'subscription'
  AND stripe_subscription_id IS NOT NULL
  AND current_period_start IS NOT NULL
  AND current_period_end IS NOT NULL
ORDER BY updated_at DESC;

