# Terms of Reference
## Electronic Medical Record (EMR) System for Philippine Healthcare Facilities

---

## Section 1: Roles and Functions

| Role | Responsibilities |
|------|-----------------|
| **System Admin** | Manages configuration, users, roles, and feature flags. Has no clinical write access. |
| **Registrar** | Creates and updates patient records and encounters, processes transfers, and manages administrative discharge. Manages integration with the Local Civil Registry, utilizing data inheritance to generate and track official Birth and Death Certificates. |
| **Medical Social Worker (MSW)** | Evaluates patients for financial assistance, issues Certificates of Eligibility (CoE), acts as a liaison for Malasakit Centers, and secures and digitally archives digital signatures for PhilHealth Annex A (Informed Consent) and Annex B (Member Empowerment) forms during financial evaluations for capitation and Z-Benefits. |
| **Triage Officer (Emergency)** | Utilizes standardized Triage Scales (e.g., ESI, ATS, CTAS) to assign clinical acuity scores prior to formal administrative registration. |
| **Clinician / Surgeon / Anesthesiologist** | Authors and signs clinical notes, places orders (CPOE), views results, and manages problem lists. Must strictly adhere to the Generics Act of 1988 during prescribing. Validates PRC, PTR, and PDEA S-2 licenses within the system to generate legally compliant electronic prescriptions. |
| **Nurse / Midwife** | Records vitals and flowsheets, manages care plans, and administers medications and treatments (MAR/TAR). Administers Universal Newborn Screening (NBS) protocols, captures mandatory electronic consent/waivers, and maintains the digital NBS logbook. |
| **Clinical Dietitian / Nutritionist** | Conducts comprehensive nutrition assessments, documents malnutrition risk status, creates therapeutic meal plans, and authors HL7 FHIR NutritionOrders. |
| **Pharmacist** | Verifies medication orders for clinical appropriateness, reviews against patient weight and labs, and manages formulary notes (avoids deep supply chain logistics). |
| **Lab Technologist** | *(Optional)* Performs manual result entry and validation if the primary LIS is unavailable. |
| **Radiology Staff** | Attaches imaging reports and links to PACS, marking critical results for attention. |
| **Scheduler** | Manages clinic templates, appointment slots, bookings, and patient check-ins. |
| **Biller** | Manages charges, creates invoices, records payments, and issues receipts. |
| **HIM Coder** | Manages chart deficiencies, assigns ICD-10 codes, guarantees 100% accurate ICD-10 coding for top mortalities and morbidities, ensures Clinical Form 4 (CF4) data extraction is complete, and tracks Healthcare Associated Infections (HAI). |
| **Statutory and Public Health Reporting Officer** *(formerly PIDSR)* | Monitors, extracts, and reports Category 1 and 2 notifiable diseases to PIDSR. Manages the aggregation, validation, and export of data for the DOH Annual Hospital Statistical Report (AHSR). |
| **Patient / Proxy** | Has secure, read-only access to released portions of their medical record (via static daily summaries to prevent database degradation). |
| **Auditor / Privacy Officer** | Has read-all access and can view detailed audit logs of system activity for Data Privacy Act compliance. |
| **Break-Glass Clinician** | Can gain emergency, broad read-access to a patient chart with a justified reason, automatically triggering a specialized, high-priority audit log for the Privacy Officer. |

---

## Section 2: Core EMR Modules

### 1. ADT (Admission, Discharge, Transfer) & Bed Management

**Purpose:** To centrally manage a patient's identity and visit lifecycle.

- **Core Data:** Patient Profile (MRN), Encounter, Location/Bed, Disposition.
- **Key Workflows:** Register/find patient, create encounter, transfer, discharge.
- **Philippine Localization:** Must continuously calculate the Bed Occupancy Rate (BOR) based on the DOH-mandated midnight census formula (accounting for same-day admit/discharge). Must record the exact time of admission vs. time of death to automatically compute Gross/Net Death Rates (<48hrs vs >48hrs).

---

### 2. Emergency Department (ED) & Tele-Triage Management

**Purpose:** Manage dynamic, high-acuity patient intake.

- **Key Workflows:** Supports a "Pre-Encounter" state allowing rapid clinical charting using a system-assigned "Trauma Alias" before financial registration is complete. Includes seamless merging of temporary charts with permanent MRNs.
- **Philippine Localization:** Includes a disposition tag for the Outpatient Emergency Care Benefit (OECB). This tag automatically routes non-admitted emergency cases to the RCM module for specialized PhilHealth outpatient billing.

