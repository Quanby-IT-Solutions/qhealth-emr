# QHealth EMR System - User Stories

## 1. User Management & Authentication

### Story 1.1
- **As a** System Admin
- **I want to** create and manage user accounts with role assignments
- **So that** staff can access EMR features appropriate to their responsibilities
- **Pages:** User Management Dashboard, Create User Page, Edit User Page, Role Assignment Page

### Story 1.2
- **As a** System Admin
- **I want to** configure system-wide settings and feature flags
- **So that** I can enable/disable features based on facility requirements
- **Pages:** System Configuration Page, Feature Flags Page, Settings Dashboard

### Story 1.3
- **As a** Clinician
- **I want to** register and validate my PRC License, PTR, and PDEA S-2 credentials
- **So that** I can generate legally compliant electronic prescriptions
- **Pages:** Clinician Registration Page, License Validation Page, Credential Management Page

### Story 1.4
- **As a** User
- **I want to** securely log in with role-based access
- **So that** I can access only the features permitted for my role
- **Pages:** Login Page, Password Reset Page, MFA Verification Page

### Story 1.5
- **As a** Auditor/Privacy Officer
- **I want to** view detailed audit logs of all system activity
- **So that** I can ensure Data Privacy Act compliance
- **Pages:** Audit Log Dashboard, Activity Search Page, Compliance Report Page

### Story 1.6
- **As a** Break-Glass Clinician
- **I want to** gain emergency read-access to a patient chart with justification
- **So that** I can provide urgent care when normal access is unavailable
- **Pages:** Break-Glass Access Request Page, Emergency Access Justification Modal, Break-Glass Audit Log Page

---

## 2. ADT (Admission, Discharge, Transfer) & Bed Management

### Story 2.1
- **As a** Registrar
- **I want to** search for existing patients or create new patient records
- **So that** I can initiate clinical encounters with accurate patient identification
- **Pages:** Patient Search Page, Patient Registration Page, Patient Profile Page

### Story 2.2
- **As a** Registrar
- **I want to** create and manage patient encounters (inpatient, outpatient, emergency)
- **So that** all clinical activities are properly tracked under a visit context
- **Pages:** Encounter Creation Page, Encounter Details Page, Encounter History Page

### Story 2.3
- **As a** Registrar
- **I want to** assign and transfer patients to beds/locations
- **So that** bed utilization is accurately tracked for DOH reporting
- **Pages:** Bed Management Dashboard, Bed Assignment Page, Transfer Request Page

### Story 2.4
- **As a** Registrar
- **I want to** process patient discharges with disposition documentation
- **So that** encounter closure is complete and accurate for billing
- **Pages:** Discharge Planning Page, Discharge Summary Page, Administrative Discharge Checklist

### Story 2.5
- **As a** Registrar
- **I want to** generate Birth and Death Certificates integrated with Local Civil Registry
- **So that** official documents are accurately linked to patient records
- **Pages:** Birth Certificate Generation Page, Death Certificate Generation Page, Civil Registry Integration Page

### Story 2.6
- **As a** System Admin
- **I want to** view real-time Bed Occupancy Rate (BOR) based on midnight census
- **So that** DOH-mandated statistics are automatically calculated
- **Pages:** BOR Dashboard, Census Report Page, Occupancy Analytics Page

### Story 2.7
- **As a** HIM Coder
- **I want to** view Gross/Net Death Rates computed by admission vs death time
- **So that** mortality statistics (<48hrs vs >48hrs) are accurately reported
- **Pages:** Mortality Statistics Dashboard, Death Rate Analytics Page

---

## 3. Emergency Department (ED) & Tele-Triage Management

### Story 3.1
- **As a** Triage Officer
- **I want to** assign clinical acuity scores using standardized scales (ESI, ATS, CTAS)
- **So that** patients are prioritized before formal registration
- **Pages:** Triage Assessment Page, Acuity Score Assignment Modal, Triage Queue Dashboard

### Story 3.2
- **As a** Triage Officer
- **I want to** create Pre-Encounter charts with Trauma Alias
- **So that** rapid clinical charting can begin before financial registration
- **Pages:** Pre-Encounter Creation Page, Trauma Alias Assignment Page, Anonymous Patient Chart

