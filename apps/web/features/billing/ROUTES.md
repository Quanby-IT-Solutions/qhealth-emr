# Billing Module — Route Map

| Route                                               | Page                         | Story                            | Flow        | Permission                                         | Wireframe Page               |
| --------------------------------------------------- | ---------------------------- | -------------------------------- | ----------- | -------------------------------------------------- | ---------------------------- |
| `/billing/billing`                                  | Billing Dashboard            | Stories 12.1–12.7                | Flows L1–L7 | any of `billing.*:read` (or legacy `billing:view`) | Billing Dashboard            |
| `/billing/encounters/[encounterId]/charges`         | Charge Capture Page          | Story 12.1 — Charge Capture      | Flow L1     | `billing.charges:read`                             | Charge Capture Page          |
| `/billing/encounters/[encounterId]/charges/add`     | Service Item Page            | Story 12.1 — Charge Capture      | Flow L1     | `billing.charges:write`                            | Service Item Page            |
| `/billing/encounters/[encounterId]/invoice`         | Invoice Page                 | Story 12.2 — Invoice & Payment   | Flow L2     | `billing.invoices:read`                            | Invoice Page                 |
| `/billing/encounters/[encounterId]/invoice/payment` | Payment Entry Page           | Story 12.2 — Invoice & Payment   | Flow L2     | `billing.payments:write`                           | Payment Entry Page           |
| `/billing/encounters/[encounterId]/invoice/receipt` | Receipt Page                 | Story 12.2 — Invoice & Payment   | Flow L2     | `billing.payments:read`                            | Receipt Page                 |
| `/billing/encounters/[encounterId]/cf4`             | CF4 Generation Page          | Story 12.3 — CF4 / eClaims       | Flow L3     | `billing.cf4:read`                                 | CF4 Generation Page          |
| `/billing/encounters/[encounterId]/cf4/submit`      | eClaims Submission Page      | Story 12.3 — CF4 / eClaims       | Flow L3     | `billing.cf4:write`                                | eClaims Submission Page      |
| `/billing/encounters/[encounterId]/drg`             | DRG Mapping Page             | Story 12.4 — DRG / CF5           | Flow L4     | `billing.drg:read`                                 | DRG Mapping Page             |
| `/billing/encounters/[encounterId]/drg/cf5`         | CF5 Page                     | Story 12.4 — DRG / CF5           | Flow L4     | `billing.cf5:write`                                | CF5 Page                     |
| `/billing/encounters/[encounterId]/esoa`            | eSOA Page                    | Story 12.5 — eSOA                | Flow L5     | `billing.esoa:read`                                | eSOA Page                    |
| `/billing/encounters/[encounterId]/esoa/preview`    | Statement Preview Page       | Story 12.5 — eSOA                | Flow L5     | `billing.esoa:read`                                | Statement Preview Page       |
| `/billing/eligibility-check`                        | Eligibility Check Page       | Story 12.6 — CEWS Eligibility    | Flow L6     | `billing.cews:read`                                | Eligibility Check Page       |
| `/billing/eligibility-check/[memberPin]`            | Membership Verification Page | Story 12.6 — CEWS Eligibility    | Flow L6     | `billing.cews:read`                                | Membership Verification Page |
| `/billing/konsulta`                                 | Konsulta Tracker Page        | Story 12.7 — Konsulta Capitation | Flow L7     | `billing.konsulta:read`                            | Konsulta Tracker Page        |
| `/billing/konsulta/report`                          | Capitation Report Page       | Story 12.7 — Konsulta Capitation | Flow L7     | `billing.konsulta:read`                            | Capitation Report Page       |

## Feature Structure

