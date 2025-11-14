# Maintenance Mode Test Checklist

Use this checklist after shipping the maintenance-mode stack (Supabase settings, admin UI, edge function, Cloudflare Worker, and maintenance page).

## 1. Database & API

- [ ] Run the migration `20251112_create_maintenance_settings.sql` in **dev** then **prod**.
- [ ] Call the `maintenance-settings` edge function (`action: "get"`) with an admin token – confirm it returns the defaults.
- [ ] Toggle maintenance on via `action: "update"` and confirm the Supabase row reflects `is_enabled = true`, `updated_by` is your user id, and the bypass token fields stay `NULL`.

## 2. Admin UI

- [ ] Load the admin panel → Bulk Operations → Maintenance Mode tab. The current state and timestamps should render without errors.
- [ ] Flip the toggle off/on and ensure success banner appears. Verify the allowlist updates immediately after adding/removing entries.
- [ ] Generate a bypass link and verify it populates in the UI. Copy button should work (clipboard receives the code).

## 3. Cloudflare Worker

- [ ] Deploy the worker with environment variables:
  - `ORIGIN_URL`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `MAINTENANCE_PAGE_URL=https://bitminded.ch/maintenance/index.html` (once deployed)
  - `MAINTENANCE_SETTINGS_CACHE_SECONDS` (e.g. 30)
  - `MAINTENANCE_BYPASS_COOKIE_NAME=maintenance_bypass`
- [ ] With maintenance **off**, confirm regular browsing still proxies to origin.
- [ ] Enable maintenance mode; from a non-allowlisted IP you should receive a 503 with the maintenance page. `/.well-known/maintenance-status` must still return JSON.
- [ ] Add your current IP to the allowlist and confirm you bypass the maintenance page without the cookie.
- [ ] Use the bypass link on another browser profile: hitting `/maintenance/unlock?code=…` should set the cookie and redirect to the site.
- [ ] Inspect the cookie attributes (Secure, HttpOnly, SameSite=Lax, 24h lifetime).
- [ ] Disable maintenance and ensure the worker resumes normal traffic within the cache window (< cache TTL).

## 4. Failure Handling

- [ ] Temporarily revoke the worker’s Supabase secret (or point to an invalid URL) and confirm the worker fails open (site remains reachable, logs a warning).
- [ ] Turn maintenance on while Supabase is unreachable and ensure the worker still serves the fallback maintenance page.
- [ ] Verify that the admin UI surfaces an error when Supabase is offline (alert banner appears).

## 5. Maintenance Page

- [ ] Build outputs include `maintenance/index.html` and `maintenance/maintenance.css`; confirm GitHub Pages serves `/maintenance/index.html`.
- [ ] Maintenance page script populates the “Latest update” field when the `.well-known` endpoint is reachable.
- [ ] Page passes accessibility basics (text contrast, focus states).

Document results in the deployment runbook so on-call engineers can reference known-good behaviour.

