# Support Centre Overview

- **Purpose:** Dedicated hub for customer support, combining proactive resources with an escalated triage form.
- **Experience Structure:**
  - Hero banner summarising response times and live channel availability.
  - Quick-help cards for guidance sessions, bug reporting, and commission intake (each hooked to form pre-fill).
  - Support request form with request-type taxonomy feeding the Supabase `send-support-request` function.
  - Resource links pointing to documentation, service catalogue, and compliance commitments.
- **Operational Notes:**
  - Logged-in users have their email locked + userId passed to Supabase for ticket correlation.
  - Support types surface in the Resend email payload and are stored in `support_tickets` for trend analysis.
  - Every submission persists in the `support_tickets` table (see Supabase migration `20250107_create_support_tickets.sql`) and produces a `SUP-xxxx` code shown to the customer.
  - The admin Support Desk lists tickets with status workflows (`new`, `in_progress`, `resolved`, `closed`).
  - Update this page when live chat hours or channel availability changes.
