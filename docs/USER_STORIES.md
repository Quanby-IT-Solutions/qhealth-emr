# User Stories

## Electronic Medical Record (EMR) System for Philippine Healthcare Facilities

> Derived from the Master EMR Terms of Reference. Roles in each story map directly to the seeded EMR accounts:
> **Administrator, Registrar, Scheduler, Triage Officer, Physician, Surgeon, Anesthesiologist, Nurse, Dietitian, Pharmacist, Lab Tech, Radiologist, Blood Bank, Billing Officer, Social Worker, HIM Coder, Surveillance, Auditor.**
> External actors (Patient / Proxy) are also referenced where the TOR explicitly defines them.

---

## 1. User Management & Security

- **Story 1.1 – Secure Login with 2FA**
  - **As a** Clinical or Administrative Staff Member
  - **I want to** log in using secure credentials with Two-Factor Authentication
  - **So that** I can ensure my access complies with the Data Privacy Act of 2012 (RA 10173) and protects sensitive patient data
  - **Pages**: Login Page, 2FA Verification Page, Forgot Password Page

- **Story 1.2 – Role-Based User Management**
  - **As an** Administrator
  - **I want to** create user accounts and assign specific roles (e.g., Physician, Nurse, Registrar, Billing Officer, Social Worker, HIM Coder)
  - **So that** users only have access to features and data relevant to their job functions (Role-Based Access Control)
  - **Pages**: User Management List, Add/Edit User Form, Role Assignment Page

- **Story 1.3 – Feature Flag and Module Configuration**
  - **As an** Administrator
  - **I want to** enable, disable, or configure modules and feature flags per facility
  - **So that** I can tailor the EMR to the hospital's licensed services without redeploying the system
  - **Pages**: Feature Flag Dashboard, Module Configuration Page

- **Story 1.4 – Professional License Validation**
  - **As an** Administrator
  - **I want to** capture and validate PRC, PTR, and PDEA S-2 licenses for Physicians, Surgeons, and Anesthesiologists
  - **So that** electronic prescriptions and controlled drug orders remain legally compliant with FDA and PDEA mandates
  - **Pages**: Clinician License Management Page, License Verification Page

- **Story 1.5 – Break-Glass Emergency Access**
  - **As a** Physician
  - **I want to** request emergency override access to a patient chart with a justification
  - **So that** I can deliver urgent care while triggering a high-priority audit log for the Auditor
  - **Pages**: Break-Glass Access Request Page, Justification Capture Modal

- **Story 1.6 – Audit Trail Review**
  - **As an** Auditor
  - **I want to** view detailed read/write audit logs of all system activity, including break-glass events
  - **So that** I can ensure compliance with the Data Privacy Act and investigate suspicious access
  - **Pages**: Audit Log Dashboard, Audit Detail Page, Break-Glass Audit Report Page

- **Story 1.7 – Patient Portal Access**
  - **As a** Patient or Authorized Proxy
  - **I want to** securely access a read-only static daily summary of my released medical record
  - **So that** I can view my health information without impacting clinical database performance
  - **Pages**: Patient Portal Login, Patient Summary Dashboard, Document Download Page

---

## 2. Patient Registration & ADT (Admission, Discharge, Transfer)

- **Story 2.1 – Patient Registration & MRN Assignment**
  - **As a** Registrar
  - **I want to** create a new patient record or retrieve an existing one with a unique Medical Record Number (MRN)
  - **So that** every patient has a single longitudinal record across all encounters
  - **Pages**: Patient Search Page, Patient Registration Form, Demographics Page

- **Story 2.2 – Encounter Creation**
  - **As a** Registrar
  - **I want to** create a new encounter (OPD, ER, IPD) tied to a patient's MRN
  - **So that** all clinical activity is correctly grouped to a single visit for billing and reporting
  - **Pages**: Encounter Creation Page, Encounter List Page

