# Support Desk Component

Admin-facing workspace for triaging support tickets submitted via the public Support page.

## Features

- Ticket list with search, status, and type filters.
- Detail view showing requester metadata, original message, and device info.
- Status workflow controls (`new`, `in_progress`, `resolved`, `closed`) with Supabase updates.
- Manual refresh and locale-aware copy surfaced via i18next translations.

## Data Requirements

- Relies on the `support_tickets` table (see `20250107_create_support_tickets.sql`).
- Admin access enforced via RLS on `support_tickets` referencing `user_roles`.
- The front-end queries Supabase directly using the authenticated admin session.

## Files

- `support-desk.html` – markup skeleton loaded by the admin layout.
- `support-desk.css` – layout styles, responsive table/detail split.
- `support-desk.js` – component logic (fetch, filters, status updates).
- `support-desk-translations.js` & `locales/` – i18n resources.

## Future Enhancements

- Internal notes and activity timeline per ticket.
- Bulk actions (select + resolve/assign).
- SLA indicators & automated reminders.

