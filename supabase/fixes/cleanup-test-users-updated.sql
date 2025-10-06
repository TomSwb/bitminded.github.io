-- Cleanup script to remove test users created during signup form trials
-- Run this script in your Supabase SQL Editor

-- Step 1: Delete user profiles first (to avoid foreign key constraint violations)
DELETE FROM user_profiles 
WHERE id IN (
    '0b301cb7-3a04-44ea-a804-27e76bc367e3',  -- contact (contact@bitminded.ch)
    '4c5427bb-5932-4369-8ec1-847b9e33b1b8',  -- Dev (dev@bitminded.ch)
    'f66f0856-a99c-4a14-b9e0-268e8793b667'   -- TomSwb (thomasschwab@bitminded.ch)
);

-- Step 2: Delete users from auth.users table
DELETE FROM auth.users 
WHERE id IN (
    '0b301cb7-3a04-44ea-a804-27e76bc367e3',  -- contact (contact@bitminded.ch)
    '4c5427bb-5932-4369-8ec1-847b9e33b1b8',  -- Dev (dev@bitminded.ch)
    'f66f0856-a99c-4a14-b9e0-268e8793b667'   -- TomSwb (thomasschwab@bitminded.ch)
);

-- Verification query to check if users were deleted
-- SELECT COUNT(*) as remaining_users FROM user_profiles;
-- SELECT COUNT(*) as remaining_auth_users FROM auth.users;
