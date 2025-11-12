# Maintenance Mode Worker

Cloudflare Worker that enforces the global maintenance flag stored in Supabase. It short-circuits traffic to a branded maintenance page, while still allowing administrators (IP allowlist or signed bypass cookie) to continue working.

## Features

- Pulls `maintenance_settings` from Supabase (cached ~30s).
- Allows bypass via IP CIDR list or `maintenance_bypass` cookie.
- Issues cookies when a user visits `/maintenance/unlock?code=…`.
- Serves a static maintenance page (or fetches from `MAINTENANCE_PAGE_URL` if provided).
- Exposes `/.well-known/maintenance-status` for status pings.
- Fails open if Supabase is unavailable, so traffic continues instead of hard failing.

## Deploy

1. **Create a worker** (via Wrangler or Cloudflare dashboard) and paste the code from `worker.ts` (build with `wrangler deploy src/index.ts` if you prefer TS compilation).
2. **Set environment variables/secrets**:

   | Key | Description |
   | --- | --- |
   | `ORIGIN_URL` | Origin to proxy (e.g. `https://bitminded.github.io`). |
   | `SUPABASE_URL` | Supabase project URL. |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (store as a secret). |
   | `MAINTENANCE_PAGE_URL` | Optional static HTML to serve (e.g. `https://bitminded.ch/maintenance/index.html`). |
   | `MAINTENANCE_SETTINGS_CACHE_SECONDS` | Optional cache TTL for settings (default 30). |
   | `MAINTENANCE_BYPASS_COOKIE_NAME` | Cookie name (default `maintenance_bypass`). |
   | `MAINTENANCE_COOKIE_DOMAIN` | Optional cookie domain (e.g. `.bitminded.ch`). |

   ```bash
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   wrangler secret put SUPABASE_URL
   wrangler secret put ORIGIN_URL
   ```

3. **Route** the worker in Cloudflare to the production domain (e.g. `bitminded.ch/*`).

## Maintenance Flow

1. Admin toggles maintenance mode in the Bulk Operations panel (which calls the Supabase edge function).
2. The worker picks up the new flag (within the cache window) and starts serving the maintenance page.
3. Admins can add IPs or generate bypass links, which the worker honours.
4. Disabling maintenance flips the flag back; worker resumes proxying after the cache TTL.

## Local testing

You can simulate requests with `wrangler dev`:

```bash
wrangler dev cloudflare/maintenance/worker.ts \
  --env ORIGIN_URL=https://bitminded.github.io \
  --env SUPABASE_URL=https://dynxqnrkmjcvgzsugxtm.supabase.co
```

Set the secrets in `.dev.vars` for local runs:

```
SUPABASE_SERVICE_ROLE_KEY=...
```

## Related Files

- Supabase edge function: `supabase/functions/maintenance-settings/index.ts`
- Admin UI component: `admin/components/bulk-operations/`
- Maintenance static page: `maintenance/index.html`
- Test plan: `docs/MAINTENANCE-MODE-TEST-CHECKLIST.md`

