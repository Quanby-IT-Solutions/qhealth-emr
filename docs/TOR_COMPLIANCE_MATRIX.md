# QHealth EMR — Frontend Pages Compliance Matrix

**Reference:** `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
**Updated:** 2026-04-14 | **Branch:** `dev`
**Scope:** Frontend pages and components only — no backend or DB analysis

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Page exists with real feature components |
| 🔲 | Page exists as a placeholder / stub |
| ❌ | No page |

---

## Section 1 — Navigation Coverage (20 Sidebar Items)

All 20 nav items defined in `navigation.ts` have a corresponding page.

| Nav Label | Route | Status | Key Components |
|---|---|---|---|
| Dashboard | `/dashboard` | ✅ | `dashboard-widgets.tsx` |
| Register Patient | `/patients/register` | ✅ | `patient-registration-form.tsx` |
| Patients | `/patients/search` | ✅ | `patient-search.tsx` |
| Scheduling | `/scheduling` | ✅ | `check-in-list.tsx` |
| Bed Management | `/beds` | ✅ | `bed-management.tsx`, `bed-census-metrics.tsx` |
| Emergency | `/ed` | ✅ | `ed-dashboard.tsx`, `tracking-board.tsx`, `triage-form.tsx` |
| OR / Surgical | `/or` | ✅ | `surgical-dashboard.tsx` |
| Laboratory | `/laboratory` | ✅ | `lab-dashboard.tsx`, `lab-result-card.tsx` |
| Radiology | `/radiology` | 🔲 | Stub page (imaging components exist in orders feature) |
| Pharmacy | `/pharmacy` | ✅ | `verification-queue.tsx`, `order-review.tsx` |
| Telemedicine | `/telemedicine` | ✅ | `telemedicine-dashboard.tsx` |
| Billing | `/billing` | 🔲 | Stub page (billing tab in encounter chart is full) |
| Medical Records | `/him` | 🔲 | Stub page |
| Social Work (MSW) | `/msw` | ✅ | Financial evaluation, CoE issuance, consent forms, benefit tags |
| Nutrition | `/nutrition` | ✅ | `nutrition-dashboard.tsx` |
| Blood Bank | `/blood-bank` | ✅ | `cross-match-form.tsx`, `bedside-matching.tsx` |
| Formulary | `/admin/formulary` | ✅ | `formulary-manager.tsx`, `code-set-browser.tsx` |
| Reporting | `/reporting` | ✅ | `ahsr-dashboard.tsx`, `pidsr-dashboard.tsx`, `hai-report.tsx` |
| Audit Trail | `/audit` | ✅ | `audit-log-table.tsx`, `break-glass-form.tsx` |
| Administration | `/admin` | ✅ | `users-table.tsx`, `permission-matrix.tsx` |

**Result: 17/20 ✅ full, 3/20 🔲 stub**

---

## Section 2 — TOR Module Pages (TOR §2, 14 Modules)

### Module 1 — ADT & Bed Management

| Page | Route | Status |
|---|---|---|
| Patient registration | `/patients/register` | ✅ |
| Patient search | `/patients/search` | ✅ |
| Patient profile + encounter history | `/patients/[id]` | ✅ |
| New encounter | `/patients/[id]/encounters/new` | ✅ |
| Bed management + census metrics | `/beds` | ✅ |
| Transfer (within encounter chart) | `/patients/[id]/encounters/[id]/transfers` | ✅ |
| Discharge (within encounter chart) | `/patients/[id]/encounters/[id]/discharge` | ✅ |

### Module 2 — Emergency Department

| Page | Route | Status |
|---|---|---|
| ED dashboard + tracking board | `/ed` | ✅ |
| Pre-encounter / Trauma Alias form | within `/ed` | ✅ |
| Triage form (ESI/ATS) | within `/ed` | ✅ |
| Merge dialog (Alias → MRN) | within `/ed` | ✅ |
| OECB tag indicator | within `/ed` | ✅ |
| Disposition form | within `/ed` | ✅ |

### Module 3 — Clinical Documentation

| Page | Route | Status |
|---|---|---|
| Documentation tab | `/patients/[id]/encounters/[id]/documentation` | ✅ |
| Note authoring + SOAP template | within documentation tab | ✅ |
| Note signing | within documentation tab | ✅ |
| Amendments / addenda | within documentation tab | ✅ |
| PhilHealth FPE template | within documentation tab | ✅ |
| CF4 review form | within documentation tab | ✅ |
| Consent records tab | within documentation tab | ✅ |

### Module 4 — CPOE & Electronic Prescribing

| Page | Route | Status |
|---|---|---|
| Orders tab (med / lab / imaging) | `/patients/[id]/encounters/[id]/orders` | ✅ |
| Medication order dialog | within orders tab | ✅ |
| Lab order dialog | within orders tab | ✅ |
| Imaging order dialog | within orders tab | ✅ |
| Allergy alert banner (CDS) | within orders tab | ✅ |
| PDEA tranche preview modal | within orders tab | ✅ |
| Pharmacy verification queue | `/pharmacy` | ✅ |
| OPD dispensing | `/pharmacy/opd` | ✅ |

### Module 5 — Maternal, Neonatal & Newborn Screening

| Page | Route | Status |
|---|---|---|
| NBS logbook | `/nbs` | ✅ |
| NBS screening form | within `/nbs` | ✅ |
| NBS consent dialog | within `/nbs` | ✅ |
| NBS card | within `/nbs` | ✅ |
| NBS timeline | within `/nbs` | ✅ |
| NBS referral tracker | within `/nbs` | ✅ |
| Death report (encounter) | `/patients/[id]/encounters/[id]/death-report` | ✅ |
| FMDRF (maternal death form) | `/death-report/fmdrf` | ✅ |
| FNDRF (neonatal death form) | `/death-report/fndrf` | ✅ |

### Module 6 — Nursing Module & MAR/TAR

| Page | Route | Status |
|---|---|---|
| Nursing tab | `/patients/[id]/encounters/[id]/nursing` | ✅ |
| Vitals entry + NEWS badge | within nursing tab | ✅ |
| Flowsheet grid | within nursing tab | ✅ |
| MAR screen | within nursing tab | ✅ |
| TAR screen | within nursing tab | ✅ |
| I/O tracking | within nursing tab | ✅ |
| Shift handoff form | within nursing tab | ✅ |
| HAI tag form | within nursing tab | ✅ |

### Module 7 — Problems & Allergies

| Page | Route | Status |
|---|---|---|
| Problems & allergies tab (encounter) | `/patients/[id]/encounters/[id]/problems-allergies` | ✅ |
| Problems & allergies (patient profile) | `/patients/[id]` | ✅ |
| Add problem dialog | within tab | ✅ |
| Add allergy dialog | within tab | ✅ |
| Resolve problem dialog | within tab | ✅ |
| Severe allergy banner | patient profile + encounter header | ✅ |

### Module 8 — Vitals & Flowsheets

Covered under Module 6 (Nursing tab). All pages present. ✅

### Module 9 — Laboratory & Blood Bank

| Page | Route | Status |
|---|---|---|
| Lab worklist dashboard | `/laboratory` | ✅ |
| Lab result card + detail | within `/laboratory` | ✅ |
| Critical value alert | within `/laboratory` | ✅ |
| Blood bank cross-match | `/blood-bank` | ✅ |
| Bedside matching verification | `/blood-bank` | ✅ |

### Module 10 — RIS / PACS Link

| Page | Route | Status |
|---|---|---|
| Radiology stub page | `/radiology` | 🔲 |
| PACS link component | within encounter orders tab | ✅ |
| Radiology report viewer | within encounter orders tab | ✅ |
| Imaging order worklist | within encounter orders tab | ✅ |

### Module 11 — OR & Surgical Services

| Page | Route | Status |
|---|---|---|
| Surgical case dashboard | `/or` | ✅ |
| Surgical calendar | within `/or` | ✅ |
| Operation record form | within `/or` | ✅ |
| Anesthesia record form | within `/or` | ✅ |
| Pre-op checklist | within `/or` | ✅ |
| RVS code selector | within `/or` | ✅ |
| Surgical tab (encounter chart) | `/patients/[id]/encounters/[id]/surgical` | ✅ |

### Module 12 — Pharmacy Verify

| Page | Route | Status |
|---|---|---|
| Pharmacist verification queue | `/pharmacy` | ✅ |
| Order review + approval | within `/pharmacy` | ✅ |
| Dispense confirmation | within `/pharmacy` | ✅ |
| OPD walk-in dispensing | `/pharmacy/opd` | ✅ |

### Module 13 — Advanced RCM & PhilHealth

| Page | Route | Status |
|---|---|---|
| Billing top-level dashboard | `/billing` | 🔲 |
| Billing tab (encounter chart) | `/patients/[id]/encounters/[id]/billing` | ✅ |
| CF4 preview | within billing tab | ✅ |
| CF5 / DRG preview | within billing tab | ✅ |
| eSOA preview | within billing tab | ✅ |
| CEWS eligibility badge | within billing tab | ✅ |
| Konsulta tracker | within billing tab | ✅ |
| Malasakit tracker | within billing tab | ✅ |

### Module 14 — Telemedicine

| Page | Route | Status |
|---|---|---|
| Telemedicine dashboard | `/telemedicine` | ✅ |
| Virtual visit scheduler | within `/telemedicine` | ✅ |
| Video call panel | within `/telemedicine` | ✅ |
| Telemedicine encounter form | within `/telemedicine` | ✅ |
| E-prescription card | within `/telemedicine` | ✅ |

---

## Section 3 — Reporting Engine Pages (TOR §3)

| Page | Route | Status |
|---|---|---|
| Reporting dashboard (AHSR) | `/reporting` | ✅ |
| PIDSR case management | `/reporting/pidsr` | ✅ |
| HAI surveillance report | `/reporting/hai` | ✅ |
| SLA / Citizens Charter report | `/reporting/sla` | ✅ |
| Report export | within `/reporting` | ✅ |

---

## Section 4 — Role & Access Pages (TOR §1)

| Role | Login | Visible Pages |
|---|---|---|
| Administrator | `admin@qhealth.local` | All 20 nav items |
| Registrar | `registrar@qhealth.local` | Register Patient, Patients, Scheduling, Bed Management, Emergency |
| Medical Social Worker | `msw@qhealth.local` | Patients, Billing, Social Work (MSW) |
| Triage Officer | `triage@qhealth.local` | Patients, Emergency |
| Physician | `doctor@qhealth.local` | Patients, Emergency, OR/Surgical, Lab, Radiology, Telemedicine, Medical Records |
| Surgeon | `surgeon@qhealth.local` | Patients, OR/Surgical, Lab, Radiology, Telemedicine |
| Anesthesiologist | `anesthesiologist@qhealth.local` | Patients, OR/Surgical, Lab, Telemedicine |
| Nurse | `nurse@qhealth.local` | Patients, Emergency, Formulary, Nutrition |
| Clinical Dietitian | `dietitian@qhealth.local` | Patients, Nutrition |
| Pharmacist | `pharmacist@qhealth.local` | Patients, Pharmacy, Formulary |
| Lab Technologist | `labtech@qhealth.local` | Patients, Laboratory, Radiology, Blood Bank |
| Radiologist | `radiologist@qhealth.local` | Patients, Laboratory, Radiology, Blood Bank, Medical Records, Telemedicine |
| Blood Bank Technician | `bloodbank@qhealth.local` | Patients, Laboratory, Blood Bank |
| HIM Coder | `him@qhealth.local` | Patients, Telemedicine, Medical Records |
| Billing Officer | `billing@qhealth.local` | Patients, Billing, Social Work |
| Medical Social Worker | `msw@qhealth.local` | Patients, Billing, Social Work |
| Scheduler | `scheduler@qhealth.local` | Register Patient, Patients, Scheduling, Bed Management |
| Surveillance Officer | `surveillance@qhealth.local` | Patients, Reporting |
| Auditor | `auditor@qhealth.local` | Patients, Reporting, Audit Trail |

All 18 accounts use `Password123`.

---

## Section 5 — All Pages Inventory

**Total pages found: 56**

### Top-level module pages
`/dashboard` `/patients/register` `/patients/search` `/patients/[id]` `/beds` `/ed` `/or` `/laboratory` `/radiology` `/pharmacy` `/pharmacy/opd` `/telemedicine` `/billing` `/him` `/msw` `/nutrition` `/blood-bank` `/nbs` `/scheduling` `/scheduling/book` `/scheduling/queue` `/scheduling/templates` `/opd` `/records` `/sla`

### Encounter chart tabs
`/patients/[id]/encounters/new` `/patients/[id]/encounters/[id]` `/patients/[id]/encounters/[id]/documentation` `/patients/[id]/encounters/[id]/orders` `/patients/[id]/encounters/[id]/nursing` `/patients/[id]/encounters/[id]/problems-allergies` `/patients/[id]/encounters/[id]/billing` `/patients/[id]/encounters/[id]/surgical` `/patients/[id]/encounters/[id]/msw` `/patients/[id]/encounters/[id]/nutrition` `/patients/[id]/encounters/[id]/audit-trail` `/patients/[id]/encounters/[id]/death-report`

### Reporting
`/reporting` `/reporting/pidsr` `/reporting/hai` `/reporting/sla`

### Admin
`/admin` `/admin/users` `/admin/users/[id]` `/admin/roles` `/admin/formulary` `/admin/formulary/code-sets` `/admin/fhir` `/admin/sla`

### Audit
`/audit` `/audit/break-glass`

### Death reports
`/death-report/fmdrf` `/death-report/fndrf`

---

## Summary

| Area | Pages | ✅ Full | 🔲 Stub |
|---|---|---|---|
| Nav sidebar items | 20 | 17 | 3 |
| TOR core modules (14) | covered by 56 pages | 13 of 14 full | Radiology top-level |
| Encounter chart tabs | 12 tabs | 12 | 0 |
| Reporting | 4 | 4 | 0 |
| Admin | 7 | 7 | 0 |

**3 stub pages remaining:** `/radiology`, `/billing` (top-level), `/him`
All other TOR module requirements have dedicated pages and feature components.
