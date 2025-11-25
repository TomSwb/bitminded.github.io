# Point-of-Sale Readiness Plan

Comprehensive plan for enabling in-person or on-the-go sales that covers invoices, receipts, contracts, and mobile payment capture (Stripe + TWINT) from the BitMinded admin panel.

---

## 1. Goals & Success Criteria

- **Instant invoicing:** Generate invoices/contracts from a phone-friendly admin UI while with a client.
- **Payment capture:** Accept card, TWINT, or other Stripe-supported methods via Checkout/Payment Links and present QR codes or tap-to-pay options.
- **Automated paperwork:** Email receipts and signed documents automatically after payment.
- **Bookkeeping compliance:** Record every sale with Swiss-appropriate invoice numbering, tax and retention requirements.
- **Admin analytics:** Ensure new payment data feeds subscription dashboards, revenue reports, and future analytics.

---

## 2. Current State Summary

- Stripe subscription infrastructure is specced but not implemented (`admin/components/subscription-management/`, Edge function docs).
- Product wizard already creates Stripe products/prices but assumes “software” product type and does not cover service workflows.
- No contract template system or quick-charge UI exists.
- Legal checklist requires bookkeeping, contract templates, and compliance steps (not yet wired to code).
- TWINT is not yet enabled; no Stripe Payment Link or invoice integration is present.

---

## 3. Phased Implementation Plan

| Phase | Focus | Key Deliverables | Depends On |
| --- | --- | --- | --- |
| **Phase 0: Research & Setup** | Business model alignment | Define service offerings, pricing, tax behavior; decide when contracts are required; gather legal templates | Legal checklist |
| **Phase 1: Stripe Foundations** | API configuration | Enable Payment Links & Invoices, add TWINT payment method, set test secrets in Supabase, document required metadata | Existing Stripe test project |
| **Phase 2: Data Model Updates** | Supabase schema | Extend `product_purchases` or create `service_invoices` table for one-off sales; store contract references, invoice numbers, tax flags; add migration scripts | Phase 1 |
| **Phase 3: Contract Template Engine** | Document generation | Markdown→PDF (or rich-text) template system, signature capture plan, storage (Supabase storage bucket); admin UI to manage templates | Phase 2 |
| **Phase 4: Quick Charge Admin UI** | Mobile-first tooling | New admin module (“Service Sales”); select client, service, generate Stripe payment link, display QR, email contract; offline-safe notes | Phase 2 & 3 |
| **Phase 5: Automation & Notifications** | Webhooks & email | Edge function for `invoice.paid` / `payment_link.*` events: update Supabase, mark contracts signed, send Resend emails with attachments; unify receipts with existing notification helpers | Phase 4 |
| **Phase 6: Reporting & Analytics** | Dashboard integration | Update revenue reports, dashboard KPIs, bulk exports to include service payments; ensure analytics page can filter by sale type | Phase 5 |
| **Phase 7: Production Checklist** | Compliance & go-live | Swiss numbering, invoice retention, AHV/VAT updates, QA with live keys, mobile usability validation | All prior phases |

---

## 4. Stripe & Payment Workflow Details

### 4.1 Payment Methods
- **Stripe Checkout sessions** for ad-hoc services (ensures 3-D Secure, TWINT QR).
- **Stripe Payment Links** for reuse or quick recomposition (pre-configured items).
- **Stripe Invoices** for clients who need formal invoices before paying.
- Keep **test keys** in Supabase secrets until final go-live; swap to live keys and update webhooks at deployment.

### 4.2 Webhook Handling (Edge Functions)
- Extend `/functions/stripe-webhook` to handle:
  - `payment_link.created`, `payment_link.completed` (optional, but helps logging).
  - `checkout.session.completed` (grant entitlements/update sales records).
  - `invoice.paid`, `invoice.payment_failed`, `invoice.sent`.
  - `charge.refunded`, `payment_intent.cancelled` for reversals.
- Map Stripe metadata to Supabase rows (customer email, service id, contract id).
- Trigger Resend emails with receipts/attachments.

### 4.3 TWINT Integration
- Enable TWINT in the Stripe dashboard (Switzerland).
- Add TWINT to Checkout session payment methods.
- Ensure QR code displays well on mobile; optionally display fallback PDF with QR for offline scan.

---

## 5. Contract & Document Automation

| Requirement | Notes |
| --- | --- |
| Contract templates | Store in Supabase storage or versioned table. Support Markdown or JSON templates with dynamic fields (client name, service, rate, date). |
| Signature flow | Start with email acceptance (click-to-accept) or manual signature capture. Later, integrate simple e-sign (e.g. typed name + timestamp) or third-party service. |
| Attachments | Use Resend to send HTML + PDF contract. Keep a copy in Supabase storage with access log. |
| Compliance | Align with Swiss contract requirements; update legal checklist when ready. |

---

## 6. Admin UI Requirements

1. **Service Catalog**
   - Manage service offerings, default durations, pricing, contract requirements, tax flags.
   - Map services to Stripe products/prices (existing product wizard may be extended).

2. **Customer Selector**
   - Search existing users; allow guest customer entry (name, email) for walk-ins.
   - Optionally capture address for invoicing.

3. **Quick Charge Flow**
   - Select service → choose price/discount → generate Checkout session.
   - Show QR code + share link (copy, SMS/email).
   - Option to mark “pending payment” if customer pays later.