### Story 3.3
- **As a** Registrar
- **I want to** merge temporary Pre-Encounter charts with permanent MRNs
- **So that** clinical documentation is unified under the correct patient identity
- **Pages:** Chart Merge Page, MRN Resolution Modal, Duplicate Patient Management Page

### Story 3.4
- **As a** Clinician
- **I want to** tag ED dispositions for Outpatient Emergency Care Benefit (OECB)
- **So that** non-admitted cases route correctly to PhilHealth billing
- **Pages:** ED Disposition Page, OECB Tagging Modal, ED Summary Page

### Story 3.5
- **As a** Triage Officer
- **I want to** view and manage the ED patient queue in real-time
- **So that** high-acuity patients are seen promptly
- **Pages:** ED Queue Dashboard, Patient Tracking Board, Waiting Time Monitor

---

## 4. Clinical Documentation

### Story 4.1
- **As a** Clinician
- **I want to** author clinical notes using structured templates
- **So that** documentation is standardized and complete
- **Pages:** Clinical Note Editor, Template Selection Page, Note Templates Library

### Story 4.2
- **As a** Clinician
- **I want to** digitally sign and finalize my clinical notes
- **So that** notes become part of the legal medical record
- **Pages:** Note Signing Modal, Digital Signature Capture, Finalized Notes View

### Story 4.3
- **As a** Clinician
- **I want to** create amendments to signed notes with addendum documentation
- **So that** corrections are transparent and audit-compliant
- **Pages:** Amendment Creation Page, Addendum Form, Note Revision History

### Story 4.4
- **As a** Clinician
- **I want to** use PhilHealth First Patient Encounter (FPE) templates
- **So that** Konsulta health screenings are properly documented
- **Pages:** FPE Template Page, Health Screening Form, Konsulta Documentation Page

### Story 4.5
- **As a** Clinician
- **I want to** capture patient consent electronically before data transmission
- **So that** DPA compliance is maintained for sensitive information sharing
- **Pages:** Consent Capture Page, Electronic Signature Pad, Consent Management Dashboard

---

## 5. CPOE & Electronic Prescribing

### Story 5.1
- **As a** Clinician
- **I want to** place medication orders by selecting generic drug names first
- **So that** I comply with the Generics Act of 1988
- **Pages:** Medication Order Page, Generic Drug Search, Brand Name Subordinate Selector

### Story 5.2
- **As a** Clinician
- **I want to** place laboratory and imaging orders
- **So that** diagnostic requests are electronically communicated
- **Pages:** Lab Order Page, Imaging Order Page, Order Set Templates Page

### Story 5.3
- **As a** Clinician
- **I want to** generate e-prescriptions with auto-appended PRC and PTR numbers
- **So that** prescriptions comply with FDA e-Rx mandates
- **Pages:** e-Prescription Generation Page, Prescription Preview, Prescription Print/Send Page

### Story 5.4
- **As a** Clinician
- **I want to** order List A dangerous drugs with S-2 license validation
- **So that** PDEA regulations are automatically enforced
- **Pages:** Controlled Substance Order Page, S-2 License Validation Modal, PDEA Compliance Alert

### Story 5.5
- **As a** Clinician
- **I want to** receive allergy alerts and formulary constraints during ordering
- **So that** patient safety is maintained without alert fatigue
- **Pages:** Order Entry Page, Allergy Alert Modal, Formulary Restriction Alert, High-Alert Medication Verification

### Story 5.6
- **As a** System
- **I want to** automatically divide Schedule IV orders >30 days into tranches
- **So that** 90-day supply limits with "No Refill" inscriptions are enforced
- **Pages:** Controlled Substance Tranche Summary, Temporal Dispensing Instructions Page

---

## 6. Maternal, Neonatal, and Newborn Screening

### Story 6.1
- **As a** Nurse/Midwife
- **I want to** record newborn screening data with precise timestamp tracking
- **So that** 24-48 hour screening rules are enforced
- **Pages:** NBS Registration Page, Time-of-Birth Entry, Screening Timestamp Tracker

### Story 6.2
- **As a** Nurse/Midwife
- **I want to** capture electronic parental consent/waiver for NBS
- **So that** mandatory consent documentation is digitally archived
- **Pages:** NBS Consent Form, Electronic Waiver Capture, Consent Audit Trail