---

### 3. Clinical Documentation

**Purpose:** Author, sign, and revise clinical notes using structured templates.

- **Key Workflows:** Select template, write note, sign note, create amendments.
- **Philippine Localization:** Integrates PhilHealth First Patient Encounter (FPE) structured health screening templates. Mandates electronic capture of patient consent (DPA compliance) prior to sensitive data transmission.

---

### 4. CPOE & Electronic Prescribing (FDA/PDEA Compliant)

**Purpose:** Standardized clinician orders for medications, labs, imaging.

**Philippine Localization:**

- **Generics Act Enforcement:** Hard-coded UI logic forcing the selection of the generic drug name. Brand names may be added but must be visually subordinated.
- **FDA e-Rx Mandates:** Automatically appends the clinician's validated PRC License Number and PTR to every electronic prescription.
- **PDEA S-2 Logic:** Validates active S-2 licenses before allowing List A drug orders. Enforces a maximum 90-day supply limit on Schedule IV dangerous drugs, automatically dividing multi-month orders into 30-day tranches with legally required temporal dispensing instructions and "No Refill" inscriptions.
- **Lean CDS:** Alert fatigue is mitigated by strictly limiting Clinical Decision Support to absolute Allergy blocks, active Formulary constraints, and DOH-mandated High-Alert Medication double-verification.

---

### 5. Maternal, Neonatal, and Newborn Screening

**Purpose:** Fulfill statutory maternal and child health reporting mandates for DOH licensing.

**Key Workflows:**

- **NBS Logbook:** Digital Newborn Screening logbook tracks precise time-of-birth vs. time-of-screening (enforcing 24–48 hour rules), captures electronic parental consent/waiver, and tracks positive result referral pathways.
- **MNDRS Triggers:** Automatically alerts and requires the completion of a Facility Maternal Death Reporting Form (FMDRF) or Facility Neonatal Death Reporting Form (FNDRF) upon the death disposition of a reproductive-age female or neonate.

---

### 6. Nursing Module & MAR/TAR

**Purpose:** Bedside care recording, assessments, and Medication Administration Record.

- **Key Workflows:** Document PRN reasons, shift handoff, track I/O.
- **Philippine Localization:** Facilitates cross-module tagging for Healthcare-Associated Infections (HAI) such as VAP, BSI, UTI, and SSI for DOH AHSR reporting.

---

### 7. Problems & Allergies

**Purpose:** Longitudinal list of diagnoses, allergies, and adverse reactions. Enforces active allergy blocking in the CPOE.

---

### 8. Vitals & Flowsheets

**Purpose:** Structured, time-based record of observations (temperature, BP) with automated early-warning score calculations (e.g., NEWS).

---

### 9. Laboratory & Blood Bank Management

**Purpose:** Finalized laboratory data integration and critical transfusion workflows. Includes digital IPD cross-match approvals and system-controlled barcode bedside matching (patient, product, and CPOE order).

---

### 10. RIS/PACS Link

**Purpose:** Attach radiology reports and provide a secure URL link to an external PACS viewer.

---

### 11. Operating Room and Surgical Services

**Purpose:** To manage surgical documentation required for patient safety, legal compliance, and PhilHealth reimbursement.

- **Key Workflows:** Enables structured charting for the Operation Record (operative technique, personnel, timestamps) and the Anesthesia Record (airway management, intraoperative vitals).
- **Philippine Localization:** Mandates the capture and mapping of RVS (Relative Value Scale) codes for all surgical procedures performed. This is strictly required to route surgical cases to the RCM module for PhilHealth procedural claims processing.

---

### 12. Pharmacy Verify (Basic)

**Purpose:** Clinical safety check reviewing appropriateness, interactions, and dosing against patient weight/labs before making meds available on the MAR. Explicitly excludes inventory/supply chain logistics.

---

### 13. Advanced RCM, eClaims & PhilHealth Integration

**Purpose:** Financial tracking restricted to clinical charge capture, patient invoicing, and institutional claims generation.

**Philippine Localization:**