4. **Document Review**
   - Preview contract/invoice before sending.
   - Collect signature/acceptance if required.

5. **History & Reconciliation**
   - List of recent service sales with status (paid/pending/refunded).
   - Links to Stripe dashboard, contract PDF, and Resend logs.
   - Export to CSV for bookkeeping.

6. **Mobile Experience**
   - Responsive layout, large buttons, quick search.
   - Surface most-used services as favorites.

---

## 7. Supabase Schema Additions (Draft)

```sql
-- Services catalog
CREATE TABLE service_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    default_price NUMERIC(10,2),
    currency TEXT NOT NULL DEFAULT 'CHF',
    requires_contract BOOLEAN DEFAULT true,
    stripe_price_id TEXT,
    tax_code TEXT,
    default_duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual service sales
CREATE TABLE service_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_user_id UUID REFERENCES auth.users(id),
    guest_email TEXT,
    guest_name TEXT,
    service_id UUID REFERENCES service_offerings(id),
    status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, refunded, cancelled
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CHF',
    stripe_payment_link_id TEXT,
    stripe_checkout_session_id TEXT,
    stripe_invoice_id TEXT,
    payment_method TEXT,
    contract_storage_path TEXT,
    notes TEXT,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Indexes, RLS, and migrations will be refined during implementation.

---

## 8. Dependencies & Open Questions

- **Legal sign-off:** Confirm contract templates, invoice numbering, tax inclusions (VAT vs non-VAT) with a Swiss fiduciary.
- **Customer records:** Decide if non-registered customers should be stored in Supabase or a CRM.
- **Receipt design:** Determine how much branding/detail is required vs using Stripe’s default invoices.
- **Offline mode:** Is offline payment capture needed (store-and-forward) or is always-online acceptable?
- **TWINT-specific UX:** Confirm QR display requirements and fallback if customer uses another method.

---

## 9. Testing Plan

- **Unit tests:** Edge functions (Stripe webhook, payment link generator, contract rendering).
- **Integration tests:** Simulate full sale (admin UI → Stripe Checkout test card/TWINT → webhook → email).
- **Manual QA:** Mobile admin workflow, QR scanning, contract previews, email formatting, Prod keys dry run.
- **Data validation:** Ensure service sales appear in revenue dashboards, account statements, and exports.

---

## 10. Records, Archiving, and Backup Strategy

- **Primary storage**
  - Create a Supabase storage bucket (e.g. `financial_records`) restricted to service-role functions.
  - Store generated contracts, invoices, receipts, and legal acknowledgements with metadata (service_sale id, customer identifiers, hashes, retention flags).
  - Map retention policies (≥10 years) and enforce RLS rules to prevent client-side reads.

- **Secondary backups**
  - Schedule nightly exports of relevant tables (`service_sales`, `product_purchases`, contract metadata) and storage objects to encrypted off-site storage (e.g. S3/Wasabi/Infomaniak/Exoscale).
  - Use versioned buckets and checksum verification; document restoration procedures.

- **Tertiary safeguards**
  - Monthly encrypted snapshot to an offline medium stored securely (protects against cloud outages or ransomware).
  - Log backup runs and restore tests; review quarterly.

- **Bookkeeping workflow**
  - Adopt bookkeeping software or structured spreadsheets tied to exported data to maintain sequential invoices and Swiss-compliant records.
  - Update the legal checklist once AHV registration, contract templates, and invoice numbering policies are in place.

- **Disaster-recovery drills**
  - After implementation, perform a restore test: retrieve an invoice + contract, verify integrity, and re-ingest into Supabase if needed.
  - Keep the playbook alongside this document for auditors.

---

## 11. Next Steps Checklist

1. Validate service offerings and contract requirements with business/legal stakeholders.
2. Extend Stripe setup (enable TWINT, configure test secrets, map metadata).
3. Design Supabase migrations for service catalog & sales.
4. Prototype contract template storage/rendering.
5. Build quick-charge admin UI wireframes; test mobile interactions.
6. Implement payment link/Checkout edge function & webhook updates.
7. Automate receipts/contracts via Resend integration.
8. Update revenue dashboards and analytics to include service sales.
9. Implement archival & backup strategy (storage bucket, nightly/offline backups, bookkeeping workflow).
10. Complete legal/operations checklist (invoice numbering, AHV/VAT registration, insurance review) and schedule external audit.
11. Swap in live Stripe keys and run production pilot with a small set of clients.

---

## 🔗 Related Documentation

### Planning & Implementation
- [Priority List - Active Items](../planning/PRIORITY-LIST-TO-DO.md) - See Phase 6 (Financial Documents: Contracts + Invoices) for implementation tasks
- [Priority List - Completed Items](../planning/PRIORITY-LIST-COMPLETED-ITEMS.md) - See completed payment infrastructure items

### Related Payment & Financial Docs
- [PostFinance Integration Plan](./POSTFINANCE-INTEGRATION-PLAN.md) - Payment method logic, QR-bill generation, bank transfer workflows
- [Family Plans Analysis](./FAMILY-PLANS-ANALYSIS.md) - Family plan payment integration

### Business & Legal
- [Legal Compliance Checklist](../business-legal/LEGAL_COMPLIANCE_CHECKLIST.md) - Swiss invoice numbering, tax requirements, contract templates

---

Keep this document updated as decisions are made or scope shifts. Once implementation starts, link commits, migrations, and UI specs back here for traceability.

