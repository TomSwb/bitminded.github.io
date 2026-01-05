-- Add Family Member for Test 10
-- Purpose: Add thomasschwab@bitminded.ch as a family member to Test 1 family group
-- Test Date: 2025-01-05
-- Family Group ID: 6821b67e-8b9b-4227-81c1-b588a1e658d3

-- ============================================================================
-- Step 1: Check if user exists and get their details
-- ============================================================================
SELECT 
    id as user_id,
    email,
    date_of_birth,
    CASE 
        WHEN date_of_birth IS NOT NULL 
        THEN EXTRACT(YEAR FROM AGE(date_of_birth))::INTEGER
        ELSE NULL
    END as calculated_age,
    created_at
FROM user_profiles
WHERE email = 'thomasschwab@bitminded.ch';

-- ============================================================================
-- Step 2: Add user as family member (run this after confirming user exists)
-- ============================================================================
-- Note: This will fail if:
-- 1. User doesn't exist
-- 2. User is already a member of this family group
-- 3. Age validation fails (family must have at least one adult)
-- 4. User is already a member of another family group (if constraint exists)

INSERT INTO family_members (
    family_group_id,
    user_id,
    role,
    status,
    age,
    joined_at,
    created_at,
    updated_at
)
SELECT 
    '6821b67e-8b9b-4227-81c1-b588a1e658d3'::UUID as family_group_id,
    up.id as user_id,
    'member' as role,
    'active' as status,
    CASE 
        WHEN up.date_of_birth IS NOT NULL 
        THEN EXTRACT(YEAR FROM AGE(up.date_of_birth))::INTEGER
        ELSE 18  -- Default to 18 if no date_of_birth (adult)
    END as age,
    NOW() as joined_at,
    NOW() as created_at,
    NOW() as updated_at
FROM user_profiles up
WHERE up.email = 'thomasschwab@bitminded.ch'
AND NOT EXISTS (
    -- Check if user is already a member of this family group
    SELECT 1 
    FROM family_members fm
    WHERE fm.family_group_id = '6821b67e-8b9b-4227-81c1-b588a1e658d3'::UUID
    AND fm.user_id = up.id
)
RETURNING 
    id,
    family_group_id,
    user_id,
    role,
    status,
    age,
    joined_at;

-- ============================================================================
-- Step 3: Verify the member was added successfully
-- ============================================================================
SELECT 
    fm.id,
    fm.family_group_id,
    fg.family_name,
    fm.user_id,
    up.email,
    fm.role,
    fm.status,
    fm.age,
    fm.joined_at,
    CASE 
        WHEN fm.age >= 18 THEN '✅ Adult'
        WHEN fm.age IS NULL THEN '⚠️ Age not set'
        ELSE '⚠️ Minor'
    END as age_status
FROM family_members fm
JOIN family_groups fg ON fg.id = fm.family_group_id
JOIN user_profiles up ON up.id = fm.user_id
WHERE fm.family_group_id = '6821b67e-8b9b-4227-81c1-b588a1e658d3'::UUID
AND up.email = 'thomasschwab@bitminded.ch';

-- ============================================================================
-- Step 4: Check all active members of the family group
-- ============================================================================
SELECT 
    fm.id,
    fm.user_id,
    up.email,
    fm.role,
    fm.status,
    fm.age,
    fm.joined_at,
    CASE 
        WHEN fm.age >= 18 THEN '✅ Adult'
        WHEN fm.age IS NULL THEN '⚠️ Age not set'
        ELSE '⚠️ Minor'
    END as age_status
FROM family_members fm
JOIN user_profiles up ON up.id = fm.user_id
WHERE fm.family_group_id = '6821b67e-8b9b-4227-81c1-b588a1e658d3'::UUID
AND fm.status = 'active'
ORDER BY fm.role DESC, up.email;
