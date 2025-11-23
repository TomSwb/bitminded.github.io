-- ============================================================================
-- Test 4.1: Verify Full Refund
-- ============================================================================
-- After refunding a charge, check if purchase record was updated correctly
-- This query checks a specific subscription purchase that was refunded

-- Step 1: Before refund - Check the purchase status
SELECT 
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    stripe_payment_intent_id,
    status,
    payment_status,
    amount_paid,
    currency,
    refunded_at,
    updated_at
FROM product_purchases 
WHERE stripe_subscription_id = 'sub_1SWinhPBAwkcNEBlDlO4yXpX'  -- Update with your subscription ID
   OR stripe_invoice_id = 'in_1SWinhPBAwkcNEBl9ZBuu3g0';        -- Update with your invoice ID

-- Step 2: After refund - Verify the refund was processed
-- Expected results:
--   - payment_status should be 'refunded'
--   - refunded_at should be set (timestamp)
--   - status should be 'cancelled' (if full refund)
SELECT 
    id,
    stripe_subscription_id,
    stripe_invoice_id,
    stripe_payment_intent_id,
    status,
    payment_status,
    amount_paid,
    currency,
    refunded_at,
    updated_at,
    CASE 
        WHEN payment_status = 'refunded' THEN '✅ Refund processed correctly'
        ELSE '❌ Refund NOT processed'
    END as refund_status
FROM product_purchases 
WHERE stripe_subscription_id = 'sub_1SWinhPBAwkcNEBlDlO4yXpX'  -- Update with your subscription ID
   OR stripe_invoice_id = 'in_1SWinhPBAwkcNEBl9ZBuu3g0';        -- Update with your invoice ID

