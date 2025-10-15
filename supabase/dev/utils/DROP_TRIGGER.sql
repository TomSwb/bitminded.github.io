-- Drop the trigger that's causing the conflict

-- Drop the trigger from auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Drop the function too
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Verify it's gone
SELECT 
    trigger_name, 
    event_object_table, 
    action_statement 
FROM information_schema.triggers 
WHERE trigger_schema = 'auth' 
    AND event_object_table = 'users';

-- Should return empty result