- **Story 2.3 – Bed Assignment & Management**
  - **As a** Registrar
  - **I want to** view available beds and assign one to an admitted patient
  - **So that** bed status is tracked accurately for occupancy reporting
  - **Pages**: Bed Management Dashboard, Bed Assignment Page, Ward Map View

- **Story 2.4 – Patient Transfer**
  - **As a** Registrar
  - **I want to** transfer a patient between wards or beds and require Nurse confirmation at the destination
  - **So that** the bed census and patient location remain synchronized
  - **Pages**: Transfer Request Page, Receive Patient Page

- **Story 2.5 – Bed Occupancy Rate (BOR) Computation**
  - **As an** Administrator
  - **I want to** view the continuously calculated Bed Occupancy Rate using the DOH midnight census formula
  - **So that** the hospital can comply with DOH AHSR licensing requirements
  - **Pages**: BOR Dashboard, Census Report Page

- **Story 2.6 – Administrative Discharge**
  - **As a** Registrar
  - **I want to** finalize the administrative discharge of a patient, including time-of-discharge capture
  - **So that** the system can automatically compute length-of-stay and the **Gross Death Rate (deaths within ≤48 hours of admission)** vs **Net Death Rate (deaths after >48 hours)** as required by DOH AHSR
  - **Pages**: Discharge Processing Page, Gate Pass Release Page

- **Story 2.7 – Trauma Alias / Pre-Encounter Charting**
  - **As a** Triage Officer
  - **I want to** create a temporary "Trauma Alias" record for an unidentified emergency patient
  - **So that** clinical documentation can begin immediately, then merge with the permanent MRN later
  - **Pages**: Trauma Alias Creation Page, Chart Merge Page

- **Story 2.8 – Local Civil Registry Integration**
  - **As a** Registrar
  - **I want to** generate Birth and Death Certificates with inherited patient data
  - **So that** I can submit official documentation to the Local Civil Registry without duplicate entry
  - **Pages**: Birth Certificate Generation Page, Death Certificate Generation Page, LCR Tracking Page

- **Story 2.9 – Post-Discharge Bed Cleaning Status**
  - **As a** Registrar
  - **I want to** automatically transition a bed to "Dirty / For Cleaning" upon Gate Pass release and back to "Available" once housekeeping confirms
  - **So that** the bed census reflects true availability and ARTA Flow 5 turnover is tracked
  - **Pages**: Bed Status Page, Housekeeping Confirmation Page

---

## 3. Emergency Department & Triage

- **Story 3.1 – Standardized Triage Scoring**
  - **As a** Triage Officer
  - **I want to** assign clinical acuity using a standardized scale (ESI, ATS, or CTAS)
  - **So that** patients are prioritized based on clinical severity
  - **Pages**: Triage Assessment Page, Triage Queue Dashboard

- **Story 3.2 – ER Disposition with OECB Tagging**
  - **As a** Physician
  - **I want to** disposition a patient with the appropriate Outpatient Emergency Care Benefit (OECB) tag
  - **So that** non-admitted emergency cases are routed to the correct PhilHealth outpatient billing workflow
  - **Pages**: ER Disposition Page, OECB Tag Page

- **Story 3.3 – ER Patient Tracker**
  - **As a** Nurse
  - **I want to** view all active ER patients with acuity, status, and elapsed time
  - **So that** I can manage capacity and intervene on stalled cases
  - **Pages**: ER Tracker Board, Patient Quick-View Modal

- **Story 3.4 – Remote / Tele-Triage Intake**
  - **As a** Triage Officer
  - **I want to** perform pre-arrival triage assessment for inbound patients via a tele-triage channel
  - **So that** acuity, expected arrival, and resource needs are queued before the patient reaches the ER (per Module 2 "Tele-Triage Management")
  - **Pages**: Tele-Triage Intake Page, Inbound Patient Queue

---

## 4. Clinical Documentation

