-- Find Family Groups for Testing
-- Run this in Supabase SQL Editor (PROD: dynxqnrkmjcvgzsugxtm)
-- Family Group ID: 6821b67e-8b9b-4227-81c1-b588a1e658d3

-- 1. Find all family groups with their admin users
SELECT 
    fg.id as family_group_id,
    fg.family_name,
    fg.admin_user_id,
    u.email as admin_email,
    COUNT(fm.id) FILTER (WHERE fm.status = 'active') as active_members,
    fs.plan_name,
    fs.status as subscription_status,
    fs.stripe_subscription_id
FROM family_groups fg
JOIN user_profiles u ON u.id = fg.admin_user_id
LEFT JOIN family_members fm ON fm.family_group_id = fg.id
LEFT JOIN family_subscriptions fs ON fs.family_group_id = fg.id
GROUP BY fg.id, fg.family_name, fg.admin_user_id, u.email, fs.plan_name, fs.status, fs.stripe_subscription_id
ORDER BY fg.created_at DESC;

-- 2. Find active family members for the test family group
SELECT 
    fm.id as member_id,
    fm.user_id,
    u.email,
    fm.role,
    fm.status,
    fm.joined_at
FROM family_members fm
JOIN user_profiles u ON u.id = fm.user_id
WHERE fm.family_group_id = '6821b67e-8b9b-4227-81c1-b588a1e658d3'
ORDER BY fm.joined_at ASC;

-- 3. Find users that are NOT in the test family group (for adding as members)
SELECT 
    u.id as user_id,
    u.email
FROM user_profiles u
WHERE u.id NOT IN (
    SELECT fm.user_id 
    FROM family_members fm 
    WHERE fm.family_group_id = '6821b67e-8b9b-4227-81c1-b588a1e658d3'
    AND fm.status = 'active'
)
AND u.id != (SELECT admin_user_id FROM family_groups WHERE id = '6821b67e-8b9b-4227-81c1-b588a1e658d3')
LIMIT 5;

-- 4. Check service purchases for the test family group
SELECT 
    sp.id as purchase_id,
    sp.user_id,
    u.email,
    sp.service_id,
    s.name as service_name,
    sp.amount_paid,
    sp.status,
    sp.stripe_subscription_id
FROM service_purchases sp
JOIN user_profiles u ON u.id = sp.user_id
JOIN services s ON s.id = sp.service_id
WHERE sp.stripe_subscription_id IN (
    SELECT stripe_subscription_id 
    FROM family_subscriptions 
    WHERE family_group_id = '6821b67e-8b9b-4227-81c1-b588a1e658d3'
)
ORDER BY sp.purchased_at DESC;

-- 5. Get family status summary for the test family group (similar to API response)
SELECT 
    fg.id as family_group_id,
    fg.family_name,
    fg.admin_user_id,
    (SELECT email FROM user_profiles WHERE id = fg.admin_user_id) as admin_email,
    COUNT(fm.id) FILTER (WHERE fm.status = 'active') as active_member_count,
    fs.plan_name,
    fs.status as subscription_status,
    fs.stripe_subscription_id,
    fs.current_period_start,
    fs.current_period_end
FROM family_groups fg
LEFT JOIN family_members fm ON fm.family_group_id = fg.id
LEFT JOIN family_subscriptions fs ON fs.family_group_id = fg.id
WHERE fg.id = '6821b67e-8b9b-4227-81c1-b588a1e658d3'
GROUP BY fg.id, fg.family_name, fg.admin_user_id, fs.plan_name, fs.status, fs.stripe_subscription_id, fs.current_period_start, fs.current_period_end;