### Story 6.3
- **As a** Nurse/Midwife
- **I want to** maintain a digital NBS logbook
- **So that** screening compliance is tracked and reported
- **Pages:** NBS Logbook Dashboard, Screening Status Tracker, Positive Result Referral Page

### Story 6.4
- **As a** Clinician
- **I want to** be alerted when a reproductive-age female or neonate death occurs
- **So that** I can complete FMDRF or FNDRF forms as required
- **Pages:** MNDRS Alert Modal, FMDRF Completion Form, FNDRF Completion Form

### Story 6.5
- **As a** Statutory Reporting Officer
- **I want to** extract and submit maternal/neonatal death reports
- **So that** DOH MNDRS requirements are fulfilled
- **Pages:** MNDRS Report Dashboard, Death Report Extraction Page, Submission Tracker

---

## 7. Nursing Module & MAR/TAR

### Story 7.1
- **As a** Nurse
- **I want to** view and administer medications from the MAR
- **So that** medication administration is accurately documented
- **Pages:** MAR Dashboard, Medication Administration Page, Barcode Scan Verification

### Story 7.2
- **As a** Nurse
- **I want to** document treatments and track TAR completion
- **So that** treatment orders are followed and recorded
- **Pages:** TAR Dashboard, Treatment Documentation Page, Treatment Completion Tracker

### Story 7.3
- **As a** Nurse
- **I want to** document PRN medication reasons and responses
- **So that** as-needed medication usage is properly justified
- **Pages:** PRN Documentation Modal, Response Assessment Form, PRN History Log

### Story 7.4
- **As a** Nurse
- **I want to** create and review shift handoff documentation
- **So that** care continuity is maintained between shifts
- **Pages:** Shift Handoff Report, Handoff Summary Generator, Shift Change Dashboard

### Story 7.5
- **As a** Nurse
- **I want to** track Intake/Output (I/O) for patients
- **So that** fluid balance is accurately monitored
- **Pages:** I/O Tracking Page, Fluid Balance Summary, I/O Chart

### Story 7.6
- **As a** Nurse
- **I want to** tag Healthcare-Associated Infections (HAI) occurrences
- **So that** VAP, BSI, UTI, and SSI cases are tracked for AHSR reporting
- **Pages:** HAI Tagging Modal, Infection Type Selection, HAI Surveillance Dashboard

---

## 8. Problems & Allergies

### Story 8.1
- **As a** Clinician
- **I want to** manage a patient's longitudinal problem list
- **So that** active and resolved diagnoses are tracked over time
- **Pages:** Problem List Page, Add Problem Modal, Problem History View

### Story 8.2
- **As a** Clinician
- **I want to** document allergies and adverse drug reactions
- **So that** CPOE can enforce allergy blocking
- **Pages:** Allergy Documentation Page, Reaction Severity Selector, Allergy History View

### Story 8.3
- **As a** Clinician
- **I want to** view allergy alerts prominently on patient charts
- **So that** critical safety information is immediately visible
- **Pages:** Patient Header with Allergy Banner, Allergy Detail Popup, Safety Alert Dashboard

---

## 9. Vitals & Flowsheets

### Story 9.1
- **As a** Nurse
- **I want to** record patient vital signs with timestamps
- **So that** clinical trends are accurately documented
- **Pages:** Vitals Entry Page, Vital Signs Flowsheet, Vital Trends Chart

### Story 9.2
- **As a** Nurse
- **I want to** view automated early-warning scores (e.g., NEWS)
- **So that** deteriorating patients are quickly identified
- **Pages:** Early Warning Score Dashboard, NEWS Calculator, Escalation Alert Page

### Story 9.3
- **As a** Nurse
- **I want to** customize flowsheet columns for specific observations
- **So that** unit-specific monitoring needs are met
- **Pages:** Flowsheet Configuration Page, Custom Observation Template, Flowsheet View

---

## 10. Laboratory & Blood Bank Management

### Story 10.1
- **As a** Lab Technologist
- **I want to** manually enter and validate lab results
- **So that** results are available when LIS integration is unavailable
- **Pages:** Manual Result Entry Page, Result Validation Page, Lab Worklist

### Story 10.2
- **As a** Clinician
- **I want to** view finalized laboratory results
- **So that** I can make informed clinical decisions
- **Pages:** Lab Results Dashboard, Result Detail Page, Cumulative Lab View

