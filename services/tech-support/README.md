# Guidance Session Booking Implementation Plan

## Overview
This document outlines the plan to add a guidance-session booking flow that lets visitors request time slots while keeping the owner informed and in control. The approach relies on Supabase for persistence and edge functions, Proton mail/calendar for confirmations via ICS attachments, and modular UI updates for both the public support page and the admin panel.

## Goals
- Offer a structured workflow on the public support page for booking guidance sessions.
- Store availability and booking metadata in Supabase tables.
- Send actionable emails (with ICS invites) so bookings can be accepted, declined, or rescheduled from Proton.
- Provide an admin-facing interface for managing availability slots and reviewing booking requests.
- Localize all new UI text in existing locale files.

## Major Workstreams

### 1. Supabase Schema
- Create tables `guidance_availability`, `guidance_bookings`, `guidance_booking_actions` (or similar naming) to track slots, bookings, and signed action tokens.
- Include fields for slot windows, requester contact details, topic, priority, status timestamps, and ICS identifiers.
- Set up appropriate RLS policies so only trusted backend functions mutate data while the public UI reads available slots.

### 2. Edge Functions
- Implement `create-guidance-booking` edge function to:
  - Validate intake data and ensure the slot is still free.
  - Reserve the slot and generate action tokens.
  - Queue email sending with Proton-friendly ICS invite (METHOD=REQUEST).
- Implement `update-guidance-booking` edge function to:
  - Accept signed action tokens from email links.
  - Update booking status (accepted, declined, needs-reschedule).
  - Trigger follow-up messaging to the requester when status changes.

### 3. Public Booking UI
- Add a modular component under `support/components/guidance-booking/`.
- Display available slots based on Supabase records and enforce selection rules.
- Collect required intake details (time slot, topic, priority, and any supplemental questions).
- Submit requests through the new edge function and surface success/error states.
- Integrate the component via lazy loading inside `support/support-form.js` so the main page stays maintainable.

### 4. Admin Management UI
- Create `admin/components/guidance-manager/` to allow CRUD on availability slots and review of booking statuses.
- Provide filters for pending, accepted, declined bookings and quick links to resend emails or mark slots unavailable.
- Ensure admin UI reads/writes through secure Supabase service role access or dedicated edge functions.

### 5. Email & Calendar Integration
- Craft HTML + plain-text email templates with personalization and clear action buttons.
- Generate ICS attachments that Proton can import automatically upon acceptance.
- Host the templates alongside the edge functions for easy maintenance.

### 6. Localization
- Update `support/lang-support/locales-support.json` and `admin/components/support-desk/locales/support-desk-locales.json` (or new locale files under guidance component) with all strings introduced by the booking flow.
- Ensure locale keys follow existing naming conventions and ship English defaults.

## Additional Considerations
- Add automated tests (unit/integration) for edge functions to validate slot reservation logic and token handling.
- Document any environment variables or Supabase configuration required for deployment.
- Coordinate rollout so availability tables are populated before the public UI goes live.

## Next Steps
- Finalize schema design and secure approvals.
- Implement edge functions and confirm ICS/email delivery through Proton.
- Build and test the public booking UI, then admin UI.
- Update localization and service documentation as features stabilize.