```
apps/web/features/billing/
├── ROUTES.md                              — this file
├── components/
│   ├── billing-shell.tsx                  — RBAC gate: billing:view, sidebar nav, role badge
│   ├── encounter-context-bar.tsx          — sticky bar: MRN, name (DPA mask), encounter type, status badge
│   ├── billing-tab.tsx                    — encounter-scoped billing tab (existing, patient chart)
│   ├── cf4-preview.tsx                    — CF4 XML preview (existing)
│   ├── cf5-drg.tsx                        — CF5/DRG component (existing)
│   ├── esoa-preview.tsx                   — eSOA preview (existing)
│   ├── konsulta-tracker.tsx               — Konsulta tracker (existing)
│   ├── malasakit-tracker.tsx              — Malasakit tracker (existing)
│   ├── cews-eligibility-badge.tsx         — CEWS eligibility badge (existing)
│   ├── money-input.tsx                    — BIL-FE-02: currency-aware PHP input
│   ├── line-item-editor.tsx               — BIL-FE-02: sortable line-item table
│   ├── claim-status-timeline.tsx          — BIL-FE-02: claim status stepper
│   ├── xml-preview-pane.tsx               — BIL-FE-02: monospace XML viewer
│   ├── receipt-template.tsx               — BIL-FE-02: printable A4 receipt
│   └── discount-selector.tsx              — BIL-FE-02: Senior/PWD/SoloParent/Manual
├── api/
│   └── billing.hooks.ts                   — shared billing query/mutation hooks
├── charge-capture/
│   ├── api/charges.hooks.ts               — BIL-FE-10: charge capture hooks (orpc pattern)
│   ├── components/                        — BIL-FE-03: auto-pulled-tab, manual-tab, etc.
│   └── lib/charge-utils.ts
├── invoice-payment/
│   ├── api/invoices.hooks.ts              — BIL-FE-10: invoice/payment hooks (orpc pattern)
│   ├── components/                        — BIL-FE-04: invoice-page, payment-entry-page, receipt-page
│   └── lib/invoice-utils.ts
├── cf4-eclaims/
│   ├── api/cf4.hooks.ts                   — BIL-FE-10: CF4/eClaims hooks (orpc pattern)
│   ├── components/                        — BIL-FE-05: cf4-generation-page, eclaims-submission-page
│   └── lib/cf4-sections.ts
├── drg-cf5/
│   ├── api/drg.hooks.ts                   — BIL-FE-10: DRG/CF5 hooks (orpc pattern)
│   ├── components/                        — BIL-FE-06: drg-mapping-page, cf5-page
│   └── lib/drg-confidence.ts
├── esoa/
│   ├── api/esoa.hooks.ts                  — BIL-FE-10: eSOA hooks (orpc pattern)
│   ├── components/                        — BIL-FE-07: esoa-page, statement-preview-page
│   └── lib/esoa-utils.ts
├── eligibility-cews/
│   ├── api/cews.hooks.ts                  — BIL-FE-10: CEWS hooks (orpc pattern)
│   ├── components/                        — BIL-FE-08: eligibility-check-page, membership-verification-page
│   └── lib/pin-format.ts
└── konsulta-capitation/
    ├── api/konsulta.hooks.ts              — BIL-FE-10: Konsulta hooks (orpc pattern)
    ├── components/                        — BIL-FE-09: konsulta-tracker-page, capitation-report-page
    └── lib/capitation-rules.ts
```

## RBAC

Granular per-feature permissions:

| Sub-module    | Read                    | Write                    |
| ------------- | ----------------------- | ------------------------ |
| Charges       | `billing.charges:read`  | `billing.charges:write`  |
| Invoices      | `billing.invoices:read` | `billing.invoices:write` |
| Payments      | `billing.payments:read` | `billing.payments:write` |
| CF4 / eClaims | `billing.cf4:read`      | `billing.cf4:write`      |
| DRG           | `billing.drg:read`      | `billing.drg:write`      |
| CF5           | `billing.cf5:read`      | `billing.cf5:write`      |
| eSOA          | `billing.esoa:read`     | `billing.esoa:write`     |
| CEWS          | `billing.cews:read`     | `billing.cews:write`     |
| Konsulta      | `billing.konsulta:read` | `billing.konsulta:write` |

Shell-level access (`BillingShell`) grants entry when the active role holds at least one `billing.<sub>:read` permission. Legacy `billing:view` is accepted as a fallback for roles that have not been migrated yet.

## Notes

- All pages under `/billing/encounters/[encounterId]/*` require `ChartContext` to be in scope for `EncounterContextBar`.
- The `(billing)` route group renders inside `BillingShell` which provides the sidebar nav and role badge.
- Existing encounter-scoped billing at `/patients/[patientId]/encounters/[encounterId]/billing` remains for the embedded billing tab in the patient chart.
