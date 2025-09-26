-- Cleanup script to remove test users created during signup form trials
-- Run this script in your Supabase SQL Editor

-- Step 1: Delete user profiles first (to avoid foreign key constraint violations)
DELETE FROM user_profiles 
WHERE id IN (
    '277ff311-e7c8-4a0b-91b1-4358bb024906',  -- Legal (legal@bitminded.ch)
    'aeaa7c14-a7cc-4617-b84b-b5e1809710c7',  -- Contact (contact@bitminded.ch)
    'a1e220c0-f6d8-407b-8bf8-831739ae164c',  -- Dev (dev@bitminded.ch)
    'a03234df-da5d-4680-9404-60471c7fdd95'   -- TomSwb (thomasschwab@bitminded.ch)
);

-- Step 2: Delete users from auth.users table
DELETE FROM auth.users 
WHERE id IN (
    '277ff311-e7c8-4a0b-91b1-4358bb024906',  -- Legal (legal@bitminded.ch)
    'aeaa7c14-a7cc-4617-b84b-b5e1809710c7',  -- Contact (contact@bitminded.ch)
    'a1e220c0-f6d8-407b-8bf8-831739ae164c',  -- Dev (dev@bitminded.ch)
    'a03234df-da5d-4680-9404-60471c7fdd95'   -- TomSwb (thomasschwab@bitminded.ch)
);

-- Verification query to check if users were deleted
-- SELECT COUNT(*) as remaining_users FROM user_profiles;
-- SELECT COUNT(*) as remaining_auth_users FROM auth.users;
