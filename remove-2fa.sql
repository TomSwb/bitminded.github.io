-- Remove 2FA from admin account: thomasschwab@bitminded.ch
-- Option 1: Delete the 2FA record completely (recommended)
DELETE FROM public.user_2fa
WHERE user_id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'thomasschwab@bitminded.ch'
);

-- Option 2: Just disable 2FA (keeps the record but disables it)
-- Uncomment below if you prefer to disable instead of delete
/*
UPDATE public.user_2fa
SET is_enabled = FALSE,
    updated_at = NOW()
WHERE user_id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'thomasschwab@bitminded.ch'
);
*/

-- Verify the 2FA has been removed
SELECT 
    u.email,
    u2fa.is_enabled,
    u2fa.created_at
FROM auth.users u
LEFT JOIN public.user_2fa u2fa ON u.id = u2fa.user_id
WHERE u.email = 'thomasschwab@bitminded.ch';

