# How to Get Your Cloudflare API Token

The Cloudflare API Token is used by the `create-cloudflare-worker` Edge Function to deploy workers to your Cloudflare account.

## Steps to Get Your API Token

### 1. Log in to Cloudflare Dashboard
- Go to: https://dash.cloudflare.com/
- Log in with your account

### 2. Navigate to API Tokens
- Click on your profile icon (top right)
- Select **"My Profile"**
- Click on **"API Tokens"** in the left sidebar
- Or go directly to: https://dash.cloudflare.com/profile/api-tokens

### 3. Create a New API Token

#### Option A: Use "Edit Cloudflare Workers" Template (Recommended)
1. Click **"Create Token"**
2. Click **"Get started"** on the **"Edit Cloudflare Workers"** template
3. This template includes the necessary permissions:
   - **Account** → **Cloudflare Workers:Edit**
   - **Zone** → **Zone:Read** (if needed)
4. Click **"Continue to summary"**
5. Review permissions and click **"Create Token"**
6. **IMPORTANT**: Copy the token immediately - you won't be able to see it again!

#### Option B: Create Custom Token
1. Click **"Create Token"**
2. Click **"Create Custom Token"**
3. Give it a name: `Supabase Edge Functions - Workers`
4. Set permissions:
   - **Account** → **Cloudflare Workers:Edit**
   - **Zone** → **Zone:Read** (optional, if you need zone info)
5. Set account resources:
   - Select your account
6. Set zone resources (if you selected Zone:Read):
   - Select your zone(s) or "Include - All zones"
7. Click **"Continue to summary"**
8. Review and click **"Create Token"**
9. **IMPORTANT**: Copy the token immediately!

### 4. Add Token to Your .env Files

Once you have the token, add it to both `.env-dev` and `.env-prod`:

```bash
CLOUDFLARE_API_TOKEN=your_token_here
```

## Token Format

Cloudflare API tokens look like:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

They're typically 40 characters long and contain alphanumeric characters.

## Security Notes

- **Never commit API tokens to git** - they're already in `.gitignore`
- **Store tokens securely** - treat them like passwords
- **Rotate tokens periodically** - create new ones and revoke old ones
- **Use least privilege** - only grant the minimum permissions needed

## Verify Token Works

You can test your token with:

```bash
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

If successful, you'll get a JSON response with your token details.

## Troubleshooting

### Token Not Working
- Check that the token has the correct permissions
- Verify the token hasn't expired or been revoked
- Make sure you copied the entire token (no extra spaces)

### Permission Errors
- Ensure the token has **Cloudflare Workers:Edit** permission
- Check that the token is associated with the correct account
- Verify zone permissions if you're using zone-specific resources

## Next Steps

After adding the token:
1. Update `.env-dev` with the token
2. Update `.env-prod` with the token
3. Test the `create-cloudflare-worker` function
4. Verify workers can be deployed successfully

