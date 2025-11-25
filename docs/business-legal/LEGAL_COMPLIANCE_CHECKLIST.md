# 🇨🇭 BitMinded Legal & Regulatory Checklist

Comprehensive reference for operating BitMinded as a Swiss sole proprietorship, tailored to the current business model (digital product studio + tech guidance services). The checklist is organized by business stage so you can see what is required now and what triggers later obligations.

> ⚠️ **Important:** This is practical guidance, not legal advice. When in doubt—especially near thresholds—confirm with a Swiss fiduciary or legal professional.

---

## Stage 0 – Before Any Revenue

### Identity & Presence
- [x] **Personal details ready:** Full legal name (Thomas Schwab) and residential address (Ruelle Matthey 2, 1325 Vaulion, Switzerland) for use on invoices, imprint, and contracting.
- [x] **Imprint & contact page live:** Includes name, address, and reachable email (`legal@bitminded.ch`). Phone optional until published.
- [x] **Privacy & Terms:**
  - [x] Privacy policy referencing Supabase auth cookies and data handling.
  - [x] Terms of service drafted for future sales/subscriptions (already published but keep updated).
- [x] **Domain & SSL:** Domain is registered in your name; HTTPS enabled.

### Administrative Setup
- [ ] **Bookkeeping system chosen:** Even simple revenue/expense spreadsheet must capture invoice numbers, dates, clients, and descriptions.
- [ ] **Separating finances:** Dedicated bank account optional but recommended for clarity (not legally required yet).
- [ ] **AHV/AVS Self-employment registration (optional but recommended):** File with the compensation office once you start marketing, even pre-revenue, to establish status and avoid retroactive contributions.
- [ ] **Insurance review:** Decide whether to obtain optional coverage now (professional liability, extended health/accident). Not mandatory yet.

### Service/Product Compliance
- [ ] **Data protection:**
  - [ ] Map personal data flows (newsletters, coaching notes, app analytics) and confirm they stay within Swiss/EU compliant services.
  - [ ] Confirm client data is stored securely (Supabase RLS policies, access controls).
- [ ] **Consumer law basics:**
  - [ ] Pricing must be transparent whenever published.
  - [ ] If you plan digital downloads or subscriptions, note right-of-withdrawal rules (within 14 days unless waived after download/service begins).
- [ ] **Marketing consent:** If collecting emails for updates, plan double opt-in or documented consent.

---

## Stage 1 – First Revenue (< CHF 100,000/year)

### Tax & Social Insurance
- [ ] **AHV/AVS registration filed** (if not already) as soon as you invoice paying clients.
- [ ] **Maintain detailed bookkeeping:**
  - [ ] Sequential invoice numbering.
  - [ ] Track expenses with receipts.
  - [ ] Keep records for 10 years (Swiss retention requirement).
- [ ] **Income tax:** Set aside estimated AHV and income tax contributions based on net profit.

### Invoicing & Payments
- [ ] **Invoice template includes:**
  - Your full name & address.
  - Invoice date & unique number.
  - Client name/address.
  - Description of services/products.
  - Net amount and payment terms.
- [ ] **Payment methods vetted:** Ensure Stripe/PayPal accounts are linked to personal bank account until business account opened.

### Operational Compliance
- [ ] **Contract templates prepared:**
  - Service agreement for tech guidance (scope, pricing, cancellation, liability).
  - Commissioning agreement for artisanal apps (ownership, licensing, support terms).
- [ ] **Data processing agreements:** Ensure providers (Supabase, Stripe, etc.) have GDPR-compliant DPAs on file.
- [ ] **Client data handling:** Implement secure note-taking for coaching sessions (encrypted, access-controlled).

### Branding & Representation
- [ ] **Use legal name in public offers:** Until registration, sign documents as “Thomas Schwab (BitMinded)” to comply with Swiss naming rules.
- [ ] **Optional trademark/domain safeguards:** Consider booking `bitminded.ch` WHOIS privacy, evaluate IP/trademark if branding grows.

---

## Stage 2 – Approaching CHF 100,000 Turnover

### Trigger Alerts
- [ ] **Revenue tracking system:** Monthly review to monitor when turnover approaches CHF 100k.
- [ ] **Business register prep:**
  - [ ] Choose official company name (e.g. “BitMinded – Thomas Schwab”).
  - [ ] Gather ID/passport copies and domicile proof for Handelsregister filing.
  - [ ] Allocate budget for notary/registration fees (~CHF 120–300).
- [ ] **VAT readiness:**
  - [ ] Re-check turnover (CHF 100k across all supplies worldwide triggers VAT registration).
  - [ ] Build pricing models incl. VAT.
- [ ] **Accounting upgrade:** Evaluate moving to double-entry bookkeeping software (e.g. bexio, Run my Accounts).

### Contract & Policy Updates
- [ ] **Terms of service updated** with registered business name once filing is complete.
- [ ] **Imprint** revised to include commercial register number and responsible authority.
- [ ] **Privacy policy** updated if new analytics/marketing tools added.