- **Automated Claim Form 4 (CF4):** Automatically extracts the chief complaint, brief history, vitals, and management plan from finalized clinical notes to instantly generate the strict XML format required for PhilHealth eClaims, eliminating manual abstraction.
- Fully manages DRG Shadow Billing (CF5), electronic Statements of Account (eSOA), Eligibility Web Services (CEWS), Konsulta Capitation, and Malasakit Center tracking.

---

### 14. Telemedicine Integration

**Purpose:** Virtual encounters natively logged within the EMR.

- **Key Workflows:** Employs lightweight API links to stable commercial video platforms (Zoom/Teams) to preserve bandwidth. Focuses natively on generating the electronic clinical abstract and digitally signed e-prescription.

---

## Section 3: Statutory and Regulatory Reporting Engine

To prevent manual chart auditing and ensure uninterrupted hospital licensing, the EMR will automatically aggregate data for mandatory government portals:

- **Annual Hospital Statistical Report (AHSR):** Automatically calculates Bed Occupancy Rates (BOR), Gross/Net Death Rates, top 10 leading causes of morbidity/mortality (strictly mapped to finalized ICD-10 codes), and HAI surveillance metrics for DOH LTO renewal.
- **PIDSR Integration:** Automatically detects syndromic keywords and specific ICD-10 codes to flag and transmit Category 1 (immediate) and Category 2 (weekly) notifiable diseases.

---

## Section 4: System Non-Functional Requirements & Exclusions

### 1. Interoperability and Data Standards

The system must actively utilize **HL7 Fast Healthcare Interoperability Resources (FHIR) Release 4** to ensure seamless integration with the Philippine National Health Data Repository (NHDR). Standardized terminologies must be strictly enforced:

| Domain | Standard |
|--------|----------|
| Diagnoses | ICD-10 / SNOMED CT |
| Laboratory | LOINC |
| Medications | RxNorm |
| Procedures | RVS |

### 2. Privacy, Security, and Offline Capability

The EMR architecture must strictly comply with the **Data Privacy Act of 2012 (RA 10173)**, featuring:

- Robust encryption
- Least-privileged access controls
- Comprehensive audit trails

Crucially, the system must incorporate an **Offline Mode** that caches patient summaries locally, allowing clinicians to document essential care during internet or power outages, synchronizing automatically upon connection restoration.

### 3. Out of Scope: ERP Boundary Delineation

To prevent system bloat and maintain clinical performance, the EMR is strictly limited to clinical care and revenue cycle management. The following functions are **explicitly excluded** and must be handled by a dedicated ERP system via API integration:

- Hospital-wide Supply Chain, Purchasing, and Warehouse Management *(Note: The EMR tracks point-of-use clinical consumption, but the ERP handles inventory deduction)*
- Human Resources, Shift Rostering, and Payroll Administration
- General Ledger and Deep Financial Accounting

---

## Section 5: Definition of Terms (Glossary)

| Abbreviation | Definition |
|-------------|------------|
| **ADT** | Admission, Discharge, Transfer |
| **AHSR** | Annual Hospital Statistical Report (Mandatory DOH requirement) |
| **BOR** | Bed Occupancy Rate |
| **Break-Glass** | Emergency override access with extra privacy auditing |
| **CDS** | Clinical Decision Support |
| **CF4 / CF5** | PhilHealth Claim Form 4 (Clinical Summary) / Claim Form 5 (DRG) |
| **CPOE** | Computerized Physician Order Entry |
| **DPA** | Data Privacy Act of 2012 (RA 10173) |
| **eSOA** | Electronic Statement of Account (XML format) |
| **FMDRF / FNDRF** | Facility Maternal / Neonatal Death Reporting Form |
| **FPE** | First Patient Encounter (PhilHealth Konsulta) |
| **HL7 FHIR** | Health Level 7 Fast Healthcare Interoperability Resources |
| **MAR / TAR** | Medication Administration Record / Treatment Administration Record |
| **NBS** | Newborn Screening |
| **OECB** | Outpatient Emergency Care Benefit |
| **PIDSR** | Philippine Integrated Disease Surveillance and Response |
| **PRC / PTR** | Professional Regulation Commission License / Professional Tax Receipt |
| **RVS** | Relative Value Scale (Procedural coding system used by PhilHealth) |
| **S-2 License** | PDEA License to prescribe dangerous/regulated drugs |
| **Z-Benefits / Konsulta / Malasakit** | Specific national health insurance benefit packages and assistance centers |