- **Story 4.1 – SOAP Note Authoring**
  - **As a** Physician
  - **I want to** author clinical notes using structured templates (e.g., SOAP, FPE)
  - **So that** documentation is consistent and supports automated claim generation
  - **Pages**: Note Editor Page, Template Selector Page

- **Story 4.2 – Note Signing and Amendment**
  - **As a** Physician
  - **I want to** electronically sign clinical notes and create amendments when corrections are required
  - **So that** the chart maintains a legally defensible audit history
  - **Pages**: Note Signing Page, Amendment Page, Note History Page

- **Story 4.3 – PhilHealth First Patient Encounter (FPE) Capture**
  - **As a** Physician
  - **I want to** complete the structured FPE health screening template
  - **So that** PhilHealth Konsulta capitation requirements are fulfilled
  - **Pages**: FPE Template Page, FPE Submission Page

- **Story 4.4 – Electronic Consent Capture**
  - **As a** Nurse
  - **I want to** capture electronic patient consent before sensitive data transmission or procedures
  - **So that** the facility complies with the Data Privacy Act
  - **Pages**: Consent Capture Page, Consent Library Page

- **Story 4.5 – Problem List & Allergy Management**
  - **As a** Physician
  - **I want to** maintain a longitudinal problem list and allergy/adverse reaction record
  - **So that** active allergies block conflicting CPOE orders and improve safety
  - **Pages**: Problem List Page, Allergy Management Page

---

## 5. CPOE & Electronic Prescribing

- **Story 5.1 – Place Medication Order with Generics Enforcement**
  - **As a** Physician
  - **I want to** place medication orders with the generic drug name selected first
  - **So that** prescriptions comply with the Generics Act of 1988
  - **Pages**: CPOE Medication Order Page, Drug Search Page

- **Story 5.2 – Generate FDA-Compliant e-Prescription**
  - **As a** Physician
  - **I want to** generate an electronic prescription with my PRC and PTR numbers automatically appended
  - **So that** the prescription is legally valid for outpatient dispensing
  - **Pages**: e-Prescription Page, Prescription Print/Send Page

- **Story 5.3 – PDEA-Compliant Controlled Drug Prescribing**
  - **As a** Physician with an active S-2 License
  - **I want to** prescribe List A controlled drugs with automatic 30-day tranching for orders beyond 30 days (max 90 days)
  - **So that** prescriptions follow PDEA dispensing rules with "No Refill" inscriptions
  - **Pages**: Controlled Drug CPOE Page, S-2 Validation Page

- **Story 5.4 – Allergy & High-Alert Decision Support**
  - **As a** Physician
  - **I want to** receive alerts only for absolute allergy blocks, formulary constraints, and DOH-mandated high-alert double verification
  - **So that** alert fatigue is minimized while patient safety is protected
  - **Pages**: CPOE Alert Modal, High-Alert Verification Page

- **Story 5.5 – Lab and Imaging Order Entry**
  - **As a** Physician
  - **I want to** place lab and imaging orders through CPOE
  - **So that** Lab Tech and Radiologist staff receive structured digital requisitions in real time
  - **Pages**: Lab Order Page, Imaging Order Page, Order Set Page

---

## 6. Maternal, Neonatal & Newborn Screening

- **Story 6.1 – Newborn Screening Logbook**
  - **As a** Nurse
  - **I want to** record newborn screening with precise time-of-birth vs. time-of-screening
  - **So that** the 24–48 hour screening window mandated by NBS protocols is enforced
  - **Pages**: NBS Logbook Page, NBS Specimen Capture Page

- **Story 6.2 – Parental Consent / Waiver Capture**
  - **As a** Nurse
  - **I want to** capture electronic parental consent or waiver for newborn screening
  - **So that** statutory consent obligations are met and auditable
  - **Pages**: NBS Consent Page, Waiver Page

- **Story 6.3 – NBS Positive Result Referral Tracking**
  - **As a** Nurse
  - **I want to** track referral pathways for newborns with positive screening results
  - **So that** required follow-up care is documented and not missed
  - **Pages**: NBS Referral Tracker, NBS Outcome Page

