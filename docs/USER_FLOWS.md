# User Flows

## Electronic Medical Record (EMR) System for Philippine Healthcare Facilities

> Derived from [USER_STORIES.md](USER_STORIES.md) and the Master EMR Terms of Reference.
> Each flow lists the step-by-step interaction and the wireframe pages required.
> Roles align with the seeded EMR accounts in `dev-quick-login.tsx`.

---

## Section A — User Management & Security

### A1. All Roles – Secure Login with 2FA

**User Flow**

1. Open App
2. Login Page
3. Enter Email & Password
4. Submit Credentials
5. System sends OTP / prompts authenticator code
6. Enter 2FA Code
7. System validates and creates session (DPA-compliant audit entry)
8. Redirect to Role-Based Home Dashboard

**Wireframe Pages**

- **Login Page** (email, password, "Forgot Password" link)
- **2FA Verification Page** (6-digit code input, "Resend" CTA)
- **Forgot Password Page** (email input, reset link flow)
- **Role-Based Home Dashboard** (routed per assigned role)

---

### A2. Administrator – Create User & Assign Role (RBAC)

**User Flow**

1. Login (A1)
2. Open Admin Console
3. Navigate to **User Management**
4. Click **"Add User"**
5. Enter Full Name, Email, Department, Role
6. Select Role from dropdown (Physician, Nurse, Registrar, etc.)
7. Optionally set sub-permissions / module access
8. Click **"Create"**
9. System emails activation link with temporary password
10. New user appears in **User Management List** with status "Pending Activation"

**Wireframe Pages**

- **Admin Console Dashboard**
- **User Management List** (search, filter by role, status badges)
- **Add/Edit User Form** (multi-step: Profile → Role → Permissions)
- **Role Assignment Page** (matrix of role × module permissions)
- **Activation Confirmation Modal**

---

### A3. Administrator – Configure Feature Flags & Modules

**User Flow**

1. Login (A1)
2. Open Admin Console
3. Navigate to **Feature Flags**
4. Toggle module ON/OFF (e.g., enable Telemedicine, disable Blood Bank for Level-1 facility)
5. Set environment scope (Staging / Production)
6. Click **"Save"**
7. System logs change in audit trail
8. Affected users see updated nav on next page load

**Wireframe Pages**

- **Feature Flag Dashboard** (toggle list grouped by module)
- **Module Configuration Page** (per-module settings, dependencies)
- **Save Confirmation Modal**

---

### A4. Administrator – Validate Clinician Licenses (PRC / PTR / PDEA S-2)

**User Flow**

1. Login (A1)
2. Navigate to **Clinician License Management**
3. Search for clinician
4. Click **"Add License"**
5. Select License Type (PRC / PTR / PDEA S-2)
6. Enter License Number, Issue Date, Expiry Date
7. Upload supporting document (PDF/image)
8. Click **"Verify"** → System cross-checks against registry (or marks pending review)
9. License Status updates to **"Verified"** or **"Pending"**
10. Clinician's CPOE & e-Rx capabilities are unlocked accordingly

**Wireframe Pages**

- **Clinician License Management Page** (list of clinicians, license badges)
- **License Verification Page** (form + document viewer)
- **License Expiry Alert Banner**

---

### A5. Physician – Break-Glass Emergency Access

**User Flow**

1. Login (A1)
2. Search for patient outside assigned panel
3. System blocks access and prompts **"Break-Glass Required"**
4. Click **"Request Emergency Access"**
5. Justification Capture Modal opens
6. Select Reason (Cardiac arrest, MVA, Code Blue, etc.)
7. Type free-text justification
8. Click **"Confirm Access"**
9. System grants temporary read access (timeboxed)
10. High-priority audit event fires to Auditor inbox
11. Access auto-expires; Privacy Officer reviews next business day

**Wireframe Pages**

- **Patient Search Page** (with "Restricted" badge)
- **Break-Glass Access Request Page**
- **Justification Capture Modal** (reason dropdown + free text)
- **Temporary Access Banner** (countdown timer)

---

### A6. Auditor – Review Audit Trail & Break-Glass Events

**User Flow**

1. Login (A1)
2. Open **Audit Log Dashboard**
3. Filter by Date Range, User, Action Type, Severity
4. View list of events (read, write, break-glass, login failure)
5. Click event → Audit Detail Page opens
6. Review timestamps, IP address, accessed resources
7. For break-glass: open **Break-Glass Audit Report Page**
8. Verify justification appropriateness
9. Click **"Approve"**, **"Flag for Investigation"**, or **"Add Note"**
10. Export report (CSV / PDF) for DPA compliance file

**Wireframe Pages**

- **Audit Log Dashboard** (filters, severity color-coding)
- **Audit Detail Page** (timeline view, before/after diff)
- **Break-Glass Audit Report Page** (justification + reviewer action)
- **Export Modal**

---

### A7. Patient / Proxy – Patient Portal Access

**User Flow**

1. Open Patient Portal URL
2. Login Page (separate portal credentials)
3. 2FA Verification
4. Land on **Patient Summary Dashboard**
5. View read-only daily summary (vitals, diagnoses, meds, allergies)
6. Browse released documents (lab results, discharge summary)
7. Click **"Download"** to save PDF
8. Logout

**Wireframe Pages**

- **Patient Portal Login**
- **Patient Summary Dashboard** (cards: meds, allergies, recent visits)
- **Document Download Page** (filterable document list)

---

## Section B — Patient Registration & ADT

### B1. Registrar – Patient Registration & MRN Assignment

**User Flow**