### Story 10.3
- **As a** Nurse
- **I want to** perform barcode bedside matching for blood transfusions
- **So that** patient-product-order verification is confirmed
- **Pages:** Transfusion Verification Page, Barcode Scanner Interface, Cross-Match Approval Modal

### Story 10.4
- **As a** Clinician
- **I want to** digitally approve IPD cross-match requests
- **So that** transfusion orders proceed with proper authorization
- **Pages:** Cross-Match Approval Queue, Blood Product Request Page, Transfusion Authorization Form

---

## 11. RIS/PACS Link

### Story 11.1
- **As a** Radiology Staff
- **I want to** attach radiology reports to patient encounters
- **So that** imaging findings are part of the clinical record
- **Pages:** Report Attachment Page, Radiology Report Editor, Study Association Modal

### Story 11.2
- **As a** Radiology Staff
- **I want to** mark critical imaging results for immediate attention
- **So that** urgent findings are escalated to clinicians
- **Pages:** Critical Result Flag Modal, Urgent Alert Dashboard, Critical Finding Notification

### Story 11.3
- **As a** Clinician
- **I want to** access PACS viewer via secure URL link
- **So that** I can review imaging studies directly
- **Pages:** PACS Viewer Link, Study Thumbnail Preview, External Viewer Launcher

---

## 12. Operating Room and Surgical Services

### Story 12.1
- **As a** Surgeon
- **I want to** document the Operation Record with structured charting
- **So that** operative technique, personnel, and timestamps are captured
- **Pages:** Operation Record Page, Surgical Team Documentation, Operative Technique Template

### Story 12.2
- **As a** Anesthesiologist
- **I want to** document the Anesthesia Record
- **So that** airway management and intraoperative vitals are recorded
- **Pages:** Anesthesia Record Page, Intraoperative Vitals Chart, Airway Management Documentation

### Story 12.3
- **As a** Surgeon
- **I want to** capture and map RVS codes for procedures performed
- **So that** surgical cases route correctly to PhilHealth claims
- **Pages:** RVS Code Selection Page, Procedure Code Mapping, Surgical Billing Summary

### Story 12.4
- **As a** Scheduler
- **I want to** manage OR scheduling and room assignments
- **So that** surgical slots are efficiently utilized
- **Pages:** OR Schedule Dashboard, Room Assignment Page, Surgical Calendar

---

## 13. Pharmacy Verify

### Story 13.1
- **As a** Pharmacist
- **I want to** verify medication orders for clinical appropriateness
- **So that** prescriptions are safe before MAR availability
- **Pages:** Pharmacy Verification Queue, Order Review Page, Verification Approval Modal

### Story 13.2
- **As a** Pharmacist
- **I want to** review medications against patient weight and lab values
- **So that** dosing is appropriate for the patient's condition
- **Pages:** Dosing Calculator, Lab-Drug Interaction Checker, Weight-Based Dosing Alert

### Story 13.3
- **As a** Pharmacist
- **I want to** add formulary notes and substitution recommendations
- **So that** clinicians are informed of therapeutic alternatives
- **Pages:** Formulary Notes Page, Substitution Suggestion Modal, Formulary Management Dashboard

---

## 14. Clinical Nutrition

### Story 14.1
- **As a** Clinical Dietitian
- **I want to** conduct comprehensive nutrition assessments
- **So that** patient nutritional status is documented
- **Pages:** Nutrition Assessment Page, Anthropometric Data Entry, Diet History Form

### Story 14.2
- **As a** Clinical Dietitian
- **I want to** document malnutrition risk status
- **So that** at-risk patients are identified for intervention
- **Pages:** Malnutrition Screening Tool, Risk Stratification Page, Nutrition Risk Dashboard

### Story 14.3
- **As a** Clinical Dietitian
- **I want to** create therapeutic meal plans
- **So that** dietary interventions support patient recovery
- **Pages:** Meal Plan Builder, Diet Order Template, Therapeutic Diet Library

### Story 14.4
- **As a** Clinical Dietitian
- **I want to** author HL7 FHIR NutritionOrders
- **So that** nutrition orders are interoperable and standardized
- **Pages:** NutritionOrder Generator, FHIR Compliance Preview, Order Submission Page

---

## 15. Scheduling & Appointments