### Risk Management
- [ ] **Professional liability insurance quotes** obtained; plan to activate coverage when revenue or project risk increases.
- [ ] **Accident insurance (UVG)** evaluated if you plan to hire contractors/employees soon.

---

## Stage 3 – After Registration / VAT

### Legal & Tax Compliance
- [ ] **Commercial register entry obtained:** Update all stationery, website, invoices with the CHE number.
- [ ] **VAT registration complete:**
  - [ ] Decide between net tax rate and effective method.
  - [ ] Update invoices to include VAT number and rate.
  - [ ] File quarterly VAT returns; retain supporting documents.
- [ ] **Double-entry bookkeeping in place** and annual financial statements prepared (balance sheet + income statement).

### Insurance & Contracts
- [ ] **Professional liability insurance active** with coverage matching services offered.
- [ ] **Optional legal expenses insurance** considered for contract disputes.
- [ ] **Client contracts refreshed** with registered entity name, VAT clauses, and liability limitations referencing insurance.

### Employees / Contractors (if applicable)
- [ ] **Employer registration** with AHV compensation office completed.
- [ ] **LAA/UVG accident coverage** arranged for employees.
- [ ] **Pension (BVG/LPP)** triggered if salary exceeds thresholds (CHF 22,050/year).
- [ ] **Withholding tax** procedures ready for foreign employees.

---

## Stage 4 – Expansion & Additional Obligations

### International Sales
- [ ] **EU VAT / OSS** registrations evaluated if selling digital services to EU consumers beyond local thresholds.
- [ ] **US sales tax** reviewed if distributing via app stores or direct downloads.

### Data Protection Scaling
- [ ] **GDPR DPIA** conducted if processing sensitive data or large-scale tracking.
- [ ] **Appointment of DPO/Representative** considered when expanding into EU markets.
- [ ] **Data breach plan** documented and staff/contractors briefed.

### Hosting & Security
- [ ] **Security hardening:** Regular audits of Supabase, Cloudflare, GitHub actions.
- [ ] **Incident response policy** created (contact tree, customer notification template).
- [ ] **Backup & disaster recovery** routines established for catalog apps and client content.

---

## Annual & Recurring Tasks Checklist

- [ ] **Income tax filing:** Submit personal tax return with business accounts.
- [ ] **AHV contributions:** Pay provisional invoices; true-up at year end.
- [ ] **VAT returns:** Quarterly (if registered) with documentation kept 10 years.
- [ ] **Expense reconciliation:** Ensure receipts are stored and linked to accounts.
- [ ] **Policy review:** Annual review of privacy policy, terms, imprint to reflect any changes (services, contact info, registration status).
- [ ] **Insurance audit:** Confirm coverage still fits business size and risk profile.
- [ ] **Data retention purge:** Remove outdated client data according to retention policy.

---

## Quick Reference: Thresholds & Triggers

| Requirement | Trigger | Action |
|-------------|---------|--------|
| AHV self-employment registration | Start earning income | Notify Ausgleichskasse; pay contributions |
| Commercial Register entry | CHF 100,000 turnover | File with Handelsregisteramt |
| VAT registration | CHF 100,000 taxable turnover | Register with ESTV, charge VAT |
| Double-entry bookkeeping | Upon registration | Upgrade accounting system |
| Accident insurance (UVG) | First employee | Contract UVG policy |
| Pension (BVG/LPP) | Employee earns > CHF 22,050/year | Enroll in pension plan |

---

## Action Plan for Current Status (Q4 2025)

1. ✅ Maintain imprint, privacy, terms – already aligned with current stage.
2. ⏳ Register with AHV as self-employed once first coaching session or sale occurs.
3. 📒 Create or refine invoicing template and bookkeeping spreadsheet.
4. 🛡️ Evaluate low-cost professional liability coverage for peace of mind when services launch.
5. 📈 Set quarterly reminder to check turnover against CHF 100k threshold.
6. 📁 Store this checklist in project docs and annotate as obligations evolve.

---

**Next steps suggestion:** When you book your first paid engagement, update this checklist with actual dates (AHV registration submitted, invoice numbers, etc.) to keep a living compliance log.

---

## 🔗 Related Documentation

### Registration & Setup
- [AHV Registration Guide](./AHV-REGISTRATION-GUIDE.md) - Step-by-step self-employment registration process

### Implementation Planning
- [Priority List - Active Items](../planning/PRIORITY-LIST-TO-DO.md) - See Phase 6 for invoice/contract implementation tasks
- [Priority List - Completed Items](../planning/PRIORITY-LIST-COMPLETED-ITEMS.md) - See Phase 0 for completed production readiness items

### Financial & Payment Systems
- [Point-of-Sale Readiness Plan](../payment-financial/POINT-OF-SALE-READINESS.md) - Invoice numbering, contract templates, bookkeeping compliance
- [PostFinance Integration Plan](../payment-financial/POSTFINANCE-INTEGRATION-PLAN.md) - QR-bill invoices, bank transfer workflows

### Business Context
- [Business Model](./BUSINESS_MODEL.md) - Revenue streams and pricing structure