- **Story 6.4 – Maternal Death Reporting Trigger (FMDRF)**
  - **As a** Physician
  - **I want to** be alerted to complete the Facility Maternal Death Reporting Form when a reproductive-age female patient expires
  - **So that** MNDRS reporting requirements are fulfilled automatically
  - **Pages**: FMDRF Form Page, Maternal Death Alert Page

- **Story 6.5 – Neonatal Death Reporting Trigger (FNDRF)**
  - **As a** Physician
  - **I want to** be alerted to complete the Facility Neonatal Death Reporting Form when a neonate expires
  - **So that** mandatory neonatal mortality reporting is captured
  - **Pages**: FNDRF Form Page, Neonatal Death Alert Page

---

## 7. Nursing Care, MAR/TAR & Vitals

- **Story 7.1 – Vital Signs & Flowsheet Documentation**
  - **As a** Nurse
  - **I want to** record vitals (BP, temperature, HR, RR, SpO₂) on a structured flowsheet
  - **So that** trends are visible and early warning scores (e.g., NEWS) are computed automatically
  - **Pages**: Vitals Entry Page, Flowsheet Page

- **Story 7.2 – Medication Administration Record (MAR)**
  - **As a** Nurse
  - **I want to** administer medications using the MAR, document PRN reasons, and capture barcode scans
  - **So that** medication safety is enforced at the bedside
  - **Pages**: MAR Page, PRN Documentation Page, Barcode Scan Page

- **Story 7.3 – Treatment Administration Record (TAR)**
  - **As a** Nurse
  - **I want to** document treatments administered using the TAR
  - **So that** non-medication interventions are tracked alongside medication orders
  - **Pages**: TAR Page

- **Story 7.4 – Intake & Output Tracking**
  - **As a** Nurse
  - **I want to** record patient intake and output throughout the shift
  - **So that** fluid balance is monitored for clinical decisions
  - **Pages**: I/O Tracking Page

- **Story 7.5 – Shift Handoff Documentation**
  - **As a** Nurse
  - **I want to** generate and review SBAR-style shift handoff notes
  - **So that** continuity of care is preserved across shifts
  - **Pages**: Shift Handoff Page, SBAR Template Page

- **Story 7.6 – HAI Tagging**
  - **As a** Nurse
  - **I want to** tag Healthcare-Associated Infections (VAP, BSI, UTI, SSI) on the patient chart
  - **So that** the data feeds DOH AHSR HAI surveillance metrics
  - **Pages**: HAI Tagging Page, HAI Surveillance Dashboard

---

## 8. Laboratory, Blood Bank & Imaging

- **Story 8.1 – Lab Result Entry & Validation**
  - **As a** Lab Tech
  - **I want to** enter and validate lab results manually when LIS integration is unavailable
  - **So that** results are still released to clinicians during downtime
  - **Pages**: Manual Result Entry Page, Result Validation Page

- **Story 8.2 – Critical Result Flagging**
  - **As a** Lab Tech
  - **I want to** mark lab results as critical and route them directly to the ordering Physician
  - **So that** life-threatening values are acted upon promptly
  - **Pages**: Critical Result Page, Result Notification Inbox

- **Story 8.3 – Blood Bank Cross-Match Approval**
  - **As a** Blood Bank officer
  - **I want to** digitally approve IPD cross-match requests
  - **So that** transfusion authorization is tracked end-to-end
  - **Pages**: Cross-Match Approval Page, Blood Product Inventory Page

- **Story 8.4 – Bedside Transfusion Verification**
  - **As a** Nurse
  - **I want to** scan barcodes for patient, blood product, and CPOE order before transfusion
  - **So that** transfusion errors are prevented through system-controlled matching
  - **Pages**: Transfusion Verification Page, Transfusion Documentation Page

