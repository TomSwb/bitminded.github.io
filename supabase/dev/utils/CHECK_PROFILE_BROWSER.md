# Check Profile in Browser Console

You can check if your profile exists directly in the browser console.

## Quick Check

Open browser console (F12) and paste this:

```javascript
// Check if profile exists
(async () => {
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        
        if (!user) {
            console.log('❌ Not authenticated');
            return;
        }
        
        console.log('👤 User ID:', user.id);
        console.log('📧 Email:', user.email);
        
        // Check if profile exists
        const { data: profile, error } = await window.supabase
            .from('user_profiles')
            .select('id, username, email, status')
            .eq('id', user.id)
            .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors
        
        if (error) {
            console.error('❌ Error checking profile:', error);
            console.log('Error code:', error.code);
            console.log('Error message:', error.message);
        } else if (profile) {
            console.log('✅ Profile EXISTS:');
            console.log(profile);
        } else {
            console.log('❌ Profile MISSING');
            console.log('This is why you get the 406 error!');
        }
    } catch (err) {
        console.error('❌ Error:', err);
    }
})();
```

## What to Look For

- **✅ Profile EXISTS**: Your profile is there, the issue is something else
- **❌ Profile MISSING**: This is the cause of the 406 error - run `FIX_USER_PROFILES_406_ERROR.sql`
- **Error with code**: Look at the error code and message to understand the issue