### Story 15.1
- **As a** Scheduler
- **I want to** create and manage clinic templates
- **So that** appointment availability reflects provider schedules
- **Pages:** Clinic Template Builder, Provider Schedule Page, Template Management Dashboard

### Story 15.2
- **As a** Scheduler
- **I want to** book patient appointments
- **So that** patients have confirmed visit slots
- **Pages:** Appointment Booking Page, Available Slots Calendar, Booking Confirmation Page

### Story 15.3
- **As a** Scheduler
- **I want to** check in patients upon arrival
- **So that** the clinical team is notified of patient presence
- **Pages:** Patient Check-In Page, Arrival Notification, Waiting List Dashboard

### Story 15.4
- **As a** Patient/Proxy
- **I want to** view my upcoming appointments
- **So that** I can plan my healthcare visits
- **Pages:** My Appointments Page, Appointment Details View, Appointment Reminder Settings

---

## 16. Billing & Revenue Cycle Management

### Story 16.1
- **As a** Biller
- **I want to** manage clinical charge capture
- **So that** billable services are accurately recorded
- **Pages:** Charge Capture Dashboard, Service Item Entry, Charge Review Page

### Story 16.2
- **As a** Biller
- **I want to** create patient invoices
- **So that** patients receive accurate statements of charges
- **Pages:** Invoice Generator, Invoice Preview, Invoice History

### Story 16.3
- **As a** Biller
- **I want to** record payments and issue receipts
- **So that** financial transactions are properly documented
- **Pages:** Payment Entry Page, Receipt Generator, Payment History Log

### Story 16.4
- **As a** Biller
- **I want to** generate PhilHealth Claim Form 4 (CF4) automatically
- **So that** eClaims submission requires no manual abstraction
- **Pages:** CF4 Auto-Generation Page, CF4 Review/Edit Page, eClaims Submission Dashboard

### Story 16.5
- **As a** Biller
- **I want to** manage DRG Shadow Billing (CF5)
- **So that** case rate claims are accurately prepared
- **Pages:** CF5 Management Page, DRG Assignment Tool, Shadow Billing Review

### Story 16.6
- **As a** Biller
- **I want to** generate electronic Statements of Account (eSOA)
- **So that** XML-formatted financial documents are compliant
- **Pages:** eSOA Generator, eSOA Preview, eSOA Submission Page

### Story 16.7
- **As a** Biller
- **I want to** check patient eligibility via PhilHealth CEWS
- **So that** coverage is verified before service delivery
- **Pages:** Eligibility Check Page, CEWS Integration Dashboard, Coverage Verification Result

---

## 17. Medical Social Work & Financial Assistance

### Story 17.1
- **As a** Medical Social Worker
- **I want to** evaluate patients for financial assistance eligibility
- **So that** qualifying patients receive support
- **Pages:** Financial Assessment Page, Eligibility Criteria Checklist, Assessment Summary

### Story 17.2
- **As a** Medical Social Worker
- **I want to** issue Certificates of Eligibility (CoE)
- **So that** patients can access assistance programs
- **Pages:** CoE Generation Page, CoE Template, Certificate Issuance Log

### Story 17.3
- **As a** Medical Social Worker
- **I want to** capture digital signatures for PhilHealth Annex A and B forms
- **So that** informed consent and member empowerment are documented
- **Pages:** Annex A (Informed Consent) Form, Annex B Form, Digital Signature Capture Pad

### Story 17.4
- **As a** Medical Social Worker
- **I want to** track Malasakit Center coordination
- **So that** patient assistance from multiple agencies is monitored
- **Pages:** Malasakit Tracking Dashboard, Agency Liaison Page, Assistance History Log

---

## 18. HIM & Medical Coding

### Story 18.1
- **As a** HIM Coder
- **I want to** manage chart deficiencies
- **So that** incomplete documentation is tracked and resolved
- **Pages:** Deficiency Dashboard, Deficiency Detail Page, Provider Notification Queue

### Story 18.2
- **As a** HIM Coder
- **I want to** assign ICD-10 codes to diagnoses and procedures
- **So that** clinical encounters are properly coded
- **Pages:** ICD-10 Coding Page, Code Search Tool, Diagnosis Code Assignment