- **Story 8.5 – Radiology Report Attachment & PACS Link**
  - **As a** Radiologist
  - **I want to** attach radiology reports and link to the external PACS viewer
  - **So that** Physicians can view imaging without leaving the EMR
  - **Pages**: Radiology Report Page, PACS Viewer Embed Page

- **Story 8.6 – Ancillary Procedure Barcode Logging**
  - **As a** Lab Tech or Radiologist
  - **I want to** scan the patient barcode at procedure start and end so the EMR records exact start/end timestamps
  - **So that** ancillary turnaround time is measurable for ARTA Flow 3 SLAs and procedure auditability
  - **Pages**: Ancillary Procedure Logging Page, Barcode Scan Modal

---

## 9. Operating Room & Surgical Services

- **Story 9.1 – Operative Record Charting**
  - **As a** Surgeon
  - **I want to** document the operative technique, personnel, and timestamps in the Operation Record
  - **So that** the surgical record meets legal and PhilHealth documentation requirements
  - **Pages**: Operation Record Page, OR Personnel Page

- **Story 9.2 – Anesthesia Record Charting**
  - **As an** Anesthesiologist
  - **I want to** document airway management and intraoperative vitals on the Anesthesia Record
  - **So that** anesthesia care is fully captured and auditable
  - **Pages**: Anesthesia Record Page, Intraoperative Vitals Flowsheet

- **Story 9.3 – RVS Code Capture for Procedures**
  - **As a** Surgeon
  - **I want to** map every surgical procedure to its Relative Value Scale (RVS) code
  - **So that** PhilHealth procedural claims can be processed correctly
  - **Pages**: RVS Code Selection Page, Procedure Mapping Page

- **Story 9.4 – OR Schedule Management**
  - **As a** Scheduler
  - **I want to** schedule surgical cases against operating room availability
  - **So that** OR utilization is optimized and conflicts avoided
  - **Pages**: OR Schedule Page, Case Booking Page

---

## 10. Pharmacy Verification & Dispensing

- **Story 10.1 – Clinical Verification of Medication Orders**
  - **As a** Pharmacist
  - **I want to** verify medication orders for appropriateness, interactions, and dosing against patient weight and labs
  - **So that** medications are safe before they appear on the MAR
  - **Pages**: Pharmacy Verification Queue, Medication Verification Page

- **Story 10.2 – Formulary Note Management**
  - **As a** Pharmacist
  - **I want to** maintain formulary notes and constraints
  - **So that** prescribers receive guidance without inventory-level coupling
  - **Pages**: Formulary Management Page, Formulary Note Editor

- **Story 10.3 – Outpatient Pharmacy Dispensing**
  - **As a** Pharmacist
  - **I want to** scan an e-Prescription barcode/MRN to retrieve valid CPOE prescriptions and dispense medications
  - **So that** outpatients receive their prescribed therapy with full counseling logged
  - **Pages**: Outpatient Dispensing Page, Patient Counseling Log Page

---

## 11. Nutrition Services

- **Story 11.1 – Nutrition Assessment**
  - **As a** Dietitian
  - **I want to** conduct and document a comprehensive nutrition assessment
  - **So that** malnutrition risk is identified and addressed during the encounter
  - **Pages**: Nutrition Assessment Page, Malnutrition Risk Page

- **Story 11.2 – Therapeutic Meal Plan & NutritionOrder**
  - **As a** Dietitian
  - **I want to** create therapeutic meal plans and author HL7 FHIR NutritionOrders
  - **So that** dietary instructions integrate with the rest of the chart and downstream systems
  - **Pages**: Meal Plan Page, NutritionOrder Editor

---

## 12. Revenue Cycle Management (RCM), eClaims & PhilHealth

- **Story 12.1 – Charge Capture**
  - **As a** Billing Officer
  - **I want to** capture charges for clinical services rendered
  - **So that** invoices accurately reflect the care delivered
  - **Pages**: Charge Capture Page, Service Item Page