1. Login (A1)
2. Open Registration Dashboard
3. Click **"New Patient"**
4. Enter Search criteria (Name, DOB, PhilHealth #) to dedupe
5. If no match → Click **"Create New"**
6. Patient Registration Form opens
7. Enter Demographics, Address, Civil Status, Contact, PhilHealth/HMO info
8. Click **"Save"**
9. System auto-generates unique MRN
10. Patient Profile Page opens with MRN displayed

**Wireframe Pages**

- **Registration Dashboard**
- **Patient Search Page** (dedupe results list)
- **Patient Registration Form** (multi-section)
- **Demographics Page** (post-save profile view)

---

### B2. Registrar – Encounter Creation

**User Flow**

1. Login (A1)
2. Open Patient Profile (B1)
3. Click **"New Encounter"**
4. Select Encounter Type (OPD / ER / IPD)
5. Select Department, Attending Provider
6. Enter Chief Complaint
7. Capture Consent (electronic signature)
8. Click **"Create Encounter"**
9. System generates Encounter ID, assigns queue number
10. Encounter appears in clinic queue

**Wireframe Pages**

- **Encounter Creation Page** (encounter type tabs)
- **Consent Capture Modal**
- **Encounter List Page** (active encounters per patient)

---

### B3. Registrar – Bed Assignment (Story 2.3)

**User Flow**

1. Login (A1)
2. Receive Admit Order from Physician (B2)
3. Open **Bed Management Dashboard**
4. View **Ward Map View** — green/red bed status
5. Filter by Ward Type (Private / Ward / ICU), Sex
6. Click bed → **"Reserve"** on **Bed Assignment Page**
7. Confirm patient identity
8. Bed status → **"Reserved"**
9. Trigger **PhilHealth Annex A signature capture** at admission (handoff to L9)
10. Notify Ward Nurse
11. Bed census auto-updates

**Wireframe Pages**

- **Bed Management Dashboard** (KPIs: occupancy %, available)
- **Bed Assignment Page**
- **Ward Map View** (visual grid of beds)

---

### B4. Registrar – Patient Transfer (Story 2.4)

**User Flow**

1. Login (A1)
2. Open patient encounter
3. Click **"Transfer Patient"**
4. **Transfer Request Page** opens
5. Select destination ward / bed / reason
6. Submit → notification sent to destination Ward Nurse
7. Source bed status → **"Pending Transfer"**
8. On physical arrival → Nurse opens **Receive Patient Page**
9. Click **"Receive"** → confirms identity & condition
10. Source bed → **"Dirty / For Cleaning"**; destination bed → **"Occupied"**

**Wireframe Pages**

- **Transfer Request Page** (origin → destination form)
- **Receive Patient Page** (acknowledgment screen)

---

### B5. Administrator – BOR Computation Review

**User Flow**

1. Login (A1)
2. Open **BOR Dashboard**
3. View current Bed Occupancy Rate (calculated via DOH midnight census)
4. Filter by Ward, Date Range
5. Review trend chart
6. Click **"Census Report"**
7. Export PDF for AHSR submission

**Wireframe Pages**

- **BOR Dashboard** (gauge, trend chart)
- **Census Report Page** (tabular daily census)
- **Export Modal**

---

### B6. Registrar – Administrative Discharge & Gate Pass

**User Flow**

1. Login (A1)
2. Open Patient Encounter (post "May Go Home" order)
3. Verify Pharmacy & Nurse clearance complete
4. Verify Billing settled (Biller sign-off)
5. Click **"Process Discharge"**
6. Capture Time of Discharge
7. System computes Length of Stay; if patient expired, system classifies as **Gross Death Rate** (≤48h from admission) or **Net Death Rate** (>48h) per DOH AHSR formula
8. Click **"Generate Gate Pass"**
9. Gate Pass printed / shown on patient phone QR
10. Bed status auto-transitions to **"Dirty / For Cleaning"** (B7)

**Wireframe Pages**

- **Discharge Processing Page** (clearance checklist)
- **Gate Pass Release Page** (QR + printable receipt)

---

### B7. Registrar – Post-Discharge Bed Cleaning Status

**User Flow**

1. Gate Pass triggered (B6)
2. Bed status auto-set to **"Dirty / For Cleaning"**
3. Housekeeping notified (dashboard ping)
4. Housekeeping logs in
5. Open **Housekeeping Confirmation Page**
6. Click **"Mark Cleaned"** with timestamp
7. Bed status → **"Available"**
8. Bed re-enters available pool in Ward Map View

**Wireframe Pages**

- **Bed Status Page** (status transitions log)
- **Housekeeping Confirmation Page** (mobile-friendly checklist)

---

### B8. Triage Officer – Trauma Alias / Pre-Encounter

**User Flow**

1. Login (A1)
2. Unidentified patient arrives via ER
3. Click **"Create Trauma Alias"**
4. System generates temporary MRN (e.g., TRAUMA-2026-04-25-001)
5. Capture available data (estimated age, sex, distinguishing marks)
6. Open chart immediately for clinical documentation
7. Once relative arrives → Registrar opens **Chart Merge Page**
8. Search for permanent MRN
9. Confirm merge → all clinical data inherits to permanent record
10. Trauma alias archived

**Wireframe Pages**

- **Trauma Alias Creation Page**
- **Chart Merge Page** (side-by-side compare, conflict resolution)

---

### B9. Registrar – Local Civil Registry Certificate Generation

**User Flow**

1. Login (A1)
2. Open Patient Profile of newborn / decedent
3. Navigate to **Birth Certificate Generation Page** (or Death Certificate)
4. System pre-fills inherited demographic & encounter data
5. Registrar verifies fields, fills LCR-specific items (place of birth and parents for births; date, place, cause, informant, and physician certification for deaths)
6. Attending Physician signs digitally
7. Registrar records payment and release checkpoints
8. Generate LCR-compliant PDF and XML artifacts after release
9. Tracking entry in **LCR Tracking Page** shows both birth and death certificates with artifact readiness, payment, release, submission status, acknowledgement/reference numbers, and last submission error
10. Submit to LCR (manual or API), then record submitted/acknowledged/rejected/error state

**Wireframe Pages**

- **Birth Certificate Generation Page** (form + preview)
- **Death Certificate Generation Page**
- **LCR Tracking Page** (submission status list)

FMDRF and FNDRF remain separate physician-owned death review forms under Death Reporting; they are not the registrar death certificate workflow.

---

## Section C — Emergency Department & Triage

### C1. Triage Officer – Standardized Triage Scoring

**User Flow**

1. Login (A1)
2. Patient arrives at ER
3. Click **"New Triage"**
4. Capture Vitals, Chief Complaint
5. System suggests Acuity Level via ESI/ATS/CTAS algorithm
6. Triage Officer confirms or overrides
7. Patient added to **Triage Queue Dashboard** with color-coded acuity
8. High-acuity (Level 1-2) auto-creates Trauma Alias (B8) and bypasses registration

**Wireframe Pages**

- **Triage Assessment Page** (vitals + acuity wizard)
- **Triage Queue Dashboard** (color-coded queue)

---

### C2. Physician – ER Disposition with OECB Tagging

**User Flow**

1. Login (A1)
2. Open ER patient chart
3. Complete clinical documentation
4. Click **"Disposition"**
5. Select disposition (Admit / Discharge / Transfer / Expired)
6. If Discharge → Optionally tag **"OECB Eligible"**
7. System routes case to RCM module with appropriate billing track
8. Print discharge instructions and e-Rx

**Wireframe Pages**

- **ER Disposition Page** (radio cards for disposition options)
- **OECB Tag Page** (eligibility checklist)

---

### C3. Nurse – ER Patient Tracker

**User Flow**

1. Login (A1)
2. Open **ER Tracker Board**
3. View all active ER patients (acuity, bed, elapsed time, owning provider)
4. Filter / sort by acuity, wait time
5. Click patient row → Patient Quick-View Modal opens
6. Review pending orders and last vitals
7. Take action (assign nurse, escalate, mark stalled)

**Wireframe Pages**

- **ER Tracker Board** (kanban or large-screen mode)
- **Patient Quick-View Modal**

---

### C4. Triage Officer – Tele-Triage Intake

**User Flow**

1. Login (A1)
2. Open **Tele-Triage Intake Page**
3. Receive inbound call/video request
4. Capture caller info (patient location, transport mode, ETA)
5. Conduct verbal/video assessment
6. Assign provisional acuity
7. Click **"Queue Inbound Patient"**
8. Patient added to **Inbound Patient Queue** with ETA countdown
9. ER team prepares resources (bed, code team)
10. On arrival → handoff to in-person triage (C1)

**Wireframe Pages**

- **Tele-Triage Intake Page** (video panel + assessment form)
- **Inbound Patient Queue** (ETA-sorted list)

---

## Section D — Clinical Documentation

### D1. Physician – Author SOAP Note (Story 4.1)

**User Flow**

1. Login (A1)
2. Open patient chart
3. Click **"New Note"**
4. **Template Selector Page** opens — choose SOAP / FPE / Progress / Admission
5. **Note Editor Page** opens with structured sections (Subjective, Objective, Assessment, Plan)
6. Author content (text, voice-to-text, dot-phrases)
7. Pull in vitals, labs, allergies via insert buttons
8. Click **"Save Draft"**
9. Note appears in chart timeline as Draft

**Wireframe Pages**

- **Template Selector Page**
- **Note Editor Page** (split view: editor + chart context)

---

### D2. Physician – Sign & Amend Clinical Note (Story 4.2)

**User Flow**

1. Login (A1)
2. Open draft note from chart
3. Click **"Sign"** → **Note Signing Page** displays final note
4. Confirm e-signature → note locks
5. Note appears with Signed badge in **Note History Page**
6. If correction needed → Click **"Amend"** → **Amendment Page** opens addendum-only editor
7. Author addendum (cannot edit original signed text)
8. Re-sign → addendum appended with timestamp
9. **Note History Page** shows full version trail

**Wireframe Pages**

- **Note Signing Page** (signature confirmation)
- **Amendment Page** (addendum-only editor)
- **Note History Page** (versioned notes list)

---

### D3. Physician – PhilHealth FPE Capture

**User Flow**

1. Login (A1)
2. Open Konsulta-eligible patient chart
3. Click **"New FPE"**
4. FPE Template Page opens (structured screening: lifestyle, BP, BMI, mental health)
5. Complete required fields
6. System validates Konsulta data completeness
7. Click **"Submit"**
8. FPE record archived; Konsulta capitation entry triggered in RCM

**Wireframe Pages**

- **FPE Template Page** (sectioned screening form)
- **FPE Submission Page** (review + submit)

---

### D4. Nurse – Electronic Consent Capture

**User Flow**

1. Login (A1)
2. Open patient encounter
3. Click **"Capture Consent"**
4. Consent Library Page opens (DPA, Procedure, Photography, Telemedicine, etc.)
5. Select consent type
6. Display consent text on patient-facing screen
7. Patient/Proxy signs on tablet
8. Witness (Nurse) co-signs
9. Click **"Save"**
10. Signed PDF archived to chart

**Wireframe Pages**

- **Consent Capture Page** (signature pad + text)
- **Consent Library Page** (template list)

---

### D5. Physician – Manage Problem List & Allergies

**User Flow**

1. Login (A1)
2. Open patient chart → **Problem List Page**
3. Click **"Add Problem"** → search ICD-10 → set status (Active / Resolved)
4. Save → problem appears in longitudinal list
5. Open **Allergy Management Page**
6. Click **"Add Allergy"** → search allergen → set severity & reaction
7. Mark as Verified
8. Allergy now blocks conflicting CPOE orders (E1/E4)

**Wireframe Pages**

- **Problem List Page** (active vs. resolved tabs)
- **Allergy Management Page** (severity badges)

---

## Section E — CPOE & Electronic Prescribing

### E1. Physician – Place Medication Order (Generics-Compliant)

**User Flow**

1. Login (A1)
2. Open patient chart
3. Click **"New Order"** → Medication
4. **CPOE Medication Order Page** opens
5. Search generic drug name (Drug Search Page enforces generic-first)
6. Optionally add brand (visually subordinated)
7. Set dose, route, frequency, duration
8. System checks allergies & formulary → CPOE Alert Modal if conflict
9. For high-alert med → High-Alert Verification Page (double signoff)
10. Click **"Sign Order"**
11. Order routes to Pharmacist verification queue (J1)

**Wireframe Pages**

- **CPOE Medication Order Page**
- **Drug Search Page** (generic-first results)
- **CPOE Alert Modal** (allergy/formulary blocks)
- **High-Alert Verification Page** (two-clinician confirmation)

---

### E2. Physician – Generate FDA-Compliant e-Prescription

**User Flow**

1. Login (A1)
2. Complete OPD encounter
3. Click **"e-Prescription"**
4. e-Prescription Page opens with ordered meds
5. System auto-appends Physician's PRC + PTR numbers
6. Review and sign
7. Click **"Print/Send"**
8. Prescription Print/Send Page → choose Print, Email, Patient Portal, or QR display

**Wireframe Pages**

- **e-Prescription Page** (preview with PRC/PTR header)
- **Prescription Print/Send Page**

---

### E3. Physician (S-2) – PDEA-Compliant Controlled Drug Prescribing

**User Flow**

1. Login (A1)
2. Open chart, attempt to order Schedule IV drug
3. System triggers **S-2 Validation Page**
4. Confirm active S-2 license (auto-checked from A4)
5. **Controlled Drug CPOE Page** opens
6. Enter total day supply
7. If > 30 days → System auto-tranches into 30-day blocks (max 90)
8. Each tranche stamped with future dispense date and "No Refill"
9. Sign order
10. Tranches generate sequential e-Rx with legal notations

**Wireframe Pages**

- **S-2 Validation Page**
- **Controlled Drug CPOE Page** (tranche preview)

---

### E4. Physician – Allergy & High-Alert Decision Support (Story 5.4)

**User Flow**

1. Login (A1)
2. Place medication order in CPOE (E1)
3. System screens against active allergies + formulary + DOH high-alert list
4. If absolute allergy match → **CPOE Alert Modal** blocks order with hard stop
5. Physician reviews allergen + reaction severity
6. Click **"Cancel Order"** or **"Override with Justification"**
7. If high-alert med (insulin, heparin, KCl, etc.) → **High-Alert Verification Page** opens
8. Requires second clinician (Pharmacist or Physician) to enter credentials
9. Both signoffs captured → order proceeds
10. Override / dual-sign event written to audit log

**Wireframe Pages**

- **CPOE Alert Modal** (allergy / formulary blocks)
- **High-Alert Verification Page** (two-clinician confirmation)

---

### E5. Physician – Lab & Imaging Order Entry (Story 5.5)

**User Flow**

1. Login (A1)
2. Open chart, click **"New Order"** → Lab or Imaging
3. **Lab Order Page** / **Imaging Order Page** opens
4. Search test name or pick from **Order Set Page** (e.g., "Sepsis Bundle")
5. Set urgency (Routine / STAT)
6. Add clinical indication (free text + ICD-10)
7. Sign order
8. Order appears in Lab Tech / Radiologist worklist (H1)

**Wireframe Pages**

- **Lab Order Page**
- **Imaging Order Page**
- **Order Set Page** (bundled orders)

---

## Section F — Maternal, Neonatal & NBS

### F1. Nurse – Newborn Screening Logbook

**User Flow**

1. Login (A1)
2. Open neonate chart
3. Click **"NBS"** module
4. **NBS Logbook Page** opens
5. Verify time-of-birth (auto-populated)
6. Capture parental consent on **NBS Consent Page** (or waiver)
7. At 24-48hr window → Click **"Collect Specimen"**
8. **NBS Specimen Capture Page** records timestamp, collector, sample ID
9. Print barcode label
10. Send specimen to NBS center; entry stays open until result returns

**Wireframe Pages**

- **NBS Logbook Page** (chronological log)
- **NBS Consent Page**
- **Waiver Page** (refusal documentation)
- **NBS Specimen Capture Page**

---

### F2. Nurse – NBS Positive Result Referral Tracking

**User Flow**

1. Login (A1)
2. NBS center returns positive result
3. Open **NBS Referral Tracker**
4. Filter "Positive" results
5. Click case → assign referral facility, schedule confirmatory tests
6. Document outcomes on **NBS Outcome Page**
7. Track until case closure

**Wireframe Pages**

- **NBS Referral Tracker** (worklist by status)
- **NBS Outcome Page** (timeline of follow-up)

---

### F3. Physician – Maternal Death Reporting (FMDRF) (Story 6.4)

**User Flow**

1. Physician records "Expired" disposition for reproductive-age female (10–49y)
2. System auto-triggers **Maternal Death Alert Page** (cannot dismiss)
3. Click **"Complete FMDRF"**
4. **FMDRF Form Page** opens with pre-filled patient + encounter data
5. Physician completes mandated fields: direct/indirect cause, contributing factors, place of death, antenatal history
6. Sign and submit
7. System forwards record to Surveillance officer for MNDRS reporting
8. Discharge summary marked complete

**Wireframe Pages**

- **Maternal Death Alert Page**
- **FMDRF Form Page**

---

### F4. Physician – Neonatal Death Reporting (FNDRF) (Story 6.5)

**User Flow**

1. Physician records "Expired" disposition for neonate (≤28 days)
2. System auto-triggers **Neonatal Death Alert Page** (cannot dismiss)
3. Click **"Complete FNDRF"**
4. **FNDRF Form Page** opens with pre-filled neonate + maternal data
5. Physician completes mandated fields: birth weight, gestational age, cause of death, resuscitation efforts
6. Sign and submit
7. System forwards to Surveillance officer for MNDRS reporting

**Wireframe Pages**

- **Neonatal Death Alert Page**
- **FNDRF Form Page**

---

## Section G — Nursing Care, MAR/TAR & Vitals

### G1. Nurse – Vitals & Flowsheet Entry

**User Flow**

1. Login (A1)
2. Open patient chart → **Flowsheet Page**
3. Click **"Add Vitals"**
4. **Vitals Entry Page** captures BP, HR, RR, Temp, SpO₂, Pain
5. Save → System auto-computes NEWS score
6. If NEWS ≥ 5 → escalation alert to Physician
7. Vitals appear as new column on flowsheet trend

**Wireframe Pages**

- **Vitals Entry Page** (large-touch keypad)
- **Flowsheet Page** (multi-row trend grid)

---

### G2. Nurse – Medication Administration (MAR) with Barcode

**User Flow**

1. Login (A1)
2. Open **MAR Page** for assigned patient
3. View due medications
4. Click **"Administer"**
5. **Barcode Scan Page** prompts → scan patient wristband
6. Scan medication barcode
7. System verifies 5 Rights (right patient, drug, dose, route, time)
8. If PRN → **PRN Documentation Page** for indication and pre-pain score
9. Click **"Confirm Administration"**
10. MAR cell turns green with timestamp + nurse initials

**Wireframe Pages**

- **MAR Page** (time-of-day grid)
- **Barcode Scan Page** (camera/reader UI)
- **PRN Documentation Page**

---

### G3. Nurse – Treatment Administration Record (TAR)

**User Flow**

1. Login (A1)
2. Open **TAR Page**
3. View ordered treatments (wound care, suctioning, nebulization)
4. Click **"Document"**
5. Enter site, technique, patient response
6. Sign → entry locked

**Wireframe Pages**

- **TAR Page**

---

### G4. Nurse – Intake & Output Tracking

**User Flow**

1. Login (A1)
2. Open **I/O Tracking Page**
3. Add Intake (PO, IV, NGT) with volume
4. Add Output (urine, drains, emesis) with volume
5. System computes 8hr / 24hr balance
6. Color-coded alert if imbalance > threshold

**Wireframe Pages**

- **I/O Tracking Page** (running totals)

---

### G5. Nurse – Shift Handoff (SBAR)

**User Flow**

1. Login (A1)
2. End of shift → click **"Generate Handoff"**
3. **Shift Handoff Page** auto-pulls 24hr summary per patient
4. **SBAR Template Page** opens for free-text narrative
5. Outgoing nurse signs
6. Incoming nurse opens, reviews, signs **"Acknowledged"**

**Wireframe Pages**

- **Shift Handoff Page** (patient list with status)
- **SBAR Template Page**

---

### G6. Nurse – HAI Tagging

**User Flow**

1. Login (A1)
2. Identify suspected HAI on patient
3. Open **HAI Tagging Page**
4. Select HAI type (VAP / BSI / UTI / SSI)
5. Enter onset date, evidence (cultures, imaging links)
6. Submit → entry queues for HIM Coder reconciliation (O4)
7. View aggregated counts on **HAI Surveillance Dashboard**

**Wireframe Pages**

- **HAI Tagging Page**
- **HAI Surveillance Dashboard** (incidence rates per ward)

---

## Section H — Laboratory, Blood Bank & Imaging

### H1. Lab Tech – Manual Result Entry & Validation

**User Flow**

1. Login (A1)
2. Open Lab Worklist → pending orders
3. Click order → **Manual Result Entry Page**
4. Enter results per analyte
5. System flags abnormal values vs reference range
6. Click **"Validate"**
7. **Result Validation Page** confirms tech signature
8. Result released to ordering Physician's inbox

**Wireframe Pages**

- **Manual Result Entry Page** (analyte grid)
- **Result Validation Page**

---

### H2. Lab Tech – Critical Result Flagging

**User Flow**

1. Result validated (H1) shows critical value
2. **Critical Result Page** opens automatically
3. Tech selects ordering Physician
4. Adds notification message
5. Click **"Notify"** → push notification + Result Notification Inbox entry
6. Tech logs read-back from Physician (timestamp + name)

**Wireframe Pages**

- **Critical Result Page**
- **Result Notification Inbox**

---

### H3. Blood Bank – Cross-Match Approval

**User Flow**

1. Login (A1)
2. Open **Cross-Match Approval Page** worklist
3. Review IPD cross-match request (patient, blood type, units)
4. Verify ABO/Rh compatibility, antibody screen
5. Click **"Approve"** or **"Reject"** with reason
6. Approved units appear on **Blood Product Inventory Page**
7. System notifies requesting Nurse

**Wireframe Pages**

- **Cross-Match Approval Page**
- **Blood Product Inventory Page** (unit-level traceability)

---

### H4. Nurse – Bedside Transfusion Verification

**User Flow**

1. Login (A1)
2. Open **Transfusion Verification Page**
3. Scan patient wristband
4. Scan blood product barcode
5. Scan CPOE order barcode
6. System validates 3-way match
7. If mismatch → block transfusion, log incident
8. If match → click **"Start Transfusion"**
9. **Transfusion Documentation Page** records vitals at intervals

**Wireframe Pages**

- **Transfusion Verification Page**
- **Transfusion Documentation Page**

---

### H5. Radiologist – Report Attachment & PACS Link

**User Flow**

1. Login (A1)
2. Open Imaging Worklist
3. Click study → opens external PACS (link launches in new tab/embed)
4. Read study externally
5. Return to EMR → **Radiology Report Page**
6. Type/dictate report (or upload)
7. Sign report
8. Embed link to PACS viewer for clinicians
9. Mark critical findings if any

**Wireframe Pages**

- **Radiology Report Page**
- **PACS Viewer Embed Page**

---

### H6. Lab Tech / Radiologist – Ancillary Procedure Barcode Logging

**User Flow**

1. Patient arrives at ancillary station
2. Login (A1)
3. Open **Ancillary Procedure Logging Page**
4. Scan patient barcode → **Barcode Scan Modal** confirms identity
5. Click **"Start Procedure"** → start timestamp logged
6. Perform procedure
7. Click **"End Procedure"** → end timestamp logged
8. System computes turnaround time → feeds ARTA Flow 3 SLA report

**Wireframe Pages**

- **Ancillary Procedure Logging Page**
- **Barcode Scan Modal**

---

## Section I — Operating Room & Surgical Services

### I1. Surgeon – Operative Record Charting

**User Flow**

1. Login (A1)
2. Open scheduled OR case
3. Click **"Operation Record"**
4. **Operation Record Page** opens
5. Capture: pre-op diagnosis, procedure, technique narrative
6. **OR Personnel Page** lists surgeon, assistants, scrub/circulating nurses, anesthesiologist
7. Record start/end times
8. Sign record

**Wireframe Pages**

- **Operation Record Page**
- **OR Personnel Page**

---

### I2. Anesthesiologist – Anesthesia Record

**User Flow**

1. Login (A1)
2. Open OR case
3. Click **"Anesthesia Record"**
4. **Anesthesia Record Page** opens
5. Document airway management (intubation type, grade, complications)
6. **Intraoperative Vitals Flowsheet** auto-captures from monitor (or manual)
7. Record meds administered
8. Sign at case end

**Wireframe Pages**

- **Anesthesia Record Page**
- **Intraoperative Vitals Flowsheet**

---

### I3. Surgeon – RVS Code Capture

**User Flow**

1. Operation Record signed (I1)
2. Click **"Map RVS Codes"**
3. **RVS Code Selection Page** lists procedure(s) performed
4. Search RVS catalog
5. Select primary + adjunct codes
6. Confirm → **Procedure Mapping Page** locks codes to encounter
7. Codes flow to RCM for PhilHealth procedural claim (K3)

**Wireframe Pages**

- **RVS Code Selection Page**
- **Procedure Mapping Page**

---

### I4. Scheduler – OR Schedule Management

**User Flow**

1. Login (A1)
2. Open **OR Schedule Page** (calendar grid by OR room)
3. Receive surgical request from Surgeon
4. Click slot → **Case Booking Page** opens
5. Enter patient, procedure, surgeon, anesthesiologist, est. duration, equipment
6. System checks conflicts (room, surgeon, equipment)
7. Confirm booking → all parties notified

**Wireframe Pages**

- **OR Schedule Page** (week view)
- **Case Booking Page**

---

## Section J — Pharmacy

### J1. Pharmacist – Verify Medication Orders

**User Flow**

1. Login (A1)
2. Open **Pharmacy Verification Queue**
3. Click pending order → **Medication Verification Page**
4. Review against weight, labs (renal/hepatic), allergies, interactions
5. Optionally add formulary note
6. Click **"Verify"** → order released to MAR
7. Or **"Query Prescriber"** → message Physician

**Wireframe Pages**

- **Pharmacy Verification Queue**
- **Medication Verification Page** (split view: order + patient context)

---

### J2. Pharmacist – Formulary Note Management

**User Flow**

1. Login (A1)
2. Open **Formulary Management Page**
3. Search drug → click **"Edit Note"**
4. **Formulary Note Editor** opens
5. Add restriction / alternative / cost note
6. Save → notes display to prescribers in CPOE search results

**Wireframe Pages**

- **Formulary Management Page**
- **Formulary Note Editor**

---

### J3. Pharmacist – Outpatient Dispensing

**User Flow**

1. Login (A1)
2. Patient presents e-Rx
3. Open **Outpatient Dispensing Page**
4. Scan e-Rx barcode or enter MRN
5. System retrieves valid CPOE prescriptions
6. Verify Generics Act compliance and PDEA limits
7. Wait for clearance (Billing or MSW — see K8/K11)
8. Click **"Dispense"** → deduct point-of-use, log on **Patient Counseling Log Page**
9. Provide counseling, mark complete

**Wireframe Pages**

- **Outpatient Dispensing Page**
- **Patient Counseling Log Page**

---

## Section K — Nutrition Services

### K1. Dietitian – Nutrition Assessment

**User Flow**

1. Login (A1)
2. Open consult worklist
3. Click patient → **Nutrition Assessment Page**
4. Capture anthropometrics, dietary history, biochemical data
5. Open **Malnutrition Risk Page** → score (e.g., MUST, SGA)
6. Save assessment

**Wireframe Pages**

- **Nutrition Assessment Page**
- **Malnutrition Risk Page**

---

### K2. Dietitian – Therapeutic Meal Plan & FHIR NutritionOrder

**User Flow**

1. Login (A1)
2. Open patient post-assessment (K1)
3. Click **"New Meal Plan"** → **Meal Plan Page**
4. Build daily menu (calories, macros, restrictions)
5. Open **NutritionOrder Editor**
6. Set diet type (NPO, soft, diabetic, low-Na)
7. Sign → FHIR NutritionOrder created and routed to kitchen system

**Wireframe Pages**

- **Meal Plan Page**
- **NutritionOrder Editor**

---

## Section L — RCM, eClaims & PhilHealth

### L1. Billing Officer – Charge Capture (Story 12.1)

**User Flow**

1. Login (A1)
2. Open patient encounter
3. Open **Charge Capture Page**
4. System auto-pulls charges from CPOE orders, MAR, OR record, ancillary results
5. Review pulled items for accuracy
6. Add missing manual charges via **Service Item Page**
7. Search service catalog → select item → enter quantity
8. Save charges to encounter ledger
9. Charges marked **"Ready for Invoicing"**

**Wireframe Pages**

- **Charge Capture Page** (auto-pulled + manual entry tabs)
- **Service Item Page** (catalog search)

---

### L2. Billing Officer – Invoice & Payment Processing (Story 12.2)

**User Flow**

1. Login (A1)
2. Open encounter with captured charges (L1)
3. Click **"Generate Invoice"** → **Invoice Page** opens
4. Review line items, apply discounts (Senior / PWD / Solo Parent)
5. Confirm invoice total
6. Open **Payment Entry Page**
7. Select payment method (Cash / Card / GCash / HMO)
8. Enter amount tendered → system computes change
9. Click **"Print Receipt"** → **Receipt Page** opens
10. Receipt issued; encounter status → **"Paid"**

**Wireframe Pages**

- **Invoice Page**
- **Payment Entry Page**
- **Receipt Page**

---

### L3. Billing Officer – Automated CF4 Generation & eClaims

**User Flow**

1. Login (A1)
2. Open completed encounter
3. Click **"Generate CF4"**
4. **CF4 Generation Page** auto-extracts: chief complaint, history, vitals, plan, ICD-10 codes
5. Review pre-filled XML
6. Click **"Submit eClaim"**
7. **eClaims Submission Page** sends to PhilHealth
8. Track status (Submitted / Returned / Paid)

**Wireframe Pages**

- **CF4 Generation Page** (preview + XML)
- **eClaims Submission Page**

---

### L4. Billing Officer – DRG Shadow Billing (CF5)

**User Flow**

1. Login (A1)
2. Open eligible discharged case
3. Click **"DRG Mapping"** → **DRG Mapping Page**
4. System suggests DRG group from coded diagnoses + procedures
5. Verify mapping
6. Click **"Generate CF5"** → **CF5 Page** preview
7. Submit for shadow billing

**Wireframe Pages**

- **DRG Mapping Page**
- **CF5 Page**

---

### L5. Billing Officer – eSOA Generation

**User Flow**

1. Login (A1)
2. Open patient invoice (L2)
3. Click **"Generate eSOA"**
4. **eSOA Page** compiles itemized statement
5. **Statement Preview Page** shows formatted output
6. Export XML / PDF
7. Send to patient via portal or print

**Wireframe Pages**

- **eSOA Page**
- **Statement Preview Page**

---

### L6. Billing Officer – PhilHealth Eligibility (CEWS) Check

**User Flow**

1. Login (A1)
2. At admission/billing → open **Eligibility Check Page**
3. Enter PhilHealth PIN
4. Click **"Verify"** → CEWS API returns membership status
5. **Membership Verification Page** shows benefit availability, dependents
6. Save eligibility snapshot to encounter

**Wireframe Pages**

- **Eligibility Check Page**
- **Membership Verification Page**

---

### L7. Billing Officer – Konsulta Capitation Tracking

**User Flow**

1. Login (A1)
2. Open **Konsulta Tracker Page**
3. View per-patient capitation activities (FPE, follow-ups, labs)
4. Filter by period
5. Generate **Capitation Report Page** for PhilHealth submission

**Wireframe Pages**

- **Konsulta Tracker Page**
- **Capitation Report Page**

---

### L8. Social Worker – Financial Evaluation & CoE Issuance

**User Flow**

1. Login (A1)
2. Receive MSW consult request
3. Open **MSW Assessment Page**
4. Conduct interview, capture income/family data
5. Review submitted documents
6. Determine eligibility (Malasakit / Z-Benefits / Indigent)
7. Open **CoE Issuance Page**
8. Select CoE type, fill amounts
9. Sign and issue → CoE PDF generated, attached to billing

**Wireframe Pages**

- **MSW Assessment Page**
- **CoE Issuance Page**

---

### L9. Social Worker – PhilHealth Annex A & B Signature Capture

**User Flow**

1. Login (A1)
2. Open patient with Konsulta/Z-Benefits enrollment
3. Open **Annex A/B Signature Page**
4. Display Annex A (Informed Consent) → patient signs on tablet
5. Display Annex B (Member Empowerment) → patient signs
6. Save → archived to **Signed Forms Archive**

**Wireframe Pages**

- **Annex A/B Signature Page** (tablet-friendly)
- **Signed Forms Archive**

---

### L10. Social Worker – Malasakit Center Tracking

**User Flow**

1. Login (A1)
2. Open **Malasakit Tracking Page**
3. View patients pending Malasakit assistance
4. Update case status (DSWD / PCSO / DOH-MAIFIP)
5. Capture amount granted, source
6. Reconcile with Billing

**Wireframe Pages**

- **Malasakit Tracking Page**

---

### L11. Social Worker – Ancillary Service Clearance

**User Flow**

1. Patient arrives at lab/imaging/pharmacy with no payment
2. Routed to MSW
3. Login (A1)
4. Open **Ancillary Clearance Page**
5. Look up patient and ancillary order
6. Open **Coverage Application Page**
7. Apply Malasakit / PhilHealth coverage
8. Click **"Clear for Procedure"** → status flips from "Pending Payment" to "Cleared"
9. Patient returns to ancillary station; procedure proceeds

**Wireframe Pages**

- **Ancillary Clearance Page** (queue view)
- **Coverage Application Page**

---

## Section M — Scheduling & Appointments

### M1. Scheduler – Clinic Template & Slot Setup

**User Flow**

1. Login (A1)
2. Open **Clinic Template Page**
3. Select clinic and provider
4. Define recurring schedule (days, hours, slot duration)
5. Save template
6. Open **Slot Management Page** to override holidays / leaves
7. Slots become bookable

**Wireframe Pages**

- **Clinic Template Page**
- **Slot Management Page**

---

### M2. Scheduler – Appointment Booking & Check-In

**User Flow**

1. Login (A1)
2. Open **Appointment Booking Page**
3. Search patient (or register new — B1)
4. Select clinic, provider, date, slot
5. Confirm booking → SMS/email reminder sent
6. On arrival → Open **Check-In Page**
7. Mark patient as Arrived
8. Patient queue number issued on **OPD Queue Board**

**Wireframe Pages**

- **Appointment Booking Page**
- **Check-In Page**
- **OPD Queue Board** (waiting room display)

---

## Section N — Telemedicine

### N1. Physician – Virtual Encounter Logging

**User Flow**

1. Login (A1)
2. Open scheduled telemedicine appointment
3. Click **"Start Virtual Encounter"**
4. **Telemedicine Encounter Page** opens with patient details + chart
5. Confirm encounter context detected from the appointment source:
   - **Standalone** for a virtual-only consultation
   - **Follow-up to In-Person Visit** for a follow-up to an existing OPD, ER, or inpatient encounter
6. Click **"Launch Video"** → **Video Link Launch Page** opens Zoom/Teams in new window
7. Conduct consultation
8. Document SOAP note in EMR (D1)
9. End video call
10. Close encounter

**Wireframe Pages**

- **Telemedicine Encounter Page** (chart + video panel)
- **Video Link Launch Page**

---

### N2. Physician – Tele-Encounter Abstract & e-Rx

**User Flow**

1. After tele-consultation (N1)
2. Click **"Generate Abstract"**
3. **Tele-Abstract Page** auto-pulls SOAP, diagnosis, plan
4. Sign abstract
5. If meds prescribed → **Tele e-Prescription Page** with PRC/PTR auto-applied
6. Send abstract + e-Rx to patient portal/email

**Wireframe Pages**

- **Tele-Abstract Page**
- **Tele e-Prescription Page**

---

## Section O — HIM & Coding

### O1. HIM Coder – Chart Deficiency Tracking

**User Flow**

1. Login (A1)
2. Open **Deficiency Worklist**
3. Filter by deficiency type (missing signature, undocumented procedure, missing discharge summary)
4. Click case → **Deficiency Detail Page**
5. Send notification to responsible Physician
6. Mark resolved when complete

**Wireframe Pages**

- **Deficiency Worklist**
- **Deficiency Detail Page**

---

### O2. HIM Coder – ICD-10 Coding

**User Flow**

1. Login (A1)
2. Open completed encounter
3. Open **ICD-10 Coding Page**
4. Review documented diagnoses
5. Use **Code Lookup Page** to assign primary + secondary codes
6. Validate against AHSR Top-10 mortality/morbidity rules
7. Sign coding → locks for billing

**Wireframe Pages**

- **ICD-10 Coding Page**
- **Code Lookup Page**

---

### O3. HIM Coder – Medical Records Issuance

**User Flow**

1. Login (A1)
2. Patient submits records request
3. Open **Records Request Page**
4. Verify identity and DPA consent
5. Compile requested documents
6. **Document Release Page** → Physician signs Medical Certificate (if applicable)
7. Patient pays at billing
8. Release document → entry logged on **Release Audit Page**

**Wireframe Pages**

- **Records Request Page**
- **Document Release Page**
- **Release Audit Page**

---

### O4. HIM Coder – HAI Surveillance & Reconciliation

**User Flow**

1. Login (A1)
2. Open **HAI Reconciliation Worklist**
3. View Nurse-tagged HAIs (G6) pending review
4. Cross-check ICD-10 coding (O2)
5. Confirm or reclassify HAI type
6. Generate **HAI Surveillance Report Page** for AHSR submission

**Wireframe Pages**

- **HAI Reconciliation Worklist**
- **HAI Surveillance Report Page**

---

## Section P — Statutory & Public Health Reporting

### P1. Surveillance – PIDSR Notifiable Disease Detection

**User Flow**

1. Login (A1)
2. Open **PIDSR Alert Inbox**
3. View system-flagged cases (syndromic keywords + ICD-10 matches)
4. Click case → review chart
5. Confirm or dismiss
6. For Cat-1 (immediate) → submit within 24hr; for Cat-2 (weekly) → batch submit
7. Open **PIDSR Submission Page** → transmit to DOH portal

**Wireframe Pages**

- **PIDSR Alert Inbox**
- **PIDSR Submission Page**

---

### P2. Surveillance – AHSR Aggregation

**User Flow**

1. Login (A1)
2. Open **AHSR Dashboard**
3. View aggregated metrics: BOR, Death Rates, Top 10 Mort/Morb, HAI
4. Open **AHSR Validation Page** → resolve data quality flags
5. Click **"Export"** → **AHSR Export Page** generates DOH-format file
6. Submit to DOH for LTO renewal

**Wireframe Pages**

- **AHSR Dashboard**
- **AHSR Validation Page**
- **AHSR Export Page**

---

### P3. Surveillance – Mortality & Morbidity Reporting

**User Flow**

1. Login (A1)
2. Open **Mortality/Morbidity Report Page**
3. Select reporting period
4. View system-computed Top 10 lists from finalized ICD-10 codes
5. Drill down per condition → counts, demographics
6. Export PDF for DOH submission

**Wireframe Pages**

- **Mortality/Morbidity Report Page**

---

## Section Q — Interoperability (FHIR / NHDR)

### Q1. Administrator – Configure FHIR Endpoints

**User Flow**

1. Login (A1)
2. Open **FHIR Endpoint Configuration Page**
3. Add NHDR endpoint URL, auth credentials
4. Select FHIR resources to expose (Patient, Encounter, Observation, etc.)
5. Test connection
6. Save → exchanges begin per schedule
7. Monitor on **FHIR Exchange Log Page**

**Wireframe Pages**

- **FHIR Endpoint Configuration Page**
- **FHIR Exchange Log Page**

---

### Q2. Administrator – Terminology Management

**User Flow**

1. Login (A1)
2. Open **Terminology Management Page**
3. Select code system (ICD-10, SNOMED CT, LOINC, RxNorm, RVS)
4. Open **Code Set Page** → upload latest catalog
5. Map deprecated codes to current
6. Save → enforced across modules

**Wireframe Pages**

- **Terminology Management Page**
- **Code Set Page**

---

## Section R — Offline Capability

### R1. Physician – Offline Patient Summary Access

**User Flow**

1. Internet/power outage detected
2. **Offline Mode Indicator** banner appears
3. Click any patient → **Cached Patient Summary Page** opens (last sync state)
4. Read summary, allergies, last vitals
5. Documentation entered offline → queued locally

**Wireframe Pages**

- **Offline Mode Indicator** (persistent banner)
- **Cached Patient Summary Page**

---

### R2. Nurse – Auto-Sync on Reconnect

**User Flow**

1. Connectivity restored
2. **Sync Status Page** auto-opens showing pending records
3. System pushes queued documentation to server
4. Conflict detected → **Sync Conflict Resolution Page** opens
5. Nurse chooses local / server / merge per record
6. Sync completes; banner clears

**Wireframe Pages**

- **Sync Status Page** (progress + queue counts)
- **Sync Conflict Resolution Page** (side-by-side diff)

---

## Section S — ARTA Compliance & SLA

### S1. Administrator – Configure SLA Targets

**User Flow**

1. Login (A1)
2. Open **SLA Configuration Page**
3. Per workflow (OPD, ER, Discharge, Records), set target turnaround minutes
4. Save → background time-stamping engine applies thresholds
5. Review real-time status on **Workflow Status Log Page**

**Wireframe Pages**

- **SLA Configuration Page**
- **Workflow Status Log Page**

---

### S2. Administrator – Citizen's Charter Turnaround Reporting

**User Flow**

1. Login (A1)
2. Open **SLA Dashboard**
3. View per-workflow SLA compliance %
4. Click workflow → **Turnaround Report Page** → daily breakdown
5. Identify outliers → **Bottleneck Analysis Page** drills into stalled steps
6. Export ARTA-compliant report

**Wireframe Pages**

- **SLA Dashboard** (KPI tiles)
- **Turnaround Report Page**
- **Bottleneck Analysis Page**

---

## Section T — System Administration

### T1. Administrator – Facility & Department Setup

**User Flow**

1. Login (A1)
2. Open **Facility Settings Page**
3. Edit facility profile (name, DOH license #, level, accreditations)
4. Open **Department Setup Page** → add/edit departments
5. Open **Ward Configuration Page** → define wards, beds, room types

**Wireframe Pages**

- **Facility Settings Page**
- **Department Setup Page**
- **Ward Configuration Page**

---

### T2. Administrator – Master Data Management

**User Flow**

1. Login (A1)
2. Open **Master Data Dashboard**
3. Select catalog (Drug Formulary / Lab Catalog / RVS / ICD-10 sets)
4. Open **Catalog Editor Page**
5. Add / edit / deprecate items
6. Save → versioned and propagated to all modules

**Wireframe Pages**

- **Master Data Dashboard**
- **Catalog Editor Page**

---

### T3. Administrator – Integration Settings

**User Flow**

1. Login (A1)
2. Open **Integration Settings Page**
3. Select integration (ERP / LIS / PACS / Telemedicine / NHDR)
4. Open **API Key Management Page**
5. Generate / rotate keys, set webhook URLs
6. Test connectivity
7. Save → integration active

**Wireframe Pages**

- **Integration Settings Page**
- **API Key Management Page**

---

## Appendix — Story ↔ Flow Traceability Matrix

Strict 1:1 mapping. Every user story has a dedicated flow.

| Story | Flow | Title |
|---|---|---|
| 1.1 | A1 | Secure Login with 2FA |
| 1.2 | A2 | Create User & Assign Role |
| 1.3 | A3 | Configure Feature Flags & Modules |
| 1.4 | A4 | Validate Clinician Licenses |
| 1.5 | A5 | Break-Glass Emergency Access |
| 1.6 | A6 | Review Audit Trail |
| 1.7 | A7 | Patient Portal Access |
| 2.1 | B1 | Patient Registration & MRN |
| 2.2 | B2 | Encounter Creation |
| 2.3 | B3 | Bed Assignment |
| 2.4 | B4 | Patient Transfer |
| 2.5 | B5 | BOR Computation Review |
| 2.6 | B6 | Administrative Discharge & Gate Pass |
| 2.7 | B8 | Trauma Alias / Pre-Encounter |
| 2.8 | B9 | Local Civil Registry Certificates |
| 2.9 | B7 | Post-Discharge Bed Cleaning |
| 3.1 | C1 | Standardized Triage Scoring |
| 3.2 | C2 | ER Disposition with OECB |
| 3.3 | C3 | ER Patient Tracker |
| 3.4 | C4 | Tele-Triage Intake |
| 4.1 | D1 | Author SOAP Note |
| 4.2 | D2 | Sign & Amend Note |
| 4.3 | D3 | PhilHealth FPE Capture |
| 4.4 | D4 | Electronic Consent Capture |
| 4.5 | D5 | Problem List & Allergy Management |
| 5.1 | E1 | Place Medication Order (Generics) |
| 5.2 | E2 | FDA-Compliant e-Prescription |
| 5.3 | E3 | PDEA Controlled Drug Prescribing |
| 5.4 | E4 | Allergy & High-Alert Decision Support |
| 5.5 | E5 | Lab & Imaging Order Entry |
| 6.1 | F1 | Newborn Screening Logbook |
| 6.2 | F1 | NBS Parental Consent / Waiver (within F1) |
| 6.3 | F2 | NBS Positive Result Referral |
| 6.4 | F3 | FMDRF (Maternal Death) |
| 6.5 | F4 | FNDRF (Neonatal Death) |
| 7.1 | G1 | Vitals & Flowsheet |
| 7.2 | G2 | MAR with Barcode |
| 7.3 | G3 | Treatment Administration Record |
| 7.4 | G4 | Intake & Output Tracking |
| 7.5 | G5 | Shift Handoff (SBAR) |
| 7.6 | G6 | HAI Tagging |
| 8.1 | H1 | Lab Result Entry & Validation |
| 8.2 | H2 | Critical Result Flagging |
| 8.3 | H3 | Blood Bank Cross-Match |
| 8.4 | H4 | Bedside Transfusion Verification |
| 8.5 | H5 | Radiology Report & PACS Link |
| 8.6 | H6 | Ancillary Procedure Barcode Logging |
| 9.1 | I1 | Operative Record |
| 9.2 | I2 | Anesthesia Record |
| 9.3 | I3 | RVS Code Capture |
| 9.4 | I4 | OR Schedule Management |
| 10.1 | J1 | Pharmacist Order Verification |
| 10.2 | J2 | Formulary Note Management |
| 10.3 | J3 | Outpatient Dispensing |
| 11.1 | K1 | Nutrition Assessment |
| 11.2 | K2 | Therapeutic Meal Plan & NutritionOrder |
| 12.1 | L1 | Charge Capture |
| 12.2 | L2 | Invoice & Payment Processing |
| 12.3 | L3 | CF4 Generation & eClaims |
| 12.4 | L4 | DRG Shadow Billing (CF5) |
| 12.5 | L5 | eSOA Generation |
| 12.6 | L6 | PhilHealth Eligibility (CEWS) |
| 12.7 | L7 | Konsulta Capitation Tracking |
| 12.8 | L8 | MSW Financial Eval & CoE |
| 12.9 | L9 | Annex A & B Signature Capture |
| 12.10 | L10 | Malasakit Tracking |
| 12.11 | L11 | Ancillary Service Clearance |
| 13.1 | M1 | Clinic Template Setup |
| 13.2 | M2 | Appointment Booking & Check-In |
| 14.1 | N1 | Virtual Encounter Logging |
| 14.2 | N2 | Tele-Abstract & e-Rx |
| 15.1 | O1 | Chart Deficiency Tracking |
| 15.2 | O2 | ICD-10 Coding |
| 15.3 | O3 | Medical Records Issuance |
| 15.4 | O4 | HAI Surveillance & Reconciliation |
| 16.1 | P1 | PIDSR Notifiable Disease |
| 16.2 | P2 | AHSR Aggregation |
| 16.3 | P3 | Mortality & Morbidity Reporting |
| 17.1 | Q1 | FHIR R4 Resource Exchange |
| 17.2 | Q2 | Terminology Management |
| 18.1 | R1 | Offline Patient Summary |
| 18.2 | R2 | Auto-Sync on Reconnect |
| 19.1 | S1 | SLA Configuration |
| 19.2 | S2 | Citizen's Charter Reporting |
| 20.1 | T1 | Facility & Department Setup |
| 20.2 | T2 | Master Data Management |
| 20.3 | T3 | Integration Settings |

**Coverage:** 87 stories → 86 dedicated flows (Story 6.2 NBS Consent is intentionally co-located inside Flow F1 because it is a single-screen sub-step of the same NBS workflow with no independent navigation path — both pages, **NBS Consent Page** and **Waiver Page**, are explicitly listed in F1's Wireframe Pages).