### Story 18.3
- **As a** HIM Coder
- **I want to** ensure 100% accurate coding for top morbidities/mortalities
- **So that** AHSR reporting requirements are met
- **Pages:** Top 10 Coding Audit Dashboard, Coding Accuracy Report, Morbidity/Mortality Coding Queue

### Story 18.4
- **As a** HIM Coder
- **I want to** verify CF4 data extraction completeness
- **So that** PhilHealth claims have required documentation
- **Pages:** CF4 Completeness Checker, Missing Data Alert, CF4 Data Quality Dashboard

### Story 18.5
- **As a** HIM Coder
- **I want to** track Healthcare-Associated Infections (HAI)
- **So that** infection surveillance data is accurate
- **Pages:** HAI Tracking Dashboard, Infection Case Review, HAI Surveillance Report

---

## 19. Statutory & Public Health Reporting

### Story 19.1
- **As a** Statutory Reporting Officer
- **I want to** monitor and extract PIDSR Category 1 notifiable diseases
- **So that** immediate reporting requirements are fulfilled
- **Pages:** PIDSR Alert Dashboard, Category 1 Case List, Immediate Notification Form

### Story 19.2
- **As a** Statutory Reporting Officer
- **I want to** extract and report Category 2 notifiable diseases weekly
- **So that** surveillance reporting is timely and accurate
- **Pages:** Category 2 Extraction Page, Weekly Report Generator, PIDSR Submission Tracker

### Story 19.3
- **As a** Statutory Reporting Officer
- **I want to** generate the Annual Hospital Statistical Report (AHSR) data
- **So that** DOH LTO renewal requirements are met
- **Pages:** AHSR Dashboard, BOR Statistics Page, Morbidity/Mortality Report, HAI Metrics Summary

### Story 19.4
- **As a** Statutory Reporting Officer
- **I want to** validate and export AHSR data to DOH portals
- **So that** submission is complete and accurate
- **Pages:** AHSR Export Page, Data Validation Summary, DOH Submission Confirmation

### Story 19.5
- **As a** System
- **I want to** auto-detect syndromic keywords and ICD-10 codes for notifiable diseases
- **So that** potential cases are flagged for reporting officer review
- **Pages:** Syndromic Surveillance Engine, Auto-Flagged Cases Queue, False Positive Resolution Page

---

## 20. Telemedicine Integration

### Story 20.1
- **As a** Clinician
- **I want to** initiate telemedicine encounters within the EMR
- **So that** virtual visits are logged with clinical context
- **Pages:** Telemedicine Encounter Creation, Virtual Visit Dashboard, Video Platform Launch

### Story 20.2
- **As a** Clinician
- **I want to** generate electronic clinical abstracts from teleconsults
- **So that** patient takeaways are documented and shareable
- **Pages:** Clinical Abstract Generator, Abstract Preview, Patient Summary Download

### Story 20.3
- **As a** Clinician
- **I want to** issue digitally signed e-prescriptions from teleconsults
- **So that** remote patients can obtain medications legally
- **Pages:** Telemedicine e-Prescription Page, Digital Signature Application, Prescription Delivery Options

---

## 21. Patient Portal

### Story 21.1
- **As a** Patient/Proxy
- **I want to** securely access released portions of my medical record
- **So that** I can review my health information
- **Pages:** Patient Portal Login, My Health Records Page, Document Download

### Story 21.2
- **As a** Patient/Proxy
- **I want to** view static daily summaries of my care
- **So that** I stay informed without degrading system performance
- **Pages:** Daily Summary Page, Care Update Notifications, Summary History

### Story 21.3
- **As a** Patient/Proxy
- **I want to** manage my consent preferences
- **So that** I control how my data is shared
- **Pages:** Consent Preferences Page, Privacy Settings, Data Sharing Authorization

---

## 22. System Administration & Configuration

### Story 22.1
- **As a** System Admin
- **I want to** manage location and bed master data
- **So that** ADT workflows reference accurate facility structure
- **Pages:** Location Management Page, Bed Configuration Page, Ward/Unit Setup

### Story 22.2
- **As a** System Admin
- **I want to** configure clinical templates and order sets
- **So that** documentation and ordering are standardized
- **Pages:** Template Configuration Page, Order Set Builder, Clinical Content Library

### Story 22.3
- **As a** System Admin
- **I want to** manage formulary and drug master data
- **So that** CPOE uses current medication information
- **Pages:** Formulary Management Page, Drug Master Editor, Generic-Brand Mapping