- **Story 12.2 – Invoice & Payment Processing**
  - **As a** Billing Officer
  - **I want to** generate patient invoices, record payments, and issue receipts
  - **So that** revenue is collected and tracked
  - **Pages**: Invoice Page, Payment Entry Page, Receipt Page

- **Story 12.3 – Automated Claim Form 4 (CF4) Generation**
  - **As a** Billing Officer
  - **I want to** automatically generate the PhilHealth CF4 XML from finalized clinical notes
  - **So that** eClaims submission requires no manual data abstraction
  - **Pages**: CF4 Generation Page, eClaims Submission Page

- **Story 12.4 – DRG Shadow Billing (CF5)**
  - **As a** Billing Officer
  - **I want to** prepare and submit DRG Shadow Billing (CF5) claims
  - **So that** the facility participates in PhilHealth DRG initiatives
  - **Pages**: CF5 Page, DRG Mapping Page

- **Story 12.5 – Electronic Statement of Account (eSOA)**
  - **As a** Billing Officer
  - **I want to** generate the eSOA in the required XML format
  - **So that** patients receive a fully itemized, PhilHealth-compliant statement
  - **Pages**: eSOA Page, Statement Preview Page

- **Story 12.6 – PhilHealth Eligibility Web Services (CEWS) Check**
  - **As a** Billing Officer
  - **I want to** verify PhilHealth member eligibility via CEWS
  - **So that** coverage and benefit availability are confirmed before billing
  - **Pages**: Eligibility Check Page, Membership Verification Page

- **Story 12.7 – Konsulta Capitation Tracking**
  - **As a** Billing Officer
  - **I want to** track Konsulta capitation activities per patient
  - **So that** capitation reimbursements are claimed correctly
  - **Pages**: Konsulta Tracker Page, Capitation Report Page

- **Story 12.8 – MSW Financial Evaluation & CoE Issuance**
  - **As a** Social Worker
  - **I want to** evaluate patient finances and issue a Certificate of Eligibility (CoE)
  - **So that** qualifying patients receive Malasakit, Z-Benefits, or other assistance
  - **Pages**: MSW Assessment Page, CoE Issuance Page

- **Story 12.9 – PhilHealth Annex A & B Digital Signature Capture**
  - **As a** Social Worker
  - **I want to** capture and archive digital signatures for PhilHealth Annex A (Informed Consent) and Annex B (Member Empowerment)
  - **So that** capitation and Z-Benefits claims meet documentation requirements
  - **Pages**: Annex A/B Signature Page, Signed Forms Archive

- **Story 12.10 – Malasakit Center Tracking**
  - **As a** Social Worker
  - **I want to** track patient assistance routed through the Malasakit Center
  - **So that** all forms of subsidy are documented and reconciled
  - **Pages**: Malasakit Tracking Page

- **Story 12.11 – Ancillary Service Clearance (Malasakit / PhilHealth)**
  - **As a** Social Worker
  - **I want to** process Malasakit / PhilHealth coverage at the point of an ancillary order so the EMR flips status from "Pending Payment" to "Cleared for Procedure"
  - **So that** OPD and walk-in patients are not blocked at lab, imaging, or pharmacy queues (per ARTA Flow 3 and Flow 6)
  - **Pages**: Ancillary Clearance Page, Coverage Application Page

---

## 13. Scheduling & Appointments

- **Story 13.1 – Clinic Template Setup**
  - **As a** Scheduler
  - **I want to** define clinic schedule templates and appointment slots
  - **So that** providers' availability is reflected accurately
  - **Pages**: Clinic Template Page, Slot Management Page

- **Story 13.2 – Appointment Booking & Check-In**
  - **As a** Scheduler
  - **I want to** book patient appointments and process check-ins
  - **So that** OPD flow is orderly and queue numbers are issued correctly
  - **Pages**: Appointment Booking Page, Check-In Page, OPD Queue Board

---

## 14. Telemedicine

