-- Cleanup script to remove test users created during signup form trials
-- Run this script in your Supabase SQL editor

-- Step 1: Delete user profiles first (to avoid foreign key constraint violations)
DELETE FROM user_profiles 
WHERE id IN (
    '205fc499-33ff-4dc3-907a-c7288afaec05',  -- thomasmpfg (thomas.mpfg@gmail.com)
    'be9a5918-cfa6-4b8d-863a-78176cfed8c3',  -- Legal (legal@bitminded.ch)
    'bbf2b87b-4e64-42dc-afb1-1190571c4fe7',  -- TomSwb (thomasschwab@bitminded.ch)
    '8fe22874-d6c8-4b06-91a1-f572fca31007',  -- Contact (contact@bitminded.ch)
    '9d7aa272-fee4-4be9-9b36-668adab5cafe',  -- thomasschwab146 (thomasschwab146@gmail.com)
    '1849cd1c-fd11-4511-ba10-4e4f7d66a539',  -- oneviaflots (thomasschwab@oneviaflo.com)
    '90943603-2d1f-4756-a845-1f5050ebfe14'   -- Dev (dev@bitminded.ch)
);

-- Step 2: Delete users from auth.users table
DELETE FROM auth.users 
WHERE id IN (
    '205fc499-33ff-4dc3-907a-c7288afaec05',  -- thomasmpfg (thomas.mpfg@gmail.com)
    'be9a5918-cfa6-4b8d-863a-78176cfed8c3',  -- Legal (legal@bitminded.ch)
    'bbf2b87b-4e64-42dc-afb1-1190571c4fe7',  -- TomSwb (thomasschwab@bitminded.ch)
    '8fe22874-d6c8-4b06-91a1-f572fca31007',  -- Contact (contact@bitminded.ch)
    '9d7aa272-fee4-4be9-9b36-668adab5cafe',  -- thomasschwab146 (thomasschwab146@gmail.com)
    '1849cd1c-fd11-4511-ba10-4e4f7d66a539',  -- oneviaflots (thomasschwab@oneviaflo.com)
    '90943603-2d1f-4756-a845-1f5050ebfe14'   -- Dev (dev@bitminded.ch)
);

-- Alternative approach: Delete by username if you prefer
-- DELETE FROM auth.users 
-- WHERE raw_user_meta_data->>'username' IN (
--     'thomasmpfg', 'Legal', 'TomSwb', 'Contact', 
--     'thomasschwab146', 'oneviaflots', 'Dev'
-- );

-- Alternative approach: Delete by email if you prefer
-- DELETE FROM auth.users 
-- WHERE email IN (
--     'thomas.mpfg@gmail.com',
--     'legal@bitminded.ch',
--     'thomasschwab@bitminded.ch',
--     'contact@bitminded.ch',
--     'thomasschwab146@gmail.com',
--     'thomasschwab@oneviaflo.com',
--     'dev@bitminded.ch'
-- );
