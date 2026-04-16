# QHealth EMR — Comprehensive Gap Analysis

**Reference:** `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
**Analysis Date:** 2026-04-13
**Codebase Branch:** `dev`

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented |
| 🟡 | Partially implemented / stub only |
| ❌ | Not implemented — gap |
| 🔴 | Critical gap — required for legal/regulatory compliance or core clinical safety |

---

## Section 1 — Executive Summary

The QHealth EMR codebase has established a **strong architectural and data foundation**. The infrastructure layer (NestJS + Next.js + Drizzle ORM, Better Auth, oRPC contracts, TanStack Query), core relational schema, and skeletal backend services are all in place. Many modules exist as working CRUD endpoints with frontend UI.

However, the current system is **not yet clinically deployable** for a Philippine healthcare facility. Significant gaps exist in four critical areas:

1. **Compliance logic** — PDEA S-2 enforcement, Generics Act hard blocks, PDEA tranche splitting, and PRC/PTR auto-appending are missing from CPOE.
2. **Missing modules** — Operating Room/Surgical, Maternal/Newborn Screening, Telemedicine, Medical Social Worker, Clinical Dietitian, and HIM Coder modules do not exist at all.
3. **PhilHealth integration** — CF4 XML generation is a draft stub, CF5/DRG Shadow Billing is absent, and eSOA, Malasakit, and Konsulta Capitation workflows are unbuilt.
4. **Non-functional requirements** — Offline mode (PWA), HL7 FHIR R4 API layer, ARTA/Citizens Charter SLA tracking, and SNOMED CT integration are missing.

---

## Section 2 — Architecture and Infrastructure

### 2.1 What Is Implemented

| Component | Status | Location |
|-----------|--------|----------|
| NestJS 10 backend | ✅ | `apps/backend/` |
| Next.js 16 App Router frontend | ✅ | `apps/web/` |
| Flutter mobile structure | ✅ | `apps/mobile/` |
| Drizzle ORM + PostgreSQL | ✅ | `packages/db/` |
| Better Auth session management | ✅ | `packages/auth/`, `apps/backend/src/config/auth.config.ts` |
| oRPC contract-first API | ✅ | `packages/contracts/` |
| TanStack Query + oRPC client | ✅ | `apps/web/services/` |
| Row-Level Security policies | ✅ | `packages/db/src/migrations/0001_rls_policies.sql` |
| Global exception filter | ✅ | `apps/backend/src/common/filters/http-exception.filter.ts` |
| Audit trail (break-glass, access log) | ✅ | `apps/backend/src/modules/v1/audit/` |
| RBAC guard | ✅ | `apps/backend/src/modules/v1/rbac/rbac.guard.ts` |
| Swagger/OpenAPI config | ✅ | `apps/backend/src/config/swagger.config.ts` |
| Real-time notifications | ✅ | `apps/backend/src/modules/v1/notifications/` |

### 2.2 Critical Architectural Gaps

| Gap | Priority | Notes |
|-----|----------|-------|
| ❌ HL7 FHIR R4 API layer | 🔴 | TOR §4.1: Required for DOH NHDR integration. No FHIR resource mapping exists. Needs a separate FHIR transformation layer or an `@repo/fhir` package. |
| ❌ Offline Mode / PWA | 🔴 | TOR §4.2: Clinicians must be able to document during outages. Requires Service Worker + local IndexedDB cache + sync queue. Next.js supports PWA via `next-pwa`. |
| ❌ ARTA time-and-motion tracking | 🟡 | TOR §6: Every status change needs an SLA timestamp. The audit log exists but is not wired to SLA calculation or Citizen's Charter reports. Needs a dedicated `sla_tracking` table and reporting query. |
| ❌ SNOMED CT code set | ❌ | TOR §4.1: Only ICD-10, LOINC, RxNorm, and RVS are seeded. SNOMED CT for clinical findings/procedures is absent from `formulary.ts`. |

---

## Section 3 — Database Schema Analysis

### 3.1 Implemented Tables (45+ tables across 8 domain files)

| Domain File | Tables | Status |
|-------------|--------|--------|
| `schema/auth.ts` | users, sessions, accounts | ✅ |
| `schema/rbac.ts` | facilities, staffProfiles, roles, rolePermissions, userRoles | ✅ |
| `schema/core.ts` | patients, wards, beds, preEncounters, encounters, encounterTransfers, bedCensusSnapshots | ✅ |
| `schema/clinical.ts` | noteTemplates, clinicalNotes, noteAddenda, consentRecords, problems, allergies | ✅ |
| `schema/orders.ts` | medicationOrders, labOrders, imagingOrders, orderVerifications, prescriptions | ✅ |
| `schema/nursing.ts` | vitalSigns, flowsheetEntries, marEntries, tarEntries, ioEntries, shiftHandoffs, haiTags | ✅ |
| `schema/billing.ts` | chargeMasterItems, charges, invoices, invoiceLineItems, payments, cf4Claims, eligibilityChecks | ✅ |
| `schema/formulary.ts` | drugGenerics, drugBrands, formularyItems, icd10Codes, loincCodes, rxnormCodes, rvsCodes | ✅ |
| `schema/reporting.ts` | pidsrCases, surveillanceFlags, ahsrSnapshots | ✅ |

### 3.2 Missing Tables / Schema Gaps

| Missing Table(s) | Module | Priority | TOR Reference |
|-----------------|--------|----------|---------------|
| `newborn_screenings` | Maternal/NBS | 🔴 | §2.5 — NBS logbook (time-of-birth, screening time, 24–48 hr enforcement) |
| `nbs_consents` | Maternal/NBS | 🔴 | §2.5 — Electronic parental consent/waiver |
| `nbs_positive_referrals` | Maternal/NBS | 🔴 | §2.5 — Positive result referral pathway tracking |
| `maternal_death_reports` (FMDRF) | Maternal/NBS | 🔴 | §2.5 — Triggered on death of reproductive-age female |
| `neonatal_death_reports` (FNDRF) | Maternal/NBS | 🔴 | §2.5 — Triggered on death of neonate |
| `or_cases` | OR/Surgical | 🔴 | §2.11 — Operation Record (technique, personnel, timestamps) |
| `anesthesia_records` | OR/Surgical | 🔴 | §2.11 — Anesthesia record (airway, intraoperative vitals) |
| `or_rvs_procedures` | OR/Surgical | 🔴 | §2.11 — RVS code capture for PhilHealth claims |
| `blood_bank_requests` | Lab/Blood Bank | 🔴 | §2.9 — Digital IPD cross-match approval |
| `transfusion_records` | Lab/Blood Bank | 🔴 | §2.9 — Barcode bedside matching (patient + product + order) |
| `blood_products` | Lab/Blood Bank | 🔴 | §2.9 — Blood product inventory for transfusion |
| `cf5_drg_claims` | RCM/Billing | 🔴 | §2.13 — CF5 DRG Shadow Billing |
| `malasakit_applications` | RCM/Billing | 🔴 | §2.13 — Malasakit Center tracking, MSW CoE |
| `esoa_documents` | RCM/Billing | 🔴 | §2.13 — Electronic Statement of Account XML |
| `konsulta_capitations` | RCM/Billing | 🔴 | §2.13 — Konsulta Capitation enrollment |
| `z_benefit_cases` | RCM/Billing | 🔴 | §2.13 — Z-Benefits case tracking |
| `telemedicine_sessions` | Telemedicine | ❌ | §2.14 — Virtual encounters |
| `telemedicine_prescriptions` | Telemedicine | ❌ | §2.14 — Digitally signed e-prescriptions |
| `nutrition_assessments` | Dietitian | ❌ | §1 (Dietitian role) |
| `nutrition_orders` | Dietitian | ❌ | §1 — HL7 FHIR NutritionOrder |
| `meal_plans` | Dietitian | ❌ | §1 — Therapeutic meal plans |
| `appointment_slots` | Scheduler | ❌ | §1 (Scheduler role) |
| `appointments` | Scheduler | ❌ | §1 — Booking/check-in |
| `clinic_templates` | Scheduler | ❌ | §1 — Clinic schedule templates |
| `opd_queue_entries` | ADT/OPD | ❌ | §6 Flow 1 — OPD queue numbers, ARTA tracking |
| `sla_tracking_events` | ARTA | ❌ | §6 — Citizens Charter SLA timestamps |
| `gate_passes` | ADT/Billing | ❌ | §6 Flow 5 — Discharge gate pass after payment |
| `birth_certificates` | Records | ❌ | §1 (Registrar) — Local Civil Registry integration |
| `death_certificates` | Records | ❌ | §1 (Registrar) — Local Civil Registry integration |
| `medical_record_requests` | HIM | ❌ | §6 Flow 7 — Document requests with DPA consent |
| `chart_deficiencies` | HIM | ❌ | §1 (HIM Coder) — Chart deficiency tracking |
| `msw_evaluations` | MSW | ❌ | §1 (MSW) — Financial assistance evaluations |
| `snomed_ct_codes` | Formulary | ❌ | §4.1 — SNOMED CT terminology |

---

## Section 4 — Module-by-Module Gap Analysis

### 4.1 ADT (Admission, Discharge, Transfer) & Bed Management

**TOR Requirement:** Patient identity/visit lifecycle, BOR calculation (midnight census formula), Gross/Net Death Rates (<48h vs >48h).

| Feature | Status | File(s) | Gap Details |
|---------|--------|---------|-------------|
| Patient registration (MRN) | ✅ | `patients.controller.ts`, `patients.service.ts` | |
| Encounter creation (IPD/OPD/ED) | ✅ | `encounters.controller.ts` | |
| Bed assignment | ✅ | `beds.service.ts` | |
| Ward/bed schema | ✅ | `schema/core.ts:47–96` | |
| Transfer (ward-to-ward) | ✅ | `schema/core.ts:185–219` (encounterTransfers) | |
| BOR snapshot table | ✅ | `schema/core.ts:222–242` (bedCensusSnapshots) | |
| BOR midnight census calculation logic | 🟡 | `reporting.service.ts` | Snapshot table exists; scheduled midnight job to calculate BOR using DOH formula not implemented. Needs a cron job that fires at midnight. |
| Gross/Net Death Rate (<48h vs >48h) | ❌ | — | No logic to compute death rates from `encounters.admissionDatetime` vs `encounters.dischargeDatetime` where `disposition = 'deceased'`. Needs a computed metric in reporting. |
| ARTA SLA timestamps | ❌ | — | No `sla_tracking_events` table. Bed status changes are not timestamped for Citizens Charter SLA reports. |
| Gate pass issuance | ❌ | — | No `gate_passes` table. TOR Flow 5 requires a digital gate pass after patient settles net balance. |
| Birth/Death Certificate generation | ❌ | — | No tables or workflow. Registrar requires Local Civil Registry integration with data inheritance. |
| OPD queue numbering | ❌ | — | No `opd_queue_entries` table. TOR Flow 1 requires a queue number for each clinic. |

---

### 4.2 Emergency Department (ED) & Tele-Triage

**TOR Requirement:** Pre-Encounter state, Trauma Alias, triage scales, chart merging, OECB disposition tag.

| Feature | Status | File(s) | Gap Details |
|---------|--------|---------|-------------|
| Pre-Encounter / Trauma Alias | ✅ | `schema/core.ts:98–134`, `ed.controller.ts` | |
| Triage scales (ESI/ATS/CTAS) | ✅ | `schema/core.ts:110–111` | |
| Trauma Alias chart merge to MRN | ✅ | `ed.service.ts`, `features/ed/components/merge-dialog.tsx` | |
| OECB eligibility flag | 🟡 | `schema/core.ts:170` (`oecbEligible` field) | Field exists on `encounters` table. Auto-routing to RCM for outpatient billing **not implemented** — no trigger from OECB flag to billing module. |
| ED tracking board UI | ✅ | `features/ed/components/tracking-board.tsx` | |
| Tele-Triage management | ❌ | — | No telemedicine/tele-triage integration. Virtual triage via video platform not addressed. |

---

### 4.3 Clinical Documentation

**TOR Requirement:** Note templates (SOAP, FPE, discharge summary), signing, amendments, DPA consent, PhilHealth FPE structured templates.

| Feature | Status | File(s) | Gap Details |
|---------|--------|---------|-------------|
| Note templates (5 categories) | ✅ | `schema/clinical.ts:11–36` | Categories: admission, progress, consultation, discharge_summary, fpe |
| Clinical note authoring/signing | ✅ | `clinical-docs.controller.ts`, `clinical-docs.service.ts` | |
| Note addenda (amendments) | ✅ | `schema/clinical.ts:79–98` | |
| Consent records | ✅ | `schema/clinical.ts:100–139` | Types: general, procedure, research, blood_transfusion, surgery |
| PhilHealth Annex A/B digital signatures | ❌ | — | `consentRecords` lacks a `philhealth_annex_type` discriminator. MSW capture of Annex A (Informed Consent) and Annex B (Member Empowerment) is not modeled separately. |
| DPA consent prior to data transmission | 🟡 | `consentRecords.consentType = 'general'` | Table exists; enforcement logic (block data export until consent captured) is not wired. |
| Structured FPE template (PhilHealth) | 🟡 | `noteTemplates.category = 'fpe'` | The category exists but no standardized FPE structured JSON schema is defined in `noteTemplates.sections`. The specific DOH/PhilHealth FPE fields are not enforced. |
| ICD-10 code on discharge summary | 🟡 | `problems.icd10Code` | Problems have ICD-10 codes, but discharge summary note type does not have a structured `finalDiagnosis` array with mandatory ICD-10. HIM coding workflow is absent. |

---

### 4.4 CPOE & Electronic Prescribing (FDA/PDEA Compliant)

**TOR Requirement:** Generics Act enforcement, FDA e-Rx mandates (PRC + PTR auto-append), PDEA S-2 validation, 90-day supply tranche splitting, lean CDS.

| Feature | Status | File(s) | Gap Details |
|---------|--------|---------|-------------|
| Medication orders (CPOE) | ✅ | `schema/orders.ts:12–74`, `orders.service.ts` | |
| Generic name primary / brand subordinate | 🟡 | `medicationOrders.genericName` (required), `.brandName` (optional) | **Schema** enforces generic-first. **UI enforcement** (hard block on brand-first ordering) is NOT implemented in `features/orders/components/create-med-order-dialog.tsx`. |
| PRC + PTR auto-appended to prescription | ✅ | `schema/orders.ts:223–226` (`prescriptions.prcLicenseNumber`, `.ptrNumber`) | Fields exist and are populated from `staffProfiles`. |
| PDEA S-2 validation before List A orders | ❌ | — | No service-side check that `staffProfiles.pdeaS2License` is valid and unexpired before allowing a controlled substance order. `rbac.service.ts:555–583` has license status but CPOE does not call it. |
| 30-day tranche splitting (Schedule IV) | 🟡 | `medicationOrders.pdeaTrancheNumber`, `.pdeaTrancheTotal` | Schema fields exist. The **business logic** to detect 90-day orders and automatically split into 3 × 30-day tranches is NOT implemented in `orders.service.ts`. |
| "No Refill" inscription for Schedule IV | ❌ | — | No field on `prescriptions` for a refill prohibition flag. |
| Allergy CDS blocking | ❌ | — | `medicationOrders.cdsAlerts` (jsonb) field exists. No service logic queries `allergies` table to block orders with active allergen conflicts at order creation time. |
| Formulary constraint CDS | ❌ | — | No check against `formularyItems.isRestricted` at order time. |
| High-Alert Medication double-verification | 🟡 | `formularyItems.isHighAlert` | Flag exists. No workflow requiring a second pharmacist/nurse acknowledgement before MAR administration. |
| Lab orders (CPOE) | ✅ | `schema/orders.ts:76–121` | LOINC code field present. |
| Imaging orders (CPOE) | ✅ | `schema/orders.ts:123–169` | |
| Order verification (Pharmacist) | ✅ | `schema/orders.ts:172–196`, `orderVerifications` | |

---

### 4.5 Maternal, Neonatal, and Newborn Screening

**TOR Requirement:** NBS digital logbook (24–48 hr rule), parental consent/waiver, positive referral tracking, FMDRF/FNDRF on maternal/neonatal death.

**Status: ENTIRE MODULE MISSING** 🔴

| Feature | Status | Gap Details |
|---------|--------|-------------|
| NBS logbook table | ❌ | No `newborn_screenings` table. Cannot track time-of-birth vs time-of-screening. |
| 24–48 hour rule enforcement | ❌ | No logic exists. |
| Electronic parental consent/waiver | ❌ | No `nbs_consents` table. The `consentRecords` table is for general clinical consent and lacks NBS-specific fields (waiver reason, parental refusal). |
| Positive result referral pathway | ❌ | No `nbs_positive_referrals` table. |
| MNDRS trigger on maternal death | ❌ | No `maternal_death_reports` (FMDRF) table or trigger when `encounters.disposition = 'deceased'` for a female patient of reproductive age. |
| MNDRS trigger on neonatal death | ❌ | No `neonatal_death_reports` (FNDRF) table or trigger for neonate death dispositions. |

**Recommendation:** Create `packages/db/src/schema/maternal.ts` with tables: `newborn_screenings`, `nbs_consents`, `nbs_positive_referrals`, `maternal_death_reports`, `neonatal_death_reports`. Add a service hook in `encounters.service.ts` to trigger MNDRS form on death discharge.

---

### 4.6 Nursing Module & MAR/TAR

**TOR Requirement:** Vitals, flowsheets, MAR/TAR, I/O, shift handoff, HAI tagging for DOH AHSR.

| Feature | Status | File(s) | Gap Details |
|---------|--------|---------|-------------|
| Vital signs with NEWS calculation | ✅ | `schema/nursing.ts:12–50` | NEWS score and risk level fields present. |
| Flowsheet entries | ✅ | `schema/nursing.ts:52–79` | |
| MAR (Medication Administration Record) | ✅ | `schema/nursing.ts:81–121` | PRN reason, status, administered dose/route. |
| TAR (Treatment Administration Record) | ✅ | `schema/nursing.ts:123–155` | |
| I/O tracking | ✅ | `schema/nursing.ts:157–187` | |
| Shift handoff | ✅ | `schema/nursing.ts:189–217` | |
| HAI tagging (VAP, BSI, UTI, SSI, C.diff) | ✅ | `schema/nursing.ts:219–256` | Types: clabsi, cauti, vap, ssi, cdiff. |
| Care plan documentation | ❌ | — | No `care_plans` or `care_plan_interventions` tables. TOR mentions "manages care plans". |
| NBS protocol administration | ❌ | — | NBS module does not exist (see §4.5). |
| High-alert med double-verification workflow | ❌ | — | See §4.4 — no second-check workflow in MAR. |

---

### 4.7 Problems & Allergies

**TOR Requirement:** Longitudinal problem list with ICD-10, active allergy blocking in CPOE.

| Feature | Status | File(s) | Gap Details |
|---------|--------|---------|-------------|
| Problem list with ICD-10 | ✅ | `schema/clinical.ts:141–170` | |
| Allergy list with severity | ✅ | `schema/clinical.ts:172–207` | |
| Frontend tab | ✅ | `features/problems-allergies/` | |
| Active allergy CPOE blocking | ❌ | — | The `orders.service.ts` does NOT query the `allergies` table to block orders. The `medicationOrders.cdsAlerts` jsonb field is never populated with allergy alerts. |

---

### 4.8 Vitals & Flowsheets

| Feature | Status | Gap Details |
|---------|--------|-------------|
| Structured vitals (BP, HR, RR, Temp, SpO2, pain, weight, height) | ✅ | |
| Automated NEWS score | ✅ | `vitalSigns.newsScore`, `.newsRiskLevel` |
| Nutrition assessment (Dietitian) | ❌ | No `nutrition_assessments` table. Malnutrition risk status field absent. |
| HL7 FHIR NutritionOrder | ❌ | No `nutrition_orders` table. Cannot generate FHIR NutritionOrder resource. |

---

### 4.9 Laboratory & Blood Bank Management

**TOR Requirement:** LIS integration, critical result flagging, digital IPD cross-match approvals, barcode bedside matching.

| Feature | Status | File(s) | Gap Details |
|---------|--------|---------|-------------|
| Lab orders with LOINC codes | ✅ | `schema/orders.ts:76–121` | |
| Lab result ingestion (manual entry) | 🟡 | `labOrders.results` (jsonb) | Field exists. No structured result schema or critical value detection logic. |
| Critical result flagging | 🟡 | `surveillanceFlags` in reporting | Surveillance flags exist but are tied to clinical notes, not lab results. No critical lab value threshold configuration. |
| Blood Bank — cross-match requests | ❌ | — | No `blood_bank_requests` table. |
| Transfusion record | ❌ | — | No `transfusion_records` table. |
| Barcode bedside matching (patient + product + order) | ❌ | — | No barcode scanning workflow or `blood_products` inventory table. |
| LIS integration API | ❌ | — | No HL7 LIS message ingestion endpoint. |

**Note:** Blood Bank is a patient safety module — a full transfusion reaction incident is possible without proper bedside barcode matching. This must be prioritized.

---

### 4.10 RIS/PACS Link

**TOR Requirement:** Attach radiology reports; secure URL link to external PACS viewer.

| Feature | Status | File(s) | Gap Details |
|---------|--------|---------|-------------|
| Imaging orders | ✅ | `schema/orders.ts:123–169` | |
| Report text attachment | ✅ | `imagingOrders.report` (text) | |
| Structured results (jsonb) | ✅ | `imagingOrders.structuredResults` | |
| External PACS viewer URL | ❌ | — | No `pacs_url` field on `imagingOrders`. Should store a signed URL to the PACS system per study. |
| Critical imaging result routing | ❌ | — | No workflow to flag critical imaging findings and route to ordering clinician's dashboard. |

---

### 4.11 Operating Room and Surgical Services

**TOR Requirement:** Operation Record, Anesthesia Record, RVS code capture for PhilHealth claims.

**Status: ENTIRE MODULE MISSING** 🔴

| Feature | Status | Gap Details |
|---------|--------|-------------|
| OR case scheduling table | ❌ | No `or_cases` table. |
| Operation Record | ❌ | No structured template for operative technique, surgeon personnel, start/end timestamps. |
| Anesthesia Record | ❌ | No `anesthesia_records` table. No airway management or intraoperative vitals tracking. |
| RVS code mapping for surgical procedures | ❌ | `rvs_codes` reference table exists in `schema/formulary.ts` but there is no linkage from OR cases to RVS codes for PhilHealth claims. |
| Routing to RCM for procedural claims | ❌ | Without OR module, surgical cases cannot be routed to CF4/CF5 billing. |

**Recommendation:** Create `packages/db/src/schema/surgical.ts` with: `or_cases`, `or_personnel`, `anesthesia_records`, `or_rvs_procedures`. Link `or_rvs_procedures` → `rvsCodes` and `cf4Claims`/`cf5_drg_claims`.

---

### 4.12 Pharmacy Verify (Basic)

**TOR Requirement:** Clinical safety check — interactions, dosing vs weight/labs — before MAR activation. Excludes inventory.

| Feature | Status | File(s) | Gap Details |
|---------|--------|---------|-------------|
| Pharmacist order verification | ✅ | `orderVerifications` table, `orders.service.ts` | Approval/rejection/modification workflow exists. |
| Weight-based dosing check | ❌ | — | No logic compares `medicationOrders.dose` against `vitalSigns.weight`. |
| Lab-based dosing check | ❌ | — | No logic compares against `labOrders.results` (e.g., renal dosing for creatinine). |
| Drug-drug interaction check | ❌ | — | No interaction database or check logic in `orders.service.ts`. |

---

### 4.13 Advanced RCM, eClaims & PhilHealth Integration

**TOR Requirement:** Automated CF4 extraction, CF5 DRG Shadow Billing, eSOA, CEWS eligibility, Konsulta Capitation, Malasakit tracking, Z-Benefits.

| Feature | Status | File(s) | Gap Details |
|---------|--------|---------|-------------|
| CF4 claim table | ✅ | `schema/billing.ts:172–208` | |
| CF4 draft generation (data extraction) | ✅ | `billing.service.ts:421–531` | Extracts chief complaint, vitals, problems, clinical notes. |
| CF4 XML format (PhilHealth eClaims spec) | ❌ | — | `submissionData` is a jsonb blob. PhilHealth requires strict XML format. No XML serializer implemented. |
| CF5 / DRG Shadow Billing | ❌ | — | No `cf5_drg_claims` table. DRG grouper logic absent. |
| eSOA (Electronic Statement of Account) | ❌ | — | No XML-format eSOA generator. |
| PhilHealth CEWS eligibility | 🟡 | `eligibilityChecks` table, `billing.service.ts:560–594` | **Stubbed** — returns mock data. Real CEWS web service call not implemented. |
| Malasakit Center tracking | ❌ | — | No `malasakit_applications` table. MSW module does not exist. |
| Konsulta Capitation | ❌ | — | No `konsulta_capitations` table. |
| Z-Benefits case management | ❌ | — | No `z_benefit_cases` table. |
| Charge auto-capture from orders | 🟡 | `charges.sourceType` (`auto_medication`, `auto_lab`, `auto_imaging`) | Source type field defined but no event hooks from `orders.service.ts` to auto-create charges when orders are placed. |
| Charge freeze on "May Go Home" order | ❌ | — | No `discharge_orders` concept. Charges not frozen automatically when a clinician places a discharge order. |

---

### 4.14 Telemedicine Integration

**TOR Requirement:** Virtual encounters natively logged; lightweight API links to Zoom/Teams; electronic clinical abstract and e-prescription.

**Status: ENTIRE MODULE MISSING** ❌

| Feature | Status | Gap Details |
|---------|--------|-------------|
| Telemedicine session table | ❌ | No `telemedicine_sessions` table. |
| Video platform integration (Zoom/Teams) | ❌ | No API link to video platforms. |
| Virtual encounter logging in EMR | ❌ | `encounters.encounterType` could include `"telemedicine"` but does not. |
| E-prescription from telemedicine | ❌ | No workflow for digitally signed e-prescriptions from virtual consults. |

---

## Section 5 — Statutory and Regulatory Reporting Engine

**TOR Requirement:** AHSR (BOR, death rates, morbidity/mortality top 10, HAI metrics), PIDSR Category 1/2 notifiable disease detection and transmission.

| Feature | Status | File(s) | Gap Details |
|---------|--------|---------|-------------|
| PIDSR cases table | ✅ | `schema/reporting.ts:12–55` | |
| Surveillance flags | ✅ | `schema/reporting.ts:57–86` | |
| AHSR snapshots | ✅ | `schema/reporting.ts:88–110` | |
| Reporting service | ✅ | `reporting.service.ts` | Partial implementation — queries exist for admissions, deaths, HAI. |
| PIDSR Category 1 (immediate) detection | 🟡 | `surveillanceFlags` | Flag detection exists but no automated ICD-10/keyword scan that fires Category 1 immediate alerts (cholera, plague, etc.) within 24 hours. |
| PIDSR Category 2 (weekly) aggregation | 🟡 | `pidsrCases` | Cases can be manually created; no automated weekly report generation to DOH PIDSR portal. |
| AHSR DOH portal export | ❌ | — | No export-to-DOH API integration. AHSR data can be viewed in `reporting-dashboard.tsx` but cannot be submitted to the DOH annual portal. |
| BOR midnight census cron job | ❌ | — | `bedCensusSnapshots` table exists but no scheduled job fills it nightly. |
| Gross/Net Death Rate by 48h threshold | ❌ | — | No computed metric. Needs query on `encounters` where `disposition='deceased'` differentiating `dischargeDatetime - admissionDatetime < 48h`. |
| Top 10 morbidity/mortality (ICD-10) | 🟡 | `reporting.service.ts` | Partial — problems have ICD-10 codes but finalized ICD-10 from discharge summaries is not a distinct field requiring HIM coding sign-off. |
| HAI surveillance metrics in AHSR | 🟡 | `haiTags` | HAI data is captured but not yet aggregated into AHSR snapshot data. |

---

## Section 6 — User Role Coverage

| TOR Role | Backend Module | Frontend Pages | Status | Critical Gaps |
|----------|---------------|----------------|--------|---------------|
| System Admin | RBAC module | `/admin/users`, `/admin/roles` | ✅ | |
| Registrar | Patients, Encounters, ADT | `/patients/register`, `/patients/search`, `/beds` | 🟡 | Missing: Birth/Death Certificate generation, Local Civil Registry integration, OPD queue management |
| Medical Social Worker (MSW) | None | None | ❌ | CoE issuance, Malasakit liaison, PhilHealth Annex A/B digital signatures — entire module absent |
| Triage Officer | ED module | `/ed` | ✅ | Tele-triage absent |
| Clinician / Surgeon / Anesthesiologist | Clinical Docs, CPOE, Orders | `/patients/[id]/encounters/[id]/documentation`, `/orders` | 🟡 | Generics Act UI enforcement, PDEA S-2 gate, OR/Anesthesia module absent |
| Nurse / Midwife | Nursing module | `/patients/[id]/encounters/[id]/nursing` | 🟡 | Care plans absent, NBS protocols absent, high-alert double-check absent |
| Clinical Dietitian / Nutritionist | None | None | ❌ | Nutrition assessments, NutritionOrders, meal plans — entire module absent |
| Pharmacist | Order verification | Partial (within orders tab) | 🟡 | Weight/lab-based dosing checks absent, drug interaction checking absent |
| Lab Technologist | Lab orders (manual result entry) | Within orders tab | 🟡 | No dedicated lab dashboard, blood bank absent |
| Radiology Staff | Imaging orders | Within orders tab | 🟡 | No PACS URL field, no critical result routing |
| Scheduler | None | None | ❌ | Clinic templates, appointment slots, queue management — entire module absent |
| Biller | Billing module | `/patients/[id]/encounters/[id]/billing` | 🟡 | CF4 XML, CF5 DRG, eSOA, Malasakit, Konsulta absent |
| HIM Coder | None (partial via problems) | None dedicated | ❌ | Chart deficiencies, final ICD-10 coding sign-off, CF4 extraction sign-off absent |
| Statutory Reporting Officer | Reporting module | `/reporting` | 🟡 | PIDSR auto-detection, DOH portal submission, AHSR export absent |
| Patient / Proxy (Read-only) | None | None | ❌ | Secure read-only patient portal with daily summaries not built |
| Auditor / Privacy Officer | Audit module | `/audit` | ✅ | |
| Break-Glass Clinician | Audit module | `/audit/break-glass` | ✅ | |

---

## Section 7 — API Contracts Inventory

All oRPC contracts are in `packages/contracts/src/modules/v1/`.

| Contract File | Status | Notes |
|--------------|--------|-------|
| `audit/audit.contract.ts` | ✅ | |
| `beds/beds.contract.ts` | ✅ | |
| `billing/billing.contract.ts` | ✅ | CF4, payments, charges present |
| `clinical-docs/clinical-docs.contract.ts` | ✅ | |
| `ed/ed.contract.ts` | ✅ | |
| `encounters/encounters.contract.ts` | ✅ | |
| `formulary/formulary.contract.ts` | ✅ | |
| `notifications/notifications.contract.ts` | ✅ | |
| `nursing/nursing.contract.ts` | ✅ | |
| `orders/orders.contract.ts` | ✅ | |
| `patients/patients.contract.ts` | ✅ | |
| `problems-allergies/problems-allergies.contract.ts` | ✅ | |
| `rbac/rbac.contract.ts` | ✅ | |
| `reporting/reporting.contract.ts` | ✅ | |
| `or/or.contract.ts` | ❌ | Not created — OR/Surgical module |
| `maternal/maternal.contract.ts` | ❌ | Not created — NBS/MNDRS module |
| `msw/msw.contract.ts` | ❌ | Not created — MSW module |
| `scheduler/scheduler.contract.ts` | ❌ | Not created — Scheduler module |
| `telemedicine/telemedicine.contract.ts` | ❌ | Not created — Telemedicine module |
| `dietitian/dietitian.contract.ts` | ❌ | Not created — Dietitian module |
| `him/him.contract.ts` | ❌ | Not created — HIM Coder module |
| `fhir/fhir.contract.ts` | ❌ | Not created — FHIR R4 API layer |

---

## Section 8 — Prioritized Implementation Roadmap

### Priority 1 — Clinical Safety & Legal Compliance (Immediate)

These gaps create **legal liability or patient safety risk** and must be closed before any production rollout.

| # | Task | Effort | Notes |
|---|------|--------|-------|
| 1.1 | **CPOE: Allergy CDS blocking** — Query `allergies` table in `orders.service.ts` before inserting `medicationOrders`. Populate `cdsAlerts` and throw a blocking error for severe allergies. | Medium | Backend |
| 1.2 | **CPOE: PDEA S-2 gate** — In `orders.service.ts`, validate `staffProfiles.pdeaS2License` and `pdeaS2Expiry` before allowing `isControlledSubstance = true` orders. | Small | Backend |
| 1.3 | **CPOE: 30-day tranche splitting** — Implement business logic to split orders with `durationDays > 30` and `isControlledSubstance = true` into `pdeaTrancheTotal` tranches. Generate a separate prescription per tranche with "No Refill" flag. | Medium | Backend |
| 1.4 | **CPOE: Generics Act UI enforcement** — In `features/orders/components/create-med-order-dialog.tsx`, force generic name selection first. Brand name must be visually subordinated and labeled. | Small | Frontend |
| 1.5 | **Blood Bank module** — Create `packages/db/src/schema/blood-bank.ts` with `blood_bank_requests`, `blood_products`, `transfusion_records`. Implement cross-match approval workflow. | Large | Backend + DB |
| 1.6 | **NBS/Maternal module** — Create `packages/db/src/schema/maternal.ts`. Add MNDRS death triggers in `encounters.service.ts`. | Large | Backend + DB |

### Priority 2 — PhilHealth Revenue & Licensing Compliance (High)

These gaps prevent hospital reimbursement and DOH licensing renewal.

| # | Task | Effort | Notes |
|---|------|--------|-------|
| 2.1 | **CF4 XML serializer** — Implement a PhilHealth-compliant XML generator from `cf4Claims.submissionData`. Must match PhilHealth eClaims XML schema exactly. | Large | Backend |
| 2.2 | **CF5 / DRG Shadow Billing** — Create `cf5_drg_claims` table. Implement DRG grouper logic (or integrate with a PhilHealth DRG API). | Very Large | Backend + DB |
| 2.3 | **OR/Surgical module** — Create `packages/db/src/schema/surgical.ts`, backend module, contracts, and frontend pages for Operation Record and Anesthesia Record. Link RVS codes to CF4/CF5. | Very Large | Full-stack |
| 2.4 | **CEWS real integration** — Replace the stub in `billing.service.ts:560` with real PhilHealth Eligibility Web Service API calls. | Medium | Backend |
| 2.5 | **Malasakit Center tracking** — Create `malasakit_applications` table and MSW module. | Large | Backend + DB |
| 2.6 | **eSOA XML generation** — Create `esoa_documents` table. Implement XML-format eSOA per PhilHealth spec. | Large | Backend |
| 2.7 | **BOR midnight cron job** — Schedule a nightly job that calculates BOR from the midnight census and inserts into `bedCensusSnapshots`. | Small | Backend |
| 2.8 | **Charge auto-capture** — Add service hooks in `orders.service.ts` to auto-insert `charges` when lab/med/imaging orders are placed. | Medium | Backend |
| 2.9 | **Charge freeze on discharge order** — Implement a `discharge_orders` concept; auto-freeze charges when clinician places a discharge order. | Medium | Backend |

### Priority 3 — Regulatory Reporting & Completeness (Medium)

| # | Task | Effort | Notes |
|---|------|--------|-------|
| 3.1 | **PIDSR Category 1 automated detection** — Implement ICD-10 scan on `problems` at finalization to auto-generate `pidsrCases` for notifiable disease codes. | Medium | Backend |
| 3.2 | **AHSR DOH portal export** — Implement export endpoint that generates AHSR in DOH-required format (CSV/XML) for annual submission. | Medium | Backend |
| 3.3 | **Gross/Net Death Rate computation** — Add a reporting query differentiating deaths < 48h vs ≥ 48h from admission. Expose in `reporting.service.ts`. | Small | Backend |
| 3.4 | **HIM Coder module** — Build chart deficiency workflow, final ICD-10 coding sign-off, CF4 data extraction approval. | Large | Full-stack |
| 3.5 | **ARTA SLA tracking** — Create `sla_tracking_events` table. Hook into every status change (encounter creation, bed assignment, discharge, etc.) to timestamp for Citizens Charter reports. | Medium | Backend |
| 3.6 | **Gate pass system** — Create `gate_passes` table. Trigger gate pass issuance when invoice is marked `paid`. | Small | Backend + Frontend |
| 3.7 | **Top 10 morbidity/mortality (ICD-10)** — Require HIM-coded discharge ICD-10 as the authoritative source for AHSR top-10 reporting. | Medium | Backend |

### Priority 4 — Missing Modules (Future Sprints)

| # | Module | Effort | TOR Reference |
|---|--------|--------|---------------|
| 4.1 | Scheduler module (clinic templates, appointments, OPD queue) | Large | §1 (Scheduler role), §6 Flow 1 |
| 4.2 | Clinical Dietitian module (nutrition assessments, NutritionOrders, meal plans) | Large | §1 (Dietitian role) |
| 4.3 | Patient/Proxy portal (read-only, static daily summaries) | Medium | §1 (Patient/Proxy role) |
| 4.4 | Telemedicine module (session logging, Zoom/Teams link, e-prescription) | Large | §2.14 |
| 4.5 | Medical Records/HIM — document request workflow, birth/death certificates | Large | §6 Flow 7, §1 (Registrar) |
| 4.6 | HL7 FHIR R4 API layer (`@repo/fhir` package, NHDR integration) | Very Large | §4.1 |
| 4.7 | Offline Mode / PWA (Service Worker, IndexedDB, sync queue) | Very Large | §4.2 |
| 4.8 | SNOMED CT code set (import, search, mapping to ICD-10) | Medium | §4.1 |
| 4.9 | Konsulta Capitation + Z-Benefits management | Large | §2.13 |

---

## Section 9 — Quick Wins (< 1 Sprint)

These are small, high-value fixes that can be done immediately.

| Task | File | Change |
|------|------|--------|
| Add `pacs_url` field to `imagingOrders` | `packages/db/src/schema/orders.ts` | Add `pacsUrl: t.text("pacs_url")` |
| Add `philhealth_annex_type` to `consentRecords` | `packages/db/src/schema/clinical.ts` | Extend `consentType` to include `"philhealth_annex_a"` and `"philhealth_annex_b"` |
| Add `no_refill` flag to `prescriptions` | `packages/db/src/schema/orders.ts` | Add `noRefill: t.boolean("no_refill").notNull().default(false)` |
| Add `telemedicine` to `encounters.encounterType` | `packages/db/src/schema/core.ts:149` | Extend type union to include `"telemedicine"` |
| PDEA S-2 license validation in CPOE | `apps/backend/src/modules/v1/orders/orders.service.ts` | Call `rbac.service.getLicenseStatus()` at order creation |
| OECB routing logic | `apps/backend/src/modules/v1/encounters/encounters.service.ts` | When discharge with `oecbEligible = true`, auto-create billing task |

---

## Section 10 — Non-Functional Requirement Gaps

| Requirement | Status | TOR Reference | Implementation Path |
|-------------|--------|---------------|---------------------|
| HL7 FHIR R4 API | ❌ | §4.1 | Create `packages/fhir/` package. Map Drizzle schema to FHIR resources (Patient, Encounter, Observation, MedicationRequest, etc.). Expose as `GET /api/v1/fhir/[resource]` endpoints. |
| Offline Mode | ❌ | §4.2 | Add `next-pwa` to `apps/web/`. Implement a Service Worker that caches patient summary pages. Sync queue via IndexedDB for offline-entered vitals/notes. |
| Data Privacy Act audit trails | ✅ | §4.2 | Break-glass, audit logs, and consent records are implemented. |
| Least-privileged RBAC | ✅ | §4.2 | `rbac.guard.ts` enforces module+action permissions. |
| ARTA Citizens Charter SLA tracking | ❌ | §6 | Create `sla_tracking_events` table. Intercept all status changes via NestJS lifecycle hooks or service decorators. |
| SNOMED CT | ❌ | §4.1 | Import SNOMED CT Philippine Release. Add `snomed_ct_concepts` table to `schema/formulary.ts`. |
| ERP boundary (no supply chain in EMR) | ✅ | §4.3 | The schema correctly excludes inventory/supply chain. The `formularyItems` table focuses on clinical use only. |

---

## Appendix A — File Quick Reference

| Module | Backend Service | Schema File | Contracts | Frontend Feature |
|--------|----------------|-------------|-----------|-----------------|
| RBAC | `modules/v1/rbac/rbac.service.ts` | `schema/rbac.ts` | `modules/v1/rbac/` | `features/admin/` |
| Patients | `modules/v1/patients/patients.service.ts` | `schema/core.ts` | `modules/v1/patients/` | `features/patients/` |
| Encounters | `modules/v1/encounters/encounters.service.ts` | `schema/core.ts` | `modules/v1/encounters/` | `features/encounters/` |
| ED | `modules/v1/ed/ed.service.ts` | `schema/core.ts` | `modules/v1/ed/` | `features/ed/` |
| Beds | `modules/v1/beds/beds.service.ts` | `schema/core.ts` | `modules/v1/beds/` | `features/beds/` |
| Clinical Docs | `modules/v1/clinical-docs/clinical-docs.service.ts` | `schema/clinical.ts` | `modules/v1/clinical-docs/` | `features/clinical-docs/` |
| Orders/CPOE | `modules/v1/orders/orders.service.ts` | `schema/orders.ts` | `modules/v1/orders/` | `features/orders/` |
| Nursing | `modules/v1/nursing/nursing.service.ts` | `schema/nursing.ts` | `modules/v1/nursing/` | `features/nursing/` |
| Problems/Allergies | `modules/v1/problems-allergies/problems-allergies.service.ts` | `schema/clinical.ts` | `modules/v1/problems-allergies/` | `features/problems-allergies/` |
| Formulary | `modules/v1/formulary/formulary.service.ts` | `schema/formulary.ts` | `modules/v1/formulary/` | `features/formulary/` |
| Billing/RCM | `modules/v1/billing/billing.service.ts` | `schema/billing.ts` | `modules/v1/billing/` | `features/billing/` |
| Reporting | `modules/v1/reporting/reporting.service.ts` | `schema/reporting.ts` | `modules/v1/reporting/` | `features/reporting/` |
| Audit | `modules/v1/audit/audit.service.ts` | `schema/audit.ts` | `modules/v1/audit/` | `features/audit/` |
| **Missing: OR** | — | `schema/surgical.ts` (TBD) | `modules/v1/or/` (TBD) | `features/or/` (TBD) |
| **Missing: Maternal/NBS** | — | `schema/maternal.ts` (TBD) | `modules/v1/maternal/` (TBD) | `features/maternal/` (TBD) |
| **Missing: MSW** | — | `schema/msw.ts` (TBD) | `modules/v1/msw/` (TBD) | `features/msw/` (TBD) |
| **Missing: Scheduler** | — | `schema/scheduler.ts` (TBD) | `modules/v1/scheduler/` (TBD) | `features/scheduler/` (TBD) |
| **Missing: Telemedicine** | — | (extend `schema/core.ts`) | `modules/v1/telemedicine/` (TBD) | `features/telemedicine/` (TBD) |
| **Missing: Dietitian** | — | `schema/nutrition.ts` (TBD) | `modules/v1/dietitian/` (TBD) | `features/dietitian/` (TBD) |
| **Missing: HIM** | — | (extend `schema/clinical.ts`) | `modules/v1/him/` (TBD) | `features/him/` (TBD) |

---

*This document should be updated at the end of each sprint as gaps are closed.*