- **Story 14.1 – Virtual Encounter Logging**
  - **As a** Physician
  - **I want to** initiate a virtual encounter via an integrated commercial video platform link (Zoom/Teams)
  - **So that** telemedicine consultations are documented natively in the EMR
  - **Pages**: Telemedicine Encounter Page, Video Link Launch Page

- **Story 14.2 – Tele-Encounter Clinical Abstract & e-Rx**
  - **As a** Physician
  - **I want to** generate a clinical abstract and digitally signed e-prescription from a telemedicine encounter
  - **So that** patients receive proper records and prescriptions without an in-person visit
  - **Pages**: Tele-Abstract Page, Tele e-Prescription Page

---

## 15. Health Information Management (HIM) & Coding

- **Story 15.1 – Chart Deficiency Tracking**
  - **As a** HIM Coder
  - **I want to** track and resolve chart deficiencies after discharge
  - **So that** records are complete for billing, coding, and legal purposes
  - **Pages**: Deficiency Worklist, Deficiency Detail Page

- **Story 15.2 – ICD-10 Coding**
  - **As a** HIM Coder
  - **I want to** assign ICD-10 codes to diagnoses, especially top mortalities and morbidities
  - **So that** AHSR statistics are 100% accurate
  - **Pages**: ICD-10 Coding Page, Code Lookup Page

- **Story 15.3 – Medical Records Issuance**
  - **As a** HIM Coder
  - **I want to** process patient requests for medical records, certificates, and abstracts
  - **So that** authorized releases are tracked under DPA consent rules
  - **Pages**: Records Request Page, Document Release Page, Release Audit Page

- **Story 15.4 – HAI Surveillance & Reconciliation**
  - **As a** HIM Coder
  - **I want to** review and reconcile Nurse-tagged Healthcare-Associated Infections (VAP, BSI, UTI, SSI) against finalized ICD-10 codes
  - **So that** HAI metrics submitted to the DOH AHSR are accurate and audit-ready (per Section 1, HIM Coder responsibilities)
  - **Pages**: HAI Reconciliation Worklist, HAI Surveillance Report Page

---

## 16. Statutory & Public Health Reporting

- **Story 16.1 – PIDSR Notifiable Disease Detection**
  - **As a** Surveillance officer
  - **I want to** automatically detect Category 1 and 2 notifiable diseases via syndromic keywords and ICD-10 codes
  - **So that** PIDSR transmissions occur within the mandated reporting windows
  - **Pages**: PIDSR Alert Inbox, PIDSR Submission Page

- **Story 16.2 – AHSR Data Aggregation**
  - **As a** Surveillance officer
  - **I want to** aggregate and validate the DOH Annual Hospital Statistical Report (AHSR) data
  - **So that** the facility renews its DOH License to Operate without manual auditing
  - **Pages**: AHSR Dashboard, AHSR Validation Page, AHSR Export Page

- **Story 16.3 – Mortality & Morbidity Reporting**
  - **As a** Surveillance officer
  - **I want to** review the system-computed top 10 mortalities/morbidities mapped from finalized ICD-10 codes
  - **So that** statutory reports are produced without chart-by-chart abstraction
  - **Pages**: Mortality/Morbidity Report Page

---

## 17. Interoperability (HL7 FHIR & NHDR)

- **Story 17.1 – FHIR R4 Resource Exchange**
  - **As an** Administrator
  - **I want to** configure FHIR R4 endpoints for integration with the National Health Data Repository (NHDR)
  - **So that** the facility complies with national interoperability mandates
  - **Pages**: FHIR Endpoint Configuration Page, FHIR Exchange Log Page

- **Story 17.2 – Standardized Terminology Enforcement**
  - **As an** Administrator
  - **I want to** enforce ICD-10 / SNOMED CT / LOINC / RxNorm / RVS terminologies across modules
  - **So that** clinical data remains semantically interoperable
  - **Pages**: Terminology Management Page, Code Set Page

---

## 18. Offline Capability & Resilience

