# Support Tickets Component

This component lets signed-in customers review and update their support tickets directly from the account area.

## Features

- Lists active and archived tickets (toggle available).
- Shows ticket metadata, updates, and context (topic, steps, device details).
- Allows customers to share additional notes or close/reopen tickets.
- Invokes the `send-support-update` Supabase edge function so archive state and update history stay in sync with the admin Support Desk.

## Files

- `support-tickets.html` – markup loaded by the component loader.
- `support-tickets.css` – component-specific styling.
- `support-tickets.js` – fetches tickets via Supabase, renders details, and calls the update function.
- `locales/support-tickets-locales.json` – strings for all supported languages.

## Integration

The component is loaded through `account/account-page-loader.js` when customers navigate to the new **Support** section inside the account layout. It expects a Supabase session (`supabase.auth.getSession`) and the environment variable `SUPABASE_CONFIG` to derive the Functions URL.