### Story 22.4
- **As a** System Admin
- **I want to** configure triage scales and acuity parameters
- **So that** ED workflows match institutional protocols
- **Pages:** Triage Scale Configuration, Acuity Level Setup, ED Protocol Settings

### Story 22.5
- **As a** System Admin
- **I want to** manage ICD-10, LOINC, RxNorm, and RVS code sets
- **So that** terminology standards are current and complete
- **Pages:** Code Set Management Page, Terminology Update Tool, Code Mapping Dashboard

---

## 23. Offline Mode & Synchronization

### Story 23.1
- **As a** Clinician
- **I want to** access cached patient summaries during internet outages
- **So that** essential care documentation continues
- **Pages:** Offline Mode Indicator, Cached Patient Summary View, Limited Documentation Form

### Story 23.2
- **As a** System
- **I want to** automatically synchronize offline data upon connection restoration
- **So that** all documented care is captured in the central system
- **Pages:** Sync Status Dashboard, Conflict Resolution Page, Sync History Log

---

## 24. Interoperability & Data Exchange

### Story 24.1
- **As a** System Admin
- **I want to** configure HL7 FHIR R4 integrations
- **So that** data exchange with NHDR is seamless
- **Pages:** FHIR Integration Dashboard, Endpoint Configuration, Data Mapping Page

### Story 24.2
- **As a** System
- **I want to** enforce standardized terminology (ICD-10, SNOMED CT, LOINC, RxNorm, RVS)
- **So that** clinical data is interoperable
- **Pages:** Terminology Enforcement Settings, Code Validation Dashboard, Mapping Audit

### Story 24.3
- **As a** System Admin
- **I want to** manage ERP API integrations for excluded functions
- **So that** supply chain, HR, and financial systems connect properly
- **Pages:** ERP Integration Setup, API Configuration Page, Integration Health Monitor

---

## Appendix: Page Summary by Module

| Module | Key Pages |
|--------|-----------|
| **Authentication** | Login, Registration, Password Reset, MFA, License Validation |
| **User Management** | User Dashboard, Create/Edit User, Role Assignment, Feature Flags |
| **ADT & Bed Mgmt** | Patient Search, Registration, Encounter, Bed Management, Discharge, Census |
| **Emergency Dept** | Triage Assessment, Queue Dashboard, Pre-Encounter, OECB Tagging |
| **Clinical Docs** | Note Editor, Templates, Signing, Amendments, Consent Capture |
| **CPOE** | Medication/Lab/Imaging Orders, e-Prescription, S-2 Validation, Alerts |
| **Maternal/Neonatal** | NBS Logbook, Consent, MNDRS Forms, Death Reporting |
| **Nursing** | MAR, TAR, Vitals, Flowsheets, I/O, Handoff, HAI Tagging |
| **Problems/Allergies** | Problem List, Allergy Documentation, Safety Alerts |
| **Laboratory** | Result Entry, Validation, Transfusion Verification, Cross-Match |
| **Radiology** | Report Attachment, PACS Link, Critical Results |
| **OR/Surgical** | Operation Record, Anesthesia Record, RVS Coding, OR Schedule |
| **Pharmacy** | Verification Queue, Dosing Review, Formulary Notes |
| **Nutrition** | Assessment, Risk Screening, Meal Plans, FHIR Orders |
| **Scheduling** | Templates, Booking, Check-In, Calendar |
| **Billing/RCM** | Charges, Invoices, Payments, CF4/CF5, eSOA, CEWS |
| **Social Work** | Financial Assessment, CoE, Annex Forms, Malasakit Tracking |
| **HIM Coding** | Deficiencies, ICD-10 Assignment, CF4 Verification, HAI Tracking |
| **Statutory Reporting** | PIDSR Dashboard, AHSR Generator, Export Tools |
| **Telemedicine** | Virtual Encounter, Clinical Abstract, e-Prescription |
| **Patient Portal** | Health Records, Daily Summary, Consent Preferences |
| **Admin/Config** | System Settings, Masters, Templates, Code Sets |
| **Offline/Sync** | Offline Indicator, Cached Views, Sync Status |
| **Interoperability** | FHIR Config, Terminology, ERP Integration |