- **Story 18.1 – Offline Patient Summary Caching**
  - **As a** Physician
  - **I want to** access cached patient summaries during internet or power outages
  - **So that** essential care continues uninterrupted
  - **Pages**: Offline Mode Indicator, Cached Patient Summary Page

- **Story 18.2 – Auto-Synchronization on Reconnect**
  - **As a** Nurse
  - **I want to** have offline-charted documentation synchronize automatically when connectivity returns
  - **So that** no documentation is lost and the master record stays consistent
  - **Pages**: Sync Status Page, Sync Conflict Resolution Page

---

## 19. ARTA Compliance & SLA Monitoring

- **Story 19.1 – Workflow Time-Stamping**
  - **As an** Administrator
  - **I want to** ensure every workflow status change is automatically time-stamped in the background
  - **So that** turnaround times can be measured against Citizen's Charter SLAs
  - **Pages**: SLA Configuration Page, Workflow Status Log Page

- **Story 19.2 – Citizen's Charter Turnaround Reporting**
  - **As an** Administrator
  - **I want to** generate Citizen's Charter Turnaround Time reports per workflow (OPD, ER, Discharge, etc.)
  - **So that** the hospital can demonstrate ARTA compliance and improve service delivery
  - **Pages**: SLA Dashboard, Turnaround Report Page, Bottleneck Analysis Page

---

## 20. System Administration & Configuration

- **Story 20.1 – Facility Profile & Department Setup**
  - **As an** Administrator
  - **I want to** configure the facility profile, departments, wards, and service points
  - **So that** the EMR mirrors the hospital's operational structure
  - **Pages**: Facility Settings Page, Department Setup Page, Ward Configuration Page

- **Story 20.2 – Master Data Management**
  - **As an** Administrator
  - **I want to** manage master data (drug formulary, lab catalog, RVS catalog, ICD-10 sets)
  - **So that** clinical and billing modules use consistent reference data
  - **Pages**: Master Data Dashboard, Catalog Editor Page

- **Story 20.3 – Integration Settings (ERP, LIS, PACS, Telemed)**
  - **As an** Administrator
  - **I want to** configure API integrations with ERP, LIS, PACS, and telemedicine platforms
  - **So that** the EMR remains focused on clinical care while interoperating with adjacent systems
  - **Pages**: Integration Settings Page, API Key Management Page

---

## Appendix A: Role-to-Story Coverage Matrix

| Seeded Role | Primary Stories |
|---|---|
| **Administrator** | 1.2, 1.3, 1.4, 2.5, 17.1, 17.2, 19.1, 19.2, 20.1, 20.2, 20.3 |
| **Registrar** | 2.1, 2.2, 2.3, 2.4, 2.6, 2.8, 2.9 |
| **Scheduler** | 9.4, 13.1, 13.2 |
| **Triage Officer** | 2.7, 3.1, 3.4 |
| **Physician** | 1.5, 3.2, 4.1, 4.2, 4.3, 4.5, 5.1–5.5, 6.4, 6.5, 14.1, 14.2, 18.1 |
| **Surgeon** | 9.1, 9.3 |
| **Anesthesiologist** | 9.2 |
| **Nurse** | 3.3, 4.4, 6.1, 6.2, 6.3, 7.1–7.6, 8.4, 18.2 |
| **Dietitian** | 11.1, 11.2 |
| **Pharmacist** | 10.1, 10.2, 10.3 |
| **Lab Tech** | 8.1, 8.2, 8.6 |
| **Radiologist** | 8.5, 8.6 |
| **Blood Bank** | 8.3 |
| **Billing Officer** | 12.1–12.7 |
| **Social Worker** | 12.8, 12.9, 12.10, 12.11 |
| **HIM Coder** | 15.1, 15.2, 15.3, 15.4 |
| **Surveillance** | 16.1, 16.2, 16.3 |
| **Auditor** | 1.6 |
| **Patient / Proxy** *(external)* | 1.7 |
