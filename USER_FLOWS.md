# QHealth EMR System - User Flows

## 1. System Admin - User Account Management

### User Flow
Open EMR → Login Page → Enter Admin Credentials → MFA Verification → Access Admin Dashboard → Click "User Management" → Click "Create New User" → Enter Employee Details (Name, Email, Department) → Select Role(s) from Dropdown → Set Initial Password → Configure Access Permissions → Review User Summary → Click "Create Account" → System Sends Welcome Email with Temporary Password → View User in Active Users List → (Optional) Edit User → Modify Roles/Permissions → Save Changes → View Audit Log Entry

### Wireframe Pages
- Login Screen (Email/Password with MFA prompt)
- Admin Dashboard (Quick stats: Active Users, Recent Logins, Pending Approvals)
- User Management Dashboard (Searchable user table with filters by role/department)
- Create User Page (Multi-step form: Personal Info → Role Assignment → Permissions)
- Role Assignment Modal (Multi-select roles with permission preview)
- User Details Page (Profile, Assigned Roles, Access History)
- Edit User Modal (Inline editing with change tracking)
- Audit Log Dashboard (Filterable activity log)

---

## 2. Clinician - License Registration & Validation

### User Flow
Open EMR → Login Page → First-time Login Prompt → Redirect to Credential Management → Enter PRC License Number → System Validates Against PRC Database → Enter PTR Number → Upload PTR Document → (If Prescribing Controlled Substances) Enter PDEA S-2 License → Upload S-2 Certificate → System Validates S-2 Status → Review Submitted Credentials → Submit for Admin Verification → Receive Email Confirmation → (After Admin Approval) Access Full CPOE Features → View Credential Expiry Alerts on Dashboard

### Wireframe Pages
- Login Screen (Email/Password)
- First-Time Setup Wizard (Step indicator: 1-Credentials, 2-Signature, 3-Preferences)
- Credential Management Page (PRC, PTR, S-2 sections with status indicators)
- License Verification Modal (Real-time PRC API validation)
- Document Upload Component (Drag-drop with preview)
- Credential Review Summary (All entered data with edit option)
- Pending Verification Notice (Estimated approval timeline)
- Dashboard Credential Alert Banner (Expiry warnings)

---

## 3. User - Secure Login with Role-Based Access

### User Flow
Open EMR → Login Page → Enter Email/Password → Click "Login" → (If MFA Enabled) Receive OTP via SMS/Email → Enter OTP Code → System Validates Credentials → Load Role-Specific Dashboard → (If Session Expires) Auto-redirect to Login → (If Forgot Password) Click "Forgot Password" → Enter Email → Receive Reset Link → Click Link → Enter New Password → Confirm Password → Login with New Credentials

### Wireframe Pages
- Login Screen (Email/Password fields, Remember Me, Forgot Password link)
- MFA Verification Page (OTP input with resend option, countdown timer)
- Role Dashboard (Varies by role: Clinician, Nurse, Admin, etc.)
- Session Timeout Modal (Warning before auto-logout)
- Forgot Password Page (Email input)
- Password Reset Email Template (Secure link with expiry notice)
- Reset Password Page (New password with strength indicator)
- Login Success Toast (Welcome message with role confirmation)

---

## 4. Registrar - Patient Registration & MRN Assignment

### User Flow
Open EMR → Login → Access Registrar Dashboard → Click "Register New Patient" → Search Existing Patients (Name, DOB, PhilHealth ID) → (If No Match) Click "Create New Record" → Enter Demographics (Name, DOB, Sex, Address) → Enter Contact Information → Enter PhilHealth Member ID → System Validates via CEWS API → Select Patient Category (Indigent, Member, Dependent) → Capture Photo (Optional) → Enter Emergency Contact → Review Patient Summary → Click "Register" → System Assigns MRN → Print Patient ID Card → View Patient in Registry

### Wireframe Pages
- Registrar Dashboard (Quick actions: Register, Search, Pending Encounters)
- Patient Search Page (Multi-field search with fuzzy matching)
- Duplicate Patient Alert Modal (Side-by-side comparison)
- Patient Registration Form (Multi-section: Demographics, Contact, Insurance)
- PhilHealth Verification Component (Real-time CEWS status)
- Photo Capture Modal (Webcam or upload)
- Patient Summary Preview (All data with edit option)
- MRN Assignment Confirmation (Generated MRN display)
- Patient ID Card Preview (Printable format with barcode)
- Patient Registry List (Searchable patient database)

---

## 5. Registrar - Create Inpatient Encounter & Bed Assignment

### User Flow
Open EMR → Login → Access Registrar Dashboard → Search Patient by MRN/Name → Select Patient → Click "Create Encounter" → Select Encounter Type "Inpatient" → Select Admitting Department → Enter Admitting Diagnosis (ICD-10 Search) → Select Attending Physician → Open Bed Management → View Available Beds by Ward → Select Bed → Confirm Assignment → Enter Admission Date/Time → Select Admission Source (ER, OPD, Direct) → Review Encounter Details → Click "Admit Patient" → System Creates Encounter → Print Admission Form → Patient Appears on Ward Census

### Wireframe Pages
- Registrar Dashboard
- Patient Search Page
- Patient Profile Page (Demographics, Past Encounters, Allergies Banner)
- Create Encounter Modal (Type selection: Inpatient/Outpatient/Emergency)
- Admitting Information Form (Department, Diagnosis, Physician dropdowns)
- Bed Management Dashboard (Floor plan view with occupancy status)
- Ward View (Bed grid with patient names, availability color-coding)
- Bed Assignment Modal (Selected bed details, confirmation)
- Admission Summary Preview (All admission data)
- Admission Form Print Preview (Official admission document)
- Ward Census Dashboard (Real-time patient list by location)

---

## 6. Registrar - Patient Transfer Between Locations

### User Flow
Open EMR → Login → Access Registrar Dashboard → Search Active Inpatient → Select Patient → Click "Transfer Patient" → View Current Location → Select Destination Ward/Bed → Enter Transfer Reason → Select Transfer Type (Clinical/Administrative) → (If ICU Transfer) Trigger Critical Care Alert → Enter Transfer Date/Time → Review Transfer Details → Click "Confirm Transfer" → System Updates Location → Previous Bed Marked Available → New Bed Marked Occupied → Notify Receiving Ward → Print Transfer Form → Update BOR Calculation

### Wireframe Pages
- Registrar Dashboard
- Active Patients List (Filterable by ward/department)
- Patient Encounter Page (Current location, care team, orders)
- Transfer Request Modal (Current → Destination selection)
- Bed Selection Component (Available beds in target ward)
- Transfer Reason Dropdown (Clinical escalation, Step-down, Administrative)
- ICU Alert Modal (Critical care notification to receiving team)
- Transfer Summary Preview
- Transfer Form Print Preview
- Location History Timeline (All patient movements)
- BOR Dashboard Update (Real-time occupancy recalculation)

---

## 7. Registrar - Patient Discharge Processing

### User Flow
Open EMR → Login → Access Registrar Dashboard → Search Inpatient Ready for Discharge → Select Patient → Click "Initiate Discharge" → View Discharge Checklist (Pending Orders, Unsigned Notes, Unpaid Bills) → (If Checklist Incomplete) View Blocking Items → Notify Relevant Staff → (Once Complete) Select Disposition (Home, Transfer, DAMA, Expired) → (If Expired) Record Time of Death → Trigger Death Certificate Workflow → Enter Discharge Date/Time → Generate Discharge Summary → Review Final Bill → Confirm Payment/Billing Status → Click "Complete Discharge" → Release Bed → Archive Encounter → (If Death) Compute Gross/Net Death Rate Contribution

### Wireframe Pages
- Registrar Dashboard
- Discharge-Ready Patients List (Pending discharge queue)
- Patient Encounter Page
- Discharge Checklist Modal (Red/Green status indicators)
- Blocking Items Alert (Links to pending tasks)
- Disposition Selection Modal (Home, Transfer, AMA, Expired)
- Death Recording Form (Time of death, cause, certifying physician)
- Discharge Summary Generator (Auto-populated from clinical notes)
- Final Bill Summary Page (Itemized charges, payments, balance)
- Discharge Confirmation Modal
- Death Certificate Workflow Trigger
- Bed Release Confirmation
- Mortality Statistics Dashboard Update

---

## 8. Registrar - Birth Certificate Generation

### User Flow
Open EMR → Login → Access Registrar Dashboard → Navigate to Newborn Records → Search Mother's Encounter → Select Newborn Record → Click "Generate Birth Certificate" → System Pre-fills from Delivery Record (Date, Time, Place of Birth) → Enter Father's Information → Enter Mother's Maiden Name → Enter Attendant Details (Physician/Midwife) → Verify NBS Completion Status → Review Birth Certificate Data → Click "Generate" → System Creates Official Document → Print Birth Certificate → Record Certificate Number → Link to Civil Registry → Mark as Issued in System

### Wireframe Pages
- Registrar Dashboard
- Newborn Records List (Filter by delivery date)
- Mother's Encounter Page (Delivery details, newborn link)
- Newborn Profile Page (Birth data, NBS status)
- Birth Certificate Form (Pre-filled with manual override option)
- Father Information Section (Optional fields)
- Attendant Selection (Physician/Midwife from delivery team)
- NBS Completion Check (Warning if not done)
- Birth Certificate Preview (Official format)
- Print Options Modal (Copies, paper type)
- Civil Registry Link Status (Submission tracking)
- Issued Certificates Log (Search by certificate number)

---

## 9. Registrar - Death Certificate Generation

### User Flow
Open EMR → Login → Access Registrar Dashboard → Navigate to Deceased Patients → Search Patient Record → Select Deceased Patient Encounter → Click "Generate Death Certificate" → System Pre-fills from Discharge Record (Date/Time of Death) → Enter Immediate Cause of Death (ICD-10) → Enter Underlying Causes (Chain of events) → Enter Manner of Death → Select Certifying Physician → Physician Digital Signature Required → (If Maternal Death) Trigger FMDRF Alert → (If Neonatal Death) Trigger FNDRF Alert → Review Certificate Data → Generate Official Document → Print Death Certificate → Submit to Civil Registry → Mark Death Rate Category (<48hrs or >48hrs)

### Wireframe Pages
- Registrar Dashboard
- Deceased Patients List (Date range filter)
- Patient Encounter Page (Final disposition details)
- Death Certificate Form (Pre-filled from medical record)
- Cause of Death Section (ICD-10 search with chain entry)
- Manner of Death Selection (Natural, Accident, Homicide, etc.)
- Certifying Physician Selection
- Digital Signature Capture
- FMDRF/FNDRF Alert Modal (If applicable)
- Death Certificate Preview (Official format)
- Civil Registry Submission Status
- Mortality Classification (Gross/Net rate assignment)
- Death Statistics Dashboard

---

## 10. Triage Officer - Emergency Triage Assessment

### User Flow
Open EMR → Login → Access ED Triage Dashboard → Patient Arrives at ED → Click "New Triage" → (If Unknown Patient) Create Trauma Alias → Enter Chief Complaint → Measure Initial Vitals (BP, HR, RR, Temp, SpO2) → Calculate Pain Score → Apply Triage Scale (ESI/ATS/CTAS) → System Suggests Acuity Level → Override if Clinically Indicated → Assign Acuity Score (1-5) → Add Triage Notes → Click "Complete Triage" → Patient Added to ED Queue → System Sorts by Acuity → (High Acuity) Trigger Immediate Alert → Patient Waits for Registration/Clinician

### Wireframe Pages
- ED Triage Dashboard (Active patients, queue statistics)
- New Triage Entry Page (Patient search or create alias)
- Trauma Alias Generator (Auto-generated temporary ID)
- Chief Complaint Entry (Free text with common complaints dropdown)
- Vital Signs Entry Panel (All vitals with abnormal highlighting)
- Pain Assessment Scale (Visual analog or numeric)
- Triage Scale Selection (ESI, ATS, CTAS toggle)
- Acuity Calculator Modal (Scale-specific criteria)
- Acuity Assignment (Color-coded levels 1-5)
- Triage Notes Text Area
- ED Queue Dashboard (Sorted by acuity, wait time display)
- Critical Alert Modal (Level 1-2 immediate notification)

---

## 11. Triage Officer - Pre-Encounter Charting with Trauma Alias

### User Flow
Open EMR → Login → Access ED Triage Dashboard → Critical Patient Arrives (Unidentified) → Click "Create Pre-Encounter" → System Generates Trauma Alias (e.g., "Trauma-2026-0412-001") → Enter Triage Assessment → Record Initial Interventions → Add Clinical Notes → Attach to Pre-Encounter Record → (Later) Patient Identity Confirmed → Registrar Searches for/Creates Patient Record → Click "Merge Pre-Encounter" → Select Trauma Alias → Review Pre-Encounter Documentation → Confirm Merge → All Documentation Transfers to Permanent MRN → Trauma Alias Deactivated

### Wireframe Pages
- ED Triage Dashboard
- Pre-Encounter Creation Modal
- Trauma Alias Display (Large, visible identifier)
- Triage Assessment Form (Under trauma alias)
- Intervention Recording (Procedures, meds given pre-registration)
- Pre-Encounter Clinical Notes
- Patient Identification Confirmation
- Chart Merge Interface (Side-by-side: Alias vs. Patient record)
- Merge Confirmation Modal (Documentation transfer preview)
- Merged Record View (Complete patient chart)
- Deactivated Alias Archive

---

## 12. Registrar - Merge Pre-Encounter with Permanent MRN

### User Flow
Open EMR → Login → Access Registrar Dashboard → Navigate to "Pre-Encounter Charts" → View Unmerged Trauma Aliases → Select Pre-Encounter to Merge → View Pre-Encounter Details → Click "Link to Patient" → Search Patient Database → (If Found) Select Existing Patient → (If Not Found) Create New Patient Record → Review Patient Demographics → Confirm Patient Identity → Click "Merge Charts" → System Transfers All Pre-Encounter Documentation → Update Encounter with Patient MRN → Notify Care Team of Merge → Generate Merge Audit Log → View Unified Patient Chart

### Wireframe Pages
- Registrar Dashboard
- Pre-Encounter Management List (Unmerged aliases with timestamps)
- Pre-Encounter Detail View (All documentation under alias)
- Patient Search Modal
- New Patient Registration (If no match)
- Patient Selection Confirmation
- Merge Preview (Documentation transfer summary)
- Identity Verification Checklist
- Merge Confirmation Modal
- Unified Patient Chart View
- Merge Audit Log Entry
- Care Team Notification

---

## 13. Clinician - ED Disposition with OECB Tagging

### User Flow
Open EMR → Login → Access ED Patient Worklist → Select Patient → Review Clinical Documentation → Determine Disposition → Click "Set Disposition" → (If Not Admitted) Select "Discharge Home" → (If Qualifies) Check "OECB Claim" → System Tags for PhilHealth Outpatient Billing → Enter Discharge Instructions → Generate ED Summary → Sign Note Electronically → Click "Complete Disposition" → (If OECB Tagged) Route to Billing for eClaims → Patient Removed from ED Census → Encounter Closed → Generate OECB Claim Package

### Wireframe Pages
- ED Patient Worklist (Active patients with acuity badges)
- Patient Chart View (ED documentation, orders, results)
- Disposition Selection Modal
- OECB Eligibility Checker (Auto-detect based on criteria)
- OECB Tagging Confirmation
- Discharge Instructions Template
- ED Summary Generator
- Electronic Signature Modal
- Disposition Confirmation
- Billing Route Notification (OECB claim initiated)
- ED Census Update
- OECB Claim Dashboard (For billers)

---

## 14. Clinician - Author Clinical Note with Structured Template

### User Flow
Open EMR → Login → Access Patient Worklist → Select Patient → Open Chart → Click "New Note" → Select Template Category (Progress Note, H&P, Consult) → Select Specific Template → Template Loads with Structured Sections → Enter Subjective (Chief Complaint, HPI) → Enter Objective (Exam Findings, Vitals auto-populated) → Enter Assessment (Diagnosis with ICD-10 search) → Enter Plan (Orders, Follow-up) → (Optional) Add Free-text Sections → Auto-save Activates Every 30 Seconds → Review Complete Note → Click "Sign Note" → Enter Digital Signature/PIN → Note Becomes Part of Legal Record → Note Locked for Editing

### Wireframe Pages
- Patient Worklist (Assigned patients)
- Patient Chart View (Tabs: Notes, Orders, Results, Flowsheets)
- New Note Modal (Template category selection)
- Template Library (Searchable template list)
- Note Editor Page (Structured sections with rich text)
- Vitals Auto-population Component
- ICD-10 Diagnosis Search Modal
- Order Entry Quick-link (From plan section)
- Auto-save Indicator (Last saved timestamp)
- Note Preview Mode (Read-only formatted view)
- Digital Signature Modal (PIN or biometric)
- Signed Note View (Locked with signature timestamp)

---

## 15. Clinician - Sign and Finalize Notes

### User Flow
Open EMR → Login → Access "My Unsigned Notes" → View Pending Notes List → Select Note to Review → Read Full Note Content → (If Edits Needed) Click "Edit" → Make Changes → Save Changes → Click "Sign Note" → System Validates Completeness (Required fields) → (If Incomplete) Show Missing Fields Alert → Complete Required Fields → Re-attempt Sign → Enter Signature Credentials (PIN/Password) → Note Status Changes to "Signed" → Timestamp Recorded → Note Becomes Read-only → Appears in Patient Chart → Available for CF4 Extraction

### Wireframe Pages
- My Unsigned Notes Dashboard (List with patient names, note types, dates)
- Note Review Page (Full note display)
- Edit Mode (Unlocked fields with change tracking)
- Completeness Validation Alert
- Missing Fields Indicator (Highlighted required sections)
- Signature Modal (PIN entry or password)
- Signature Confirmation
- Signed Note Banner (Timestamp, signer name)
- Patient Chart Integration (Note in timeline)
- CF4 Data Availability Indicator

---

## 16. Clinician - Create Note Amendment/Addendum

### User Flow
Open EMR → Login → Access Patient Chart → Navigate to Notes Tab → Find Signed Note Requiring Amendment → Click "Add Amendment" → System Creates Amendment Record → Enter Amendment Text → Select Amendment Reason (Error Correction, Additional Information, Late Entry) → Reference Original Note → Enter Amendment Date/Time → Review Amendment → Sign Amendment → Amendment Linked to Original Note → Both Displayed Together → Full Audit Trail Maintained → Original Note Unchanged

### Wireframe Pages
- Patient Chart Notes Tab (Chronological note list)
- Signed Note View (With "Add Amendment" button)
- Amendment Creation Page
- Amendment Reason Selection
- Amendment Text Editor
- Original Note Reference Display
- Amendment Preview (Showing link to original)
- Digital Signature Modal
- Combined Note View (Original + Amendment)
- Amendment Audit Trail
- Note Version History

---

## 17. Clinician - PhilHealth FPE (Konsulta) Documentation

### User Flow
Open EMR → Login → Access OPD/Konsulta Worklist → Select Konsulta Patient → Click "New FPE Encounter" → System Loads FPE Template → Complete Health Screening Sections (Medical History, Family History, Social History) → Record Vitals → Perform Physical Exam Documentation → Enter Risk Assessment → Calculate Health Risk Score → Identify Care Needs → Create Care Plan → Schedule Follow-up (If needed) → Review FPE Documentation → Sign Note → FPE Data Routes to PhilHealth Konsulta Capitation → Generate Patient Health Summary

### Wireframe Pages
- Konsulta Patient Worklist (Enrolled patients)
- FPE Template Page (Comprehensive health screening)
- Medical History Section (Conditions, surgeries, allergies)
- Family History Section (Hereditary conditions)
- Social History Section (Smoking, alcohol, occupation)
- Vital Signs Panel
- Physical Exam Documentation (System-by-system)
- Risk Assessment Calculator
- Care Needs Identification
- Care Plan Builder
- Follow-up Scheduling Modal
- FPE Summary Preview
- Digital Signature Modal
- PhilHealth Capitation Routing Confirmation
- Patient Health Summary Print

---

## 18. Clinician - Electronic Patient Consent Capture

### User Flow
Open EMR → Login → Access Patient Chart → Click "Capture Consent" → Select Consent Type (Treatment, Data Sharing, Research) → System Loads Consent Form Template → Review Consent Text with Patient → Patient Reads/Understands Terms → (If Patient Agrees) Capture Digital Signature → Patient Signs on Signature Pad/Screen → Capture Witness Signature (If required) → Record Consent Date/Time → Associate Consent with Encounter → Store Encrypted Consent Record → Consent Status Visible in Chart → (If Sharing Sensitive Data) Verify Consent Exists → Proceed with Data Transmission

### Wireframe Pages
- Patient Chart View
- Consent Type Selection Modal
- Consent Form Display (Full legal text)
- Patient Information Section (Auto-filled)
- Digital Signature Capture Pad
- Patient Signature Area
- Witness Signature Area (If applicable)
- Consent Confirmation Modal
- Consent Record View (Signed, timestamped)
- Consent Management Dashboard
- Data Transmission Consent Verification
- Consent Audit Log

---

## 19. Clinician - Place Medication Order (Generics Act Compliant)

### User Flow
Open EMR → Login → Access Patient Chart → Click "New Order" → Select "Medication" → Open Drug Search → Type Generic Drug Name → System Shows Generic Options First → Select Generic Drug → (Optional) Add Brand Name (Displayed Subordinate) → Select Route (PO, IV, IM, etc.) → Enter Dose → Select Frequency → Enter Duration → System Checks Allergy Interactions → (If Allergy Alert) Review and Override or Cancel → System Checks Formulary Status → (If Non-formulary) Show Alternative Suggestion → Review Order Summary → Sign Order → Order Routes to Pharmacy Verification

### Wireframe Pages
- Patient Chart View
- Order Entry Modal (Order type selection)
- Drug Search (Generic-first display)
- Generic Drug Results (Prominent display)
- Brand Name Subordinate Field (Secondary, optional)
- Route Selection Dropdown
- Dose Entry (With dosing guidance)
- Frequency Selection (Common frequencies pre-set)
- Duration Entry
- Allergy Alert Modal (Hard stop with override option)
- Formulary Status Indicator
- Alternative Drug Suggestion
- Order Summary Preview
- Digital Signature Modal
- Pharmacy Queue Notification

---

## 20. Clinician - Generate e-Prescription with PRC/PTR

### User Flow
Open EMR → Login → Access Patient Chart → View Active Medication Orders → Select Medications for Prescription → Click "Generate e-Prescription" → System Auto-appends PRC License Number → System Auto-appends PTR Number → (If Controlled Substance) Validate S-2 License → Compile Prescription Details → Review Prescription Preview → Verify Patient Information → Sign Prescription Electronically → System Generates Prescription Document → (Options) Print / Email / Send to Pharmacy → Record Prescription in Patient Chart → Log Prescription Issuance

### Wireframe Pages
- Patient Chart View
- Active Medications List
- Prescription Selection (Multi-select medications)
- e-Prescription Generator
- Clinician Credentials Display (PRC, PTR auto-filled)
- S-2 Validation Status (For controlled drugs)
- Prescription Preview (Official format)
- Patient Information Verification
- Digital Signature Modal
- Prescription Output Options (Print, Email, Pharmacy Send)
- Delivery Confirmation
- Prescription Log (All issued prescriptions)

---

## 21. Clinician - Order Controlled Substance (PDEA S-2 Compliant)

### User Flow
Open EMR → Login → Access Patient Chart → Click "New Order" → Select "Medication" → Search Controlled Substance → System Detects List A Drug → Validate Clinician S-2 License → (If S-2 Invalid/Expired) Block Order with Alert → (If S-2 Valid) Proceed → Enter Dose and Frequency → Enter Duration (Max 90 days for Schedule IV) → (If >30 days) System Auto-divides into Tranches → Add "No Refill" Inscription Automatically → Add Temporal Dispensing Instructions → Review Order with Regulatory Compliance → Sign Order → Pharmacy Receives with S-2 Verification → Log PDEA Reportable Event

### Wireframe Pages
- Patient Chart View
- Drug Search (Controlled substance tag displayed)
- S-2 License Validation Modal
- S-2 Expiry Alert (If expired/invalid)
- Controlled Substance Order Form
- Duration Entry (90-day maximum enforcement)
- Tranche Auto-division Display (30-day splits)
- "No Refill" Inscription Auto-added
- Temporal Dispensing Instructions
- Compliance Review Summary
- Digital Signature Modal
- Pharmacy Queue with S-2 Flag
- PDEA Reportable Event Log

---

## 22. Clinician - Place Laboratory Order

### User Flow
Open EMR → Login → Access Patient Chart → Click "New Order" → Select "Laboratory" → Browse Lab Catalog or Search → Select Test(s) → (Or) Select Order Set (Common test bundles) → Enter Clinical Indication → Select Priority (Routine, STAT) → Specify Collection Instructions → Review Order Details → Sign Order → Order Routes to Lab → Lab Receives Order → Specimen Collection Pending → (When Results Ready) Results Appear in Chart → Clinician Receives Result Alert → Review Results in Lab Tab

### Wireframe Pages
- Patient Chart View
- Order Entry Modal
- Lab Catalog Browser (Categorized: Hematology, Chemistry, etc.)
- Lab Search (LOINC-coded tests)
- Order Set Selection (Pre-built test bundles)
- Clinical Indication Entry
- Priority Selection (Routine, Urgent, STAT)
- Collection Instructions Field
- Order Summary Preview
- Digital Signature Modal
- Lab Order Queue
- Specimen Collection Tracker
- Lab Results Display (With reference ranges)
- Result Alert Notification

---

## 23. Clinician - Place Imaging Order

### User Flow
Open EMR → Login → Access Patient Chart → Click "New Order" → Select "Imaging" → Browse Modality (X-ray, CT, MRI, Ultrasound) → Select Specific Study → Enter Clinical Indication (Required) → Add Relevant History → Select Priority (Routine, STAT) → Specify Contrast Requirements → Answer Safety Screening (Pregnancy, Allergies, Renal Function) → Review Order → Sign Order → Order Routes to Radiology → Radiology Schedules Study → Patient Informed → (When Complete) Report Attached → PACS Link Available → Clinician Reviews Images/Report

### Wireframe Pages
- Patient Chart View
- Order Entry Modal
- Imaging Modality Selection
- Study Selection (Within modality)
- Clinical Indication (Required field)
- Relevant History Section
- Priority Selection
- Contrast Requirements
- Safety Screening Questionnaire
- Order Summary Preview
- Digital Signature Modal
- Radiology Queue
- Scheduling Confirmation
- Imaging Results Display
- PACS Viewer Link

---

## 24. Clinician - Receive and Review Allergy Alert

### User Flow
Clinician Places Medication Order → System Cross-checks Patient Allergies → (If Match Found) Display Allergy Alert Modal → Show Drug Name → Show Documented Allergy → Show Reaction Severity → Display Options: Cancel Order OR Override with Reason → (If Cancel) Order Cancelled → Return to Order Screen → (If Override) Select Override Reason → Enter Clinical Justification → Acknowledge Risk → Sign Override → Order Proceeds with Alert Flag → Alert Logged in Audit Trail → Pharmacy Sees Override Flag → Pharmacist Reviews During Verification

### Wireframe Pages
- Medication Order Entry
- Allergy Alert Modal (High-visibility red banner)
- Drug-Allergy Match Display
- Documented Allergy Details (Allergen, Reaction, Severity)
- Override Reason Selection (Clinical necessity, Patient tolerated before, etc.)
- Clinical Justification Text Entry
- Risk Acknowledgment Checkbox
- Override Confirmation
- Order Display (With allergy override flag)
- Audit Log Entry (Override details)
- Pharmacy View (Override alert highlighted)

---

## 25. Nurse/Midwife - Record Newborn Screening (NBS)

### User Flow
Open EMR → Login → Access Newborn Unit Worklist → Select Newborn Patient → View Time-of-Birth Record → Click "Newborn Screening" → System Checks Screening Window (24-48 hours) → (If Outside Window) Display Compliance Alert → Enter Screening Date/Time → Record Heel Prick Collection → Enter Specimen Details → Capture Parental Consent → (If Consent Declined) Capture Waiver → Record Waiver Reason → Enter Screening Samples Sent → Update NBS Logbook → (When Results Return) Enter Results → (If Abnormal) Flag for Follow-up → Generate Referral if Positive → Track Referral Status

### Wireframe Pages
- Newborn Unit Worklist (Pending NBS flagged)
- Newborn Patient Chart
- Time-of-Birth Display (For window calculation)
- NBS Entry Page
- Screening Window Calculator (24-48 hour rule)
- Compliance Alert (If late screening)
- Specimen Collection Form
- Parental Consent Capture
- Waiver Form (If consent declined)
- NBS Logbook Dashboard
- Results Entry Page
- Abnormal Result Flag
- Referral Generation Modal
- Referral Tracking Page

---

## 26. Nurse/Midwife - Maintain Digital NBS Logbook

### User Flow
Open EMR → Login → Access NBS Logbook Dashboard → View All Newborns by Date → Filter by Screening Status (Pending, Complete, Waived, Abnormal) → Review Individual Records → (For Pending) Click to Complete Screening → (For Complete) View Results → (For Abnormal) Track Referral → Generate NBS Compliance Report → Export Logbook for DOH Submission → Print Monthly Summary → Track Positive Result Referral Pathways → Document Follow-up Outcomes

### Wireframe Pages
- NBS Logbook Dashboard (Complete registry view)
- Status Filters (All, Pending, Complete, Waived, Abnormal)
- Date Range Selection
- Individual NBS Record View
- Screening Completion Entry
- Results Display
- Referral Tracking (For positives)
- Compliance Report Generator
- Export Function (Excel/PDF for DOH)
- Monthly Summary Print
- Referral Pathway Documentation
- Follow-up Outcome Recording

---

## 27. Clinician - MNDRS Maternal Death Reporting

### User Flow
Registrar Records Death → System Detects Reproductive-Age Female (15-49) → Automatic MNDRS Alert Triggered → Alert Sent to Attending Clinician → Clinician Opens Alert → View Death Details → Click "Complete FMDRF" → System Loads Facility Maternal Death Reporting Form → Enter Pregnancy Status at Death → Document Obstetric History → Enter Cause of Death Chain → Document Delays/Contributing Factors → Enter Healthcare Response Timeline → Review Complete Form → Sign FMDRF → Route to Statutory Reporting Officer → Officer Reviews → Submit to MNDRS Portal → Track Submission Status

### Wireframe Pages
- Clinician Alert Dashboard
- MNDRS Alert Modal (Maternal death detected)
- Death Details Summary
- FMDRF Form Page (DOH-standard format)
- Pregnancy Status Section
- Obstetric History Section
- Cause of Death Chain Entry
- Three Delays Model Documentation
- Healthcare Response Timeline
- Form Review/Summary
- Digital Signature Modal
- Statutory Officer Queue
- MNDRS Portal Submission
- Submission Tracking Dashboard

---

## 28. Clinician - MNDRS Neonatal Death Reporting

### User Flow
Registrar Records Death → System Detects Neonate (0-28 days) → Automatic MNDRS Alert Triggered → Alert Sent to Attending Clinician → Clinician Opens Alert → View Death Details → Click "Complete FNDRF" → System Loads Facility Neonatal Death Reporting Form → Enter Birth Details → Document Maternal History → Enter Neonatal Clinical Course → Document Cause of Death → Enter Contributing Factors → Document Care Provided → Review Complete Form → Sign FNDRF → Route to Statutory Reporting Officer → Submit to MNDRS Portal

### Wireframe Pages
- Clinician Alert Dashboard
- MNDRS Alert Modal (Neonatal death detected)
- Death Details Summary
- FNDRF Form Page (DOH-standard format)
- Birth Details Section
- Maternal History Section
- Neonatal Clinical Course
- Cause of Death Entry
- Contributing Factors Section
- Care Documentation
- Form Review/Summary
- Digital Signature Modal
- Statutory Officer Queue
- MNDRS Submission Portal

---

## 29. Nurse - Medication Administration from MAR

### User Flow
Open EMR → Login → Access Nursing Unit Dashboard → Select Patient → Open MAR Tab → View Scheduled Medications → Identify Due Medications (Highlighted) → Click Medication to Administer → Scan Patient Wristband Barcode → Scan Medication Barcode → System Verifies Match → System Checks Five Rights (Patient, Drug, Dose, Route, Time) → (If Mismatch) Alert and Block → (If Match) Proceed → Record Administration Time → Enter Administration Site (If injection) → (If PRN) Enter Reason Given → Record Patient Response (If required) → Sign Administration → MAR Updates → (If Held) Document Hold Reason

### Wireframe Pages
- Nursing Unit Dashboard (My patients list)
- Patient MAR View (Timeline grid)
- Due Medications Highlight (Color-coded urgency)
- Barcode Scan Interface (Camera/scanner input)
- Patient Verification Display
- Medication Verification Display
- Five Rights Check Confirmation
- Mismatch Alert Modal
- Administration Recording Form
- PRN Reason Entry
- Response Documentation
- Digital Signature
- Updated MAR View
- Hold Reason Entry Modal

---

## 30. Nurse - Treatment Administration Record (TAR)

### User Flow
Open EMR → Login → Access Nursing Unit Dashboard → Select Patient → Open TAR Tab → View Ordered Treatments → Identify Due Treatments → Select Treatment to Document → Record Treatment Performed → Enter Time Performed → Document Any Variations → Record Patient Tolerance → (If Wound Care) Document Wound Status → (If Procedure) Document Findings → Sign Treatment Record → TAR Updates with Completion → Notify Care Team of Completion → (If Not Done) Document Reason Not Done

### Wireframe Pages
- Nursing Unit Dashboard
- Patient TAR View (Treatment timeline)
- Due Treatments List
- Treatment Documentation Form
- Time Recording
- Variation Documentation
- Patient Tolerance Section
- Wound Care Documentation Template
- Procedure Findings Section
- Digital Signature Modal
- Updated TAR View
- Not Done Reason Modal
- Care Team Notification

---

## 31. Nurse - PRN Medication Documentation

### User Flow
Open EMR → Login → Access Patient Chart → Open MAR → View PRN Medications Available → Identify Patient Need (Pain, Nausea, etc.) → Select PRN Medication → Enter Reason for Administration (Required) → Document Assessment Score (Pain scale, etc.) → Administer Medication → Complete Barcode Verification → Record Administration Time → Sign Administration → Set Response Follow-up Reminder → (After Response Window) Return to Chart → Enter Response Assessment → Document Effectiveness → Update Pain Score → Complete PRN Cycle → Data Available for Trending

### Wireframe Pages
- Patient MAR View
- PRN Medications Section
- PRN Administration Modal
- Reason Selection/Entry (Required)
- Assessment Score Entry (Pain scale, nausea scale)
- Barcode Verification Interface
- Time Recording
- Digital Signature
- Follow-up Reminder Set
- Response Documentation Form
- Effectiveness Rating
- Post-Admin Assessment Score
- PRN History/Trending View

---

## 32. Nurse - Shift Handoff Documentation

### User Flow
Open EMR → Login → Access Nursing Unit Dashboard → Click "Shift Handoff" → Select Outgoing Shift → System Generates Handoff Report → Review Patient Summary (Each patient) → Edit/Add Critical Information → Document Pending Tasks → Note Active Issues/Concerns → Document Overnight Events → Add Verbal Communication Notes → Acknowledge Each Patient → Incoming Nurse Logs In → Receives Handoff Report → Reviews All Patients → Acknowledges Receipt → Both Signatures Recorded → Handoff Complete → Audit Trail Created

### Wireframe Pages
- Nursing Unit Dashboard
- Shift Handoff Initiation
- Auto-generated Handoff Report
- Patient Summary Cards (One per patient)
- Critical Information Editor
- Pending Tasks Checklist
- Issues/Concerns Section
- Event Documentation
- Verbal Notes Capture
- Acknowledgment Per Patient
- Incoming Nurse View
- Handoff Review Screen
- Receipt Acknowledgment
- Dual Signature Capture
- Handoff Complete Confirmation
- Audit Log Entry

---

## 33. Nurse - Intake/Output (I/O) Tracking

### User Flow
Open EMR → Login → Access Patient Chart → Open Flowsheets → Select I/O Flowsheet → Enter Intake (Type, Volume, Route) → Select Intake Category (PO, IV, TF) → Record Time → Enter Output (Type, Volume) → Select Output Category (Urine, Stool, Emesis, Drain) → Record Characteristics (Color, Consistency) → Save Entry → System Calculates Cumulative Totals → View Running Balance → (At Shift End) Review 8-hour Summary → (At 24 hours) View Daily I/O Balance → Flag Significant Imbalance → Alert Provider if Threshold Exceeded

### Wireframe Pages
- Patient Flowsheets View
- I/O Flowsheet Grid
- Intake Entry Form
- Intake Type Selection (Oral, IV, Tube Feed)
- Volume Entry (mL)
- Output Entry Form
- Output Category Selection
- Characteristics Documentation
- Time Stamps
- Cumulative Totals Display
- 8-Hour Summary
- 24-Hour Balance View
- Imbalance Alert
- Provider Notification

---

## 34. Nurse - Healthcare-Associated Infection (HAI) Tagging

### User Flow
Open EMR → Login → Access Patient Chart → Identify Suspected HAI → Click "Report HAI" → Select Infection Type (VAP, BSI, CAUTI, SSI) → Enter Onset Date → Document Device/Procedure Association → Enter Organisms Identified → Document Diagnostic Criteria Met → Submit HAI Report → Infection Control Notified → HAI Tagged on Patient Record → Appears in HAI Surveillance Dashboard → Included in AHSR HAI Metrics → (If Outbreak Pattern) Trigger Infection Control Alert

### Wireframe Pages
- Patient Chart View
- HAI Reporting Modal
- Infection Type Selection (HAI categories)
- Onset Date Entry
- Device Association (Central line, Catheter, Ventilator)
- Procedure Association (If SSI)
- Organism Entry
- Diagnostic Criteria Checklist
- HAI Report Summary
- Infection Control Notification
- Patient Record HAI Flag
- HAI Surveillance Dashboard
- AHSR Integration
- Outbreak Alert Modal

---

## 35. Clinician - Manage Problem List

### User Flow
Open EMR → Login → Access Patient Chart → Open Problems Tab → View Active Problems List → Click "Add Problem" → Search Diagnosis (ICD-10/SNOMED) → Select Diagnosis → Enter Onset Date (Approximate or Exact) → Set Status (Active, Resolved, Inactive) → Add Clinical Notes → (If Chronic) Mark as Chronic → Save Problem → Problem Appears in List → (To Resolve) Click Problem → Change Status to "Resolved" → Enter Resolution Date → Problem Moves to Historical → Full Problem History Maintained → Problems Available for Billing/Reporting

### Wireframe Pages
- Patient Chart View
- Problems Tab (Active/Historical toggle)
- Active Problems List
- Add Problem Modal
- Diagnosis Search (ICD-10/SNOMED)
- Problem Entry Form
- Onset Date Selection
- Status Selection
- Clinical Notes Entry
- Chronic Marker Toggle
- Problem Detail View
- Status Change Modal
- Resolution Date Entry
- Historical Problems View
- Problem Timeline

---

## 36. Clinician - Document Allergies and Adverse Reactions

### User Flow
Open EMR → Login → Access Patient Chart → Open Allergies Tab → View Current Allergies → Click "Add Allergy" → Select Allergen Type (Drug, Food, Environmental) → Search Allergen → Select Allergen → Enter Reaction Description → Select Reaction Type (Allergy vs. Intolerance) → Select Severity (Mild, Moderate, Severe, Life-threatening) → Enter Onset Date → Document Source (Patient reported, Documented reaction) → Save Allergy → Allergy Appears in Patient Header Banner → CPOE Integration Activated → Future Orders Trigger Alerts

### Wireframe Pages
- Patient Chart View
- Allergies Tab
- Current Allergies List
- Add Allergy Modal
- Allergen Type Selection
- Allergen Search (Drug formulary, Food library, Environmental)
- Reaction Description Entry
- Reaction Type Selection
- Severity Selection (Color-coded)
- Onset Date Entry
- Source Documentation
- Allergy Summary
- Patient Header Banner Update
- CPOE Alert Configuration
- Allergy Alert Preview

---

## 37. Nurse - Record Vital Signs

### User Flow
Open EMR → Login → Access Nursing Unit Dashboard → Select Patient → Open Flowsheets → Select Vitals Flowsheet → Click "Record Vitals" → Enter Blood Pressure (Systolic/Diastolic) → Enter Heart Rate → Enter Respiratory Rate → Enter Temperature (With route: Oral, Tympanic, Axillary) → Enter SpO2 → Enter Supplemental O2 (If applicable) → Enter Pain Score → Enter Level of Consciousness → System Calculates NEWS/Early Warning Score → (If Abnormal Score) Alert Displayed → Save Vitals → Vitals Graphed on Trend Chart → Notification Sent (If critical values)

### Wireframe Pages
- Nursing Unit Dashboard
- Patient Flowsheets View
- Vitals Entry Form
- Blood Pressure Entry (Two fields)
- Heart Rate Entry
- Respiratory Rate Entry
- Temperature Entry (With route selection)
- SpO2 Entry
- Oxygen Supplementation Field
- Pain Score Slider
- Consciousness Level Selection
- NEWS Calculator Display
- Abnormal Alert Modal
- Vital Trends Chart
- Critical Value Notification

---

## 38. Nurse - Early Warning Score (NEWS) Monitoring

### User Flow
Open EMR → Login → Access Unit Dashboard → View Patient List with NEWS Scores → Identify Elevated Scores (Color-coded) → Click High-Score Patient → View NEWS Breakdown → See Parameter-by-Parameter Scoring → View Score Trend Over Time → (If Score ≥5) System Recommends Escalation → Click "Escalate" → Select Escalation Pathway → Notify Rapid Response / Physician → Document Escalation Reason → Record Response Time → Document Intervention → Re-assess After Intervention → Record Follow-up Score → Track Score Response

### Wireframe Pages
- Unit Dashboard (NEWS score column)
- Color-Coded Score Badges (Green, Yellow, Orange, Red)
- Patient NEWS Detail View
- Parameter Breakdown (Each vital sign contribution)
- Score Trend Graph
- Escalation Recommendation Banner
- Escalation Modal
- Pathway Selection (RRT, Physician call, etc.)
- Notification Confirmation
- Escalation Documentation Form
- Response Time Recording
- Intervention Documentation
- Re-assessment Entry
- Score Comparison View

---

## 39. Lab Technologist - Manual Result Entry

### User Flow
Open EMR → Login → Access Lab Worklist → View Pending Orders → Select Order → Verify Specimen Details → Click "Enter Results" → Select Test from Order → Enter Numeric Value(s) → (If Qualitative) Select Result Option → System Displays Reference Ranges → System Flags Abnormal Values → Enter Interpretive Comments (If needed) → Mark Test Complete → Repeat for All Tests in Order → Review All Results → Submit for Pathologist Review → (Or) Sign Off if Authorized → Results Route to Patient Chart → Ordering Clinician Notified

### Wireframe Pages
- Lab Technologist Dashboard
- Lab Worklist (Pending orders queue)
- Order Detail View
- Specimen Verification Display
- Result Entry Form
- Test Selection (Within order)
- Numeric Value Entry
- Qualitative Result Selection
- Reference Range Display
- Abnormal Flag (Auto-generated)
- Interpretive Comments Field
- Test Completion Marker
- Results Summary View
- Pathologist Queue (If applicable)
- Digital Signature Modal
- Result Routing Confirmation
- Clinician Notification

---

## 40. Clinician - View Laboratory Results

### User Flow
Open EMR → Login → Access Patient Chart → Open Labs Tab → View Results Timeline → (Or) View Cumulative Table → Filter by Test Type → Filter by Date Range → Select Result to View Details → See Value with Reference Range → See Historical Trend for Same Test → View Graph Visualization → Click Critical Value → See Alert Details → Acknowledge Critical Result → Add Clinical Note (If needed) → Results Available for Note Integration → Copy Results to Progress Note

### Wireframe Pages
- Patient Chart View
- Labs Tab
- Results Timeline View (Chronological)
- Cumulative Table View (All results in grid)
- Test Type Filter
- Date Range Filter
- Result Detail Modal
- Reference Range Display
- Historical Comparison
- Trend Graph
- Critical Value Alert Banner
- Acknowledgment Modal
- Clinical Note Integration
- Copy to Note Function
- Progress Note with Lab Integration

---

## 41. Nurse - Blood Transfusion Bedside Verification

### User Flow
Open EMR → Login → Access Patient Chart → View Active Transfusion Order → Click "Administer Transfusion" → Verify Patient Identity → Scan Patient Wristband Barcode → Scan Blood Product Barcode → System Verifies: Patient ID matches Order → System Verifies: Product matches Order → System Verifies: ABO/Rh Compatibility → System Verifies: Expiration Date Valid → (If All Pass) Proceed to Administration → (If Any Fail) HARD STOP with Alert → Record Start Time → Enter Vital Signs Pre-transfusion → Begin Infusion → Document Rate → Set Monitoring Schedule → Record Periodic Vitals → Document Any Reactions → Complete Transfusion → Record End Time → Record Volume Infused → Sign Administration Record

### Wireframe Pages
- Patient Chart View
- Active Transfusion Orders
- Transfusion Administration Modal
- Patient Identity Confirmation
- Barcode Scanner Interface (Patient wristband)
- Barcode Scanner Interface (Blood product)
- Verification Checklist Display (All checks)
- Compatibility Confirmation
- HARD STOP Alert Modal (If mismatch)
- Pre-transfusion Vitals Entry
- Infusion Start Recording
- Rate Documentation
- Monitoring Schedule Setup
- Periodic Vitals Entry
- Reaction Documentation Form
- Completion Recording
- Volume Infused Entry
- Administration Record Signature

---

## 42. Clinician - Approve Blood Cross-Match Request

### User Flow
Open EMR → Login → Access Pending Orders Queue → View Cross-Match Requests → Select Request → Review Patient Information → Review Blood Type → Review Number of Units Requested → Review Clinical Indication → Verify Request Appropriateness → (If Questions) Contact Ordering Clinician → (If Appropriate) Click "Approve" → Sign Approval → Blood Bank Notified → Cross-matching Proceeds → (If Not Appropriate) Reject with Reason → Ordering Clinician Notified → Alternative Recommendations Provided

### Wireframe Pages
- Pending Orders Queue
- Cross-Match Request List
- Request Detail View
- Patient Blood Type Display
- Units Requested
- Clinical Indication
- Appropriateness Review Checklist
- Contact Clinician Function
- Approval Modal
- Digital Signature
- Blood Bank Notification
- Rejection Modal
- Rejection Reason Entry
- Alternative Recommendation Field
- Clinician Notification

---

## 43. Radiology Staff - Attach Imaging Report

### User Flow
Open EMR → Login → Access Radiology Worklist → View Completed Studies → Select Study → Open Report Editor → Enter Report Findings → Use Structured Reporting Template → Enter Impression → Select Report Status (Preliminary, Final) → Sign Report → Report Attaches to Patient Encounter → Link PACS Study URL → (If Critical Finding) Click "Mark Critical" → Enter Critical Finding Description → Notify Ordering Clinician Stat → Document Notification → Report Available in Patient Chart → Clinician Can View Report + PACS Link

### Wireframe Pages
- Radiology Worklist (Completed studies queue)
- Study Selection View
- Report Editor Page
- Structured Reporting Template
- Findings Entry Section
- Impression Entry Section
- Report Status Selection
- Digital Signature Modal
- Patient Encounter Link
- PACS URL Attachment
- Critical Finding Flag Modal
- Critical Finding Description
- Clinician Notification (Phone/Page)
- Notification Documentation
- Patient Chart Report View
- PACS Viewer Link

---

## 44. Radiology Staff - Mark Critical Finding

### User Flow
Review Imaging Study → Identify Critical Finding → Click "Critical Result" → Select Finding Category → Enter Finding Description → System Initiates Critical Alert Workflow → Identify Ordering Clinician → Attempt Direct Contact → (If Reached) Document Verbal Communication → Record Time of Contact → Record Name of Person Notified → (If Not Reached) Escalate to Backup Clinician → Document Escalation Path → Continue Until Contact Made → Complete Critical Notification → Log in Audit Trail → Critical Flag Visible on Patient Chart → Report Flagged as Critical

### Wireframe Pages
- Study Review Interface
- Critical Result Button
- Finding Category Selection
- Finding Description Entry
- Critical Alert Workflow Initiation
- Clinician Contact Information
- Direct Contact Documentation
- Communication Log
- Time Recording
- Contact Name Entry
- Escalation Path Modal
- Backup Clinician List
- Escalation Documentation
- Notification Completion Confirmation
- Audit Log Entry
- Patient Chart Critical Flag
- Critical-Flagged Report View

---

## 45. Clinician - Access External PACS Viewer

### User Flow
Open EMR → Login → Access Patient Chart → Open Imaging Tab → View Imaging Studies List → Select Study → Click "View in PACS" → System Generates Secure URL → System Authenticates User → PACS Viewer Opens in New Tab → View Full Resolution Images → Use Viewer Tools (Window/Level, Zoom, Measurement) → Compare with Prior Studies → Return to EMR Tab → Reference Images in Clinical Note → (Option) Generate Key Image → Key Image Saves to EMR

### Wireframe Pages
- Patient Chart View
- Imaging Tab
- Imaging Studies List
- Study Details (Modality, Date, Report status)
- "View in PACS" Button
- Secure URL Generation (Loading indicator)
- Authentication Handoff
- PACS Viewer (External application)
- Image Display Tools
- Prior Comparison Function
- EMR Return
- Note Integration
- Key Image Selection
- Key Image Save Confirmation

---

## 46. Surgeon - Document Operation Record

### User Flow
Open EMR → Login → Access OR Worklist → Select Completed Surgery → Click "Complete OR Documentation" → Open Operation Record Template → Enter Pre-operative Diagnosis → Enter Post-operative Diagnosis (ICD-10) → Document Procedure Performed → Search and Map RVS Codes (Required) → Enter Surgical Team (Surgeon, Assistants, Scrub Nurse, Circulating Nurse, Anesthesiologist) → Enter Start/End Times → Document Operative Technique (Step-by-step) → Document Specimens Sent → Document Estimated Blood Loss → Document Complications (If any) → Review Complete Record → Sign Operation Record → Record Available for Billing/PhilHealth

### Wireframe Pages
- OR Worklist (Completed surgeries)
- Surgery Selection
- Operation Record Template
- Pre-op Diagnosis Entry
- Post-op Diagnosis Entry (ICD-10 search)
- Procedure Documentation
- RVS Code Search/Mapping (Required)
- Surgical Team Entry (Role-based fields)
- Time Stamps (Start, End)
- Operative Technique Text Editor
- Specimen Documentation
- EBL Entry
- Complications Section
- Record Review/Summary
- Digital Signature Modal
- Billing Queue Notification

---

## 47. Anesthesiologist - Document Anesthesia Record

### User Flow
Open EMR → Login → Access OR Worklist → Select Surgery → Click "Anesthesia Record" → Enter Pre-anesthetic Assessment → Document Airway Assessment (Mallampati, etc.) → Select Anesthesia Type (General, Regional, MAC) → Document Induction → Record Airway Management (ETT, LMA, etc.) → Set Up Intraoperative Vitals Timeline → Record Vitals at Regular Intervals → Document Medications Given → Document Fluids Administered → Document Events/Complications → Enter Emergence Details → Document Post-anesthesia Status (Aldrete score) → Sign Record → Transfer to PACU with Report

### Wireframe Pages
- OR Worklist
- Surgery Selection
- Anesthesia Record Template
- Pre-anesthetic Assessment Form
- Airway Assessment Section
- Anesthesia Type Selection
- Induction Documentation
- Airway Device Selection/Documentation
- Intraoperative Vitals Timeline Graph
- Vital Signs Entry (Interval-based)
- Anesthetic Medications Log
- Fluid Balance Tracker
- Event/Complication Documentation
- Emergence Documentation
- Aldrete Score Calculator
- Digital Signature Modal
- PACU Handoff Report

---

## 48. Surgeon - RVS Code Mapping for PhilHealth

### User Flow
Complete Operative Record → Navigate to Procedure Section → System Prompts RVS Code Entry → Click "Add RVS Code" → Search RVS Code Catalog → Select Primary Procedure Code → (If Multiple Procedures) Add Additional Codes → System Shows PhilHealth Case Rate Association → Verify Correct Mapping → Enter Laterality (If applicable) → Enter Surgeon Role (Primary vs. Assist) → Save RVS Mapping → RVS Codes Attached to Encounter → Routes to Billing for eClaims → Biller Verifies RVS Codes → Included in CF4 Generation

### Wireframe Pages
- Operation Record View
- Procedure Section
- RVS Code Entry Prompt
- RVS Code Search
- Code Catalog Browser (By body system)
- Primary Procedure Selection
- Additional Procedure Entry
- PhilHealth Case Rate Display
- Mapping Verification
- Laterality Selection (Left, Right, Bilateral)
- Surgeon Role Selection
- Save Confirmation
- Billing Queue Notification
- Biller RVS Verification View
- CF4 Integration Display

---

## 49. Scheduler - OR Schedule Management

### User Flow
Open EMR → Login → Access OR Scheduling Dashboard → View OR Calendar → Select Date → View Available Time Slots per Room → Click "Create Surgical Booking" → Search Patient → Select Procedure Type → Estimate Surgery Duration → Select Surgeon → Assign OR Room → Assign Time Slot → Add Anesthesia Type → Add Equipment Needs → Check Schedule Conflicts → Save Booking → Booking Appears on Calendar → Notifications Sent to Surgical Team → (Day Of) Check In Patient → Update to "In Room" → Update to "Case Complete" → Release OR Room

### Wireframe Pages
- OR Scheduling Dashboard
- Calendar View (Day, Week, Month)
- Room Availability Grid
- Create Booking Modal
- Patient Search
- Procedure Type Selection
- Duration Estimation
- Surgeon Selection (With availability)
- OR Room Assignment
- Time Slot Selection
- Anesthesia Requirements
- Equipment Needs Checklist
- Conflict Check Display
- Booking Confirmation
- Team Notifications
- Day-of Check-in
- Status Updates (Waiting → In Room → Complete)
- Room Release Confirmation

---

## 50. Pharmacist - Verify Medication Order

### User Flow
Open EMR → Login → Access Pharmacy Verification Queue → View Pending Orders → Select Order → Review Order Details → Check Medication Appropriateness → Review Patient Allergies → Review Patient Weight → Review Renal/Hepatic Function → Calculate Dose Appropriateness → Check Drug Interactions → Check Formulary Status → (If Issue Found) Add Clinical Note → Contact Prescriber → Document Communication → (If Appropriate) Click "Verify" → Sign Verification → Medication Available on MAR → (If Not Appropriate) Reject Order → Enter Rejection Reason → Suggest Alternative → Prescriber Notified

### Wireframe Pages
- Pharmacy Verification Queue
- Pending Orders List (Sortable by priority, time)
- Order Detail View
- Patient Clinical Summary (Allergies, Weight, Labs)
- Dose Calculation Tool
- Drug Interaction Checker
- Formulary Status Display
- Clinical Note Entry
- Prescriber Contact Log
- Communication Documentation
- Verification Modal
- Digital Signature
- MAR Update Confirmation
- Rejection Modal
- Rejection Reason Entry
- Alternative Suggestion Field
- Prescriber Notification

---

## 51. Pharmacist - Review Dosing Against Patient Parameters

### User Flow
Open Pharmacy Queue → Select Medication Order → View Patient Profile → Check Patient Weight → Check Renal Function (CrCl, eGFR) → Check Hepatic Function (LFTs) → Open Dosing Calculator → Enter Medication → System Shows Standard Dosing → System Shows Weight-based Dosing → System Shows Renal Adjustment Recommendations → System Shows Hepatic Adjustment Recommendations → Compare Ordered Dose vs. Recommendations → (If Within Range) Proceed to Verify → (If Outside Range) Flag for Review → Add Clinical Recommendation → Contact Prescriber → Document Discussion → Finalize Verification Decision

### Wireframe Pages
- Pharmacy Queue
- Medication Order Detail
- Patient Profile Section
- Weight Display
- Renal Function Labs (CrCl, eGFR values)
- Hepatic Function Labs (AST, ALT, Bilirubin)
- Dosing Calculator Tool
- Medication Selection
- Standard Dosing Display
- Weight-based Calculation
- Renal Dosing Recommendations
- Hepatic Dosing Recommendations
- Dose Comparison View
- Flag for Review Modal
- Clinical Recommendation Entry
- Prescriber Contact
- Communication Log
- Verification Decision

---

## 52. Pharmacist - Add Formulary Notes and Alternatives

### User Flow
Open EMR → Login → Access Formulary Management → Search Medication → View Medication Details → Click "Add Formulary Note" → Enter Note Type (Restriction, Protocol, Alert) → Enter Note Text → (If Restriction) Define Criteria for Use → Set Note Effective Date → Save Note → Note Appears During CPOE → (For Alternatives) Click "Add Therapeutic Alternative" → Search Alternative Drug → Define Clinical Equivalence → Rank Alternatives → Save Alternatives → Alternatives Offered During Non-formulary Orders → Track Alternative Acceptance Rate

### Wireframe Pages
- Formulary Management Dashboard
- Medication Search
- Medication Details Page
- Add Note Modal
- Note Type Selection
- Note Text Entry
- Restriction Criteria Definition
- Effective Date Selection
- Note Preview
- CPOE Integration Preview
- Add Alternative Modal
- Alternative Drug Search
- Clinical Equivalence Documentation
- Alternative Ranking
- Alternative List View
- CPOE Non-formulary Alert Preview
- Alternative Acceptance Analytics

---

## 53. Clinical Dietitian - Nutrition Assessment

### User Flow
Open EMR → Login → Access Dietitian Worklist → View Consult Requests → Select Patient → Open Nutrition Assessment → Review Diet Order → Enter Anthropometric Data (Height, Weight, BMI) → Calculate Ideal Body Weight → Assess Body Composition → Review Lab Values (Albumin, Prealbumin, etc.) → Document Diet History (24-hour recall, food preferences) → Document Current Oral Intake → Calculate Nutrient Needs → Assess Malnutrition Risk (SGA or other tool) → Document Risk Status → Create Assessment Summary → Sign Assessment → Link to Care Plan → Generate Interventions

### Wireframe Pages
- Dietitian Worklist
- Consult Requests Queue
- Patient Selection
- Nutrition Assessment Form
- Current Diet Order Display
- Anthropometric Data Entry
- Weight History Graph
- BMI Calculator
- Body Composition Section
- Lab Values Display (Nutrition-relevant)
- Diet History Form
- 24-Hour Recall Entry
- Food Preferences Section
- Current Intake Documentation
- Nutrient Needs Calculator
- Malnutrition Risk Tool (SGA)
- Risk Status Selection
- Assessment Summary
- Digital Signature
- Care Plan Link

---

## 54. Clinical Dietitian - Create Therapeutic Meal Plan

### User Flow
Complete Nutrition Assessment → Click "Create Meal Plan" → Select Diet Type (Cardiac, Diabetic, Renal, etc.) → System Loads Diet Template → Modify Calorie Target → Modify Macronutrient Distribution → Set Texture Modification (If needed) → Set Consistency (Liquid, Soft, Regular) → Add Restrictions (Allergens, Religious) → Add Supplements (If needed) → Generate Sample Menu → Review Daily Nutrition Summary → Verify Meets Patient Needs → Sign Meal Plan → Send to Food Service → Update Diet Order → Meal Plan Active in Chart → Track Patient Intake Against Plan

### Wireframe Pages
- Nutrition Assessment Summary
- Create Meal Plan Button
- Diet Type Selection
- Diet Template Loading
- Calorie Target Adjustment
- Macronutrient Distribution (Carb/Protein/Fat)
- Texture Modification Selection
- Consistency Selection
- Restrictions Entry
- Supplement Addition
- Sample Menu Generator
- Daily Nutrition Summary
- Needs Verification
- Digital Signature Modal
- Food Service Notification
- Diet Order Update Confirmation
- Active Meal Plan Display
- Intake Tracking View

---

## 55. Clinical Dietitian - HL7 FHIR NutritionOrder

### User Flow
Complete Nutrition Assessment → Create Meal Plan → System Generates NutritionOrder Resource → Review FHIR NutritionOrder Structure → Verify Coded Diet (SNOMED) → Verify Texture Codes → Verify Allergy Mapping → Verify Supplement Coding → Preview FHIR JSON/XML → Validate Against FHIR R4 Spec → Sign Order → Submit to Food Service Interface → Track Order Status → Receive Confirmation → Order Interoperable with External Systems → Available for NHDR Reporting

### Wireframe Pages
- Meal Plan Summary
- Generate FHIR Order Button
- NutritionOrder Resource View
- Diet Type Coding (SNOMED display)
- Texture Coding Section
- Allergy Mapping Verification
- Supplement Coding
- FHIR Preview (JSON/XML toggle)
- Validation Status Display
- Validation Error Details (If any)
- Digital Signature Modal
- Food Service Submission
- Order Status Tracker
- Confirmation Receipt
- NHDR Export Availability

---

## 56. Scheduler - Create and Manage Clinic Templates

### User Flow
Open EMR → Login → Access Scheduling Admin → Click "Clinic Templates" → Click "Create New Template" → Enter Template Name → Select Provider(s) → Select Clinic Location → Define Appointment Types Allowed → Set Template Days (Mon-Fri, etc.) → Set Time Blocks → Define Slot Duration per Appointment Type → Set Overbooking Rules → Set Buffer Times → Review Template → Activate Template → Template Available for Booking → (To Modify) Edit Existing Template → Save Changes → Apply to Future Dates

### Wireframe Pages
- Scheduling Admin Dashboard
- Clinic Templates List
- Create Template Modal
- Template Name Entry
- Provider Selection (Multi-select)
- Location Selection
- Appointment Type Selection
- Day Selection (Days of week)
- Time Block Definition
- Slot Duration Setting
- Overbooking Rules
- Buffer Time Configuration
- Template Preview Calendar
- Activation Confirmation
- Booking Availability Display
- Edit Template View
- Apply Changes Modal

---

## 57. Scheduler - Book Patient Appointment

### User Flow
Open EMR → Login → Access Scheduling Dashboard → Search Patient → (If New) Create Patient Record → Select Patient → Click "Book Appointment" → Select Provider → View Provider Availability Calendar → Select Date → View Available Time Slots → Select Appointment Type → Select Time Slot → Enter Visit Reason → Enter Duration Override (If needed) → Add Special Instructions → Check for Scheduling Conflicts → Confirm Booking → System Creates Appointment → Send Patient Confirmation (SMS/Email) → Appointment Appears on Schedule → Add to Patient Portal

### Wireframe Pages
- Scheduling Dashboard
- Patient Search
- New Patient Registration (If needed)
- Patient Selection Confirmation
- Book Appointment Modal
- Provider Selection
- Provider Calendar View
- Date Selection
- Available Slots Display (Time grid)
- Appointment Type Selection
- Time Slot Selection
- Visit Reason Entry
- Duration Override Option
- Special Instructions Field
- Conflict Check Result
- Booking Confirmation Modal
- Patient Notification Confirmation
- Schedule View Update
- Patient Portal Display

---

## 58. Scheduler - Patient Check-In

### User Flow
Open EMR → Login → Access Check-In Dashboard → View Today's Appointments → Patient Arrives → Search Patient in Today's List → Click Patient Name → Verify Demographics Current → (If Updates) Edit Demographics → Verify Insurance Current → Capture Consent (If required) → Complete Arrival Checklist → Click "Check In" → Patient Status Changes to "Arrived" → Clinical Team Notified → Patient Added to Provider Worklist → Wait Time Tracking Begins → Patient Called to Exam Room → Status Changes to "Roomed"

### Wireframe Pages
- Check-In Dashboard
- Today's Appointments List
- Patient Search/Selection
- Demographics Verification Form
- Edit Demographics Modal
- Insurance Verification
- Consent Capture Modal
- Arrival Checklist
- Check-In Confirmation
- Status Update Display
- Clinical Team Notification
- Provider Worklist Addition
- Wait Time Display
- Room Assignment
- Status to "Roomed" Update

---

## 59. Patient/Proxy - View Upcoming Appointments

### User Flow
Open Patient Portal → Login → Access Dashboard → View "Upcoming Appointments" Section → See Appointments List (Date, Time, Provider, Location) → Click Appointment for Details → View Pre-visit Instructions → View Required Documents → (If Allowed) Click "Cancel" → Confirm Cancellation → Receive Cancellation Confirmation → (If Allowed) Click "Reschedule" → View Available Slots → Select New Slot → Confirm Reschedule → Receive Confirmation Email/SMS → Updated Appointment Reflects in Portal

### Wireframe Pages
- Patient Portal Login
- Patient Dashboard
- Upcoming Appointments Widget
- Appointments List View
- Appointment Details Modal
- Pre-visit Instructions
- Required Documents List
- Cancel Appointment Button
- Cancellation Confirmation Modal
- Cancellation Success Message
- Reschedule Option
- Available Slots Calendar
- New Slot Selection
- Reschedule Confirmation
- Confirmation Notification
- Updated Appointments View

---

## 60. Biller - Clinical Charge Capture

### User Flow
Open EMR → Login → Access Billing Dashboard → View Patients with Unbilled Services → Select Patient/Encounter → View Encounter Timeline → Review Clinical Services Rendered → System Auto-captures Charges from Orders → Review Auto-captured Charges → Add Missing Charges Manually → Enter Service Code (CPT/RVS) → Enter Quantity → Select Performing Provider → Verify Diagnosis Codes → Apply Modifiers (If needed) → Review Complete Charge List → Submit for Billing → Charges Ready for Invoice/Claims

### Wireframe Pages
- Billing Dashboard
- Unbilled Services Queue
- Patient/Encounter Selection
- Encounter Timeline View
- Clinical Services List
- Auto-captured Charges Display
- Add Charge Modal
- Service Code Search (CPT/RVS)
- Quantity Entry
- Provider Selection
- Diagnosis Code Verification
- Modifier Selection
- Complete Charge List
- Charge Summary
- Submit Confirmation
- Invoice/Claims Queue Update

---

## 61. Biller - Create Patient Invoice

### User Flow
Open EMR → Login → Access Billing Dashboard → Select Patient/Encounter → View All Charges → Click "Generate Invoice" → System Compiles Charges → Apply Discounts (If applicable) → Apply PhilHealth Coverage (If applicable) → Calculate Patient Responsibility → Generate Invoice Number → Create Line-Item Invoice → Add Payment Terms → Preview Invoice → Print/Send Invoice → Save Invoice to Encounter → Track Invoice Status → (When Paid) Record Payment → Mark Invoice Complete

### Wireframe Pages
- Billing Dashboard
- Patient/Encounter Selection
- Charges List View
- Generate Invoice Button
- Invoice Compilation Display
- Discount Application Modal
- PhilHealth Coverage Application
- Patient Responsibility Calculation
- Auto-generated Invoice Number
- Invoice Preview (Line items)
- Payment Terms Section
- Print/Email Options
- Invoice Save Confirmation
- Invoice Tracking Dashboard
- Payment Recording Form
- Invoice Status Update

---

## 62. Biller - Record Payment and Issue Receipt

### User Flow
Open EMR → Login → Access Payment Processing → Search Patient/Invoice → Select Open Invoice → View Outstanding Balance → Click "Record Payment" → Select Payment Type (Cash, Card, Check, PhilHealth) → Enter Amount Received → (If Partial) System Calculates Remaining Balance → (If Cash) Calculate Change → Apply Payment to Invoice → Generate Receipt Number → Print/Email Receipt → Update Invoice Status → (If Paid in Full) Mark Invoice Complete → (If Partial) Keep Invoice Open → Update AR Aging Report

### Wireframe Pages
- Payment Processing Dashboard
- Patient/Invoice Search
- Open Invoice Display
- Outstanding Balance Summary
- Record Payment Modal
- Payment Type Selection
- Amount Entry
- Remaining Balance Calculator
- Change Calculator (For cash)
- Payment Application Summary
- Receipt Generation
- Receipt Preview
- Print/Email Options
- Invoice Status Update
- Partial Payment Tracking
- AR Aging Report Update

---

## 63. Biller - Auto-Generate PhilHealth CF4

### User Flow
Patient Discharged → Encounter Finalized → Biller Opens Encounter → Click "Generate CF4" → System Extracts Data from Clinical Notes → Auto-populate Chief Complaint → Auto-populate Brief History → Auto-populate Course in Ward → Auto-populate Vital Signs → Auto-populate Management Plan → Auto-populate Diagnosis (ICD-10) → Auto-populate Procedure (RVS) → Review Extracted Data → Edit/Correct if Needed → Validate Against PhilHealth Requirements → Generate XML Format → CF4 Ready for eClaims Submission → Submit to PhilHealth → Track Claim Status

### Wireframe Pages
- Finalized Encounters List
- Encounter Selection
- Generate CF4 Button
- Data Extraction Progress
- CF4 Form Display (Pre-filled)
- Chief Complaint Section
- Brief History Section
- Course in Ward Section
- Vital Signs Section
- Management Plan Section
- Diagnosis Display (ICD-10 codes)
- Procedure Display (RVS codes)
- Edit Mode Toggle
- Validation Results
- XML Preview
- eClaims Submission
- Claim Tracking Dashboard

---

## 64. Biller - Manage DRG Shadow Billing (CF5)

### User Flow
Open EMR → Login → Access DRG Management → View Inpatient Encounters → Select Encounter → View Diagnoses and Procedures → System Suggests DRG Assignment → Review DRG Grouper Logic → Accept or Change DRG → Document DRG Selection Rationale → Calculate Expected Reimbursement → Generate CF5 (DRG Claim) → Review CF5 Data → Validate Completeness → Submit CF5 to PhilHealth → Track Approval Status → (If Denied) Review Denial Reason → Appeal if Applicable

### Wireframe Pages
- DRG Management Dashboard
- Inpatient Encounters List
- Encounter Selection
- Diagnoses/Procedures Display
- DRG Grouper Suggestion
- DRG Logic Explanation
- DRG Selection Interface
- Rationale Documentation
- Expected Reimbursement Calculator
- CF5 Generation
- CF5 Review Form
- Completeness Validation
- PhilHealth Submission
- Claim Tracking
- Denial Review Modal
- Appeal Submission

---

## 65. Biller - Generate Electronic Statement of Account (eSOA)

### User Flow
Open EMR → Login → Access Billing Dashboard → Select Encounter/Invoice → Click "Generate eSOA" → System Compiles Financial Data → Include All Charges → Include All Payments → Include PhilHealth Claims Status → Calculate Net Amount Due → Format as PhilHealth XML → Preview eSOA Document → Validate XML Structure → Save eSOA to Encounter → Submit to PhilHealth Portal → Receive Acknowledgment → Track Processing Status → (If Errors) Correct and Resubmit

### Wireframe Pages
- Billing Dashboard
- Encounter/Invoice Selection
- Generate eSOA Button
- Financial Data Compilation Progress
- Charges Summary
- Payments Summary
- PhilHealth Claims Status
- Net Amount Calculation
- XML Preview
- eSOA Document Preview
- XML Validation Results
- Save Confirmation
- PhilHealth Portal Submission
- Acknowledgment Receipt
- Processing Status Tracker
- Error Correction Interface

---

## 66. Biller - PhilHealth Eligibility Check (CEWS)

### User Flow
Open EMR → Login → Access PhilHealth Services → Enter Patient PhilHealth Number → (Or) Enter Patient Demographics → Click "Check Eligibility" → System Calls CEWS API → Retrieve Member Information → Display Membership Status → Display Category (Member, Dependent, Indigent) → Display Available Benefits → Display Previous Claims This Year → Display Remaining Coverage → Save Results to Encounter → Proceed with Service Delivery → (If Ineligible) Display Reason → Document Non-coverage → Notify Patient of Cash Pay

### Wireframe Pages
- PhilHealth Services Dashboard
- PhilHealth Number Entry
- OR Demographics Entry
- Check Eligibility Button
- API Loading Indicator
- Member Information Display
- Membership Status (Active/Inactive)
- Category Display
- Available Benefits List
- Previous Claims Summary
- Remaining Coverage Display
- Save to Encounter Confirmation
- Ineligible Alert Modal
- Ineligibility Reason
- Non-coverage Documentation
- Cash Pay Notification

---

## 67. MSW - Financial Assistance Evaluation

### User Flow
Open EMR → Login → Access Social Work Dashboard → View Referrals for Financial Assessment → Select Patient → Review Patient Demographics → Review Encounter Details → Interview Patient/Family → Complete Socioeconomic Assessment → Document Income Sources → Calculate Total Household Income → Assess Assets → Determine Poverty Level Classification → Check Existing Coverage (PhilHealth, SSS, etc.) → Identify Assistance Programs Eligible → Document Assessment Findings → Generate Classification Report → Route to Appropriate Assistance Program → Save Assessment to Chart

### Wireframe Pages
- Social Work Dashboard
- Financial Assessment Referrals
- Patient Selection
- Demographics Review
- Encounter Details
- Socioeconomic Assessment Form
- Income Documentation
- Income Calculator
- Assets Assessment
- Poverty Level Calculator
- Existing Coverage Check
- Assistance Program Matching
- Assessment Findings Summary
- Classification Report Generator
- Program Routing
- Chart Documentation

---

## 68. MSW - Issue Certificate of Eligibility (CoE)

### User Flow
Complete Financial Assessment → Patient Qualifies for Assistance → Click "Issue CoE" → System Loads CoE Template → Auto-populate Patient Information → Auto-populate Assessment Findings → Auto-populate Program Eligibility → Enter Specific Benefit Applied For → Enter Amount of Assistance → Enter Validity Period → Add MSW Digital Signature → Preview Certificate → Generate Official Document → Print Certificate → Record Certificate Number → Track Certificate in System → Patient Uses for Assistance Application

### Wireframe Pages
- Financial Assessment Summary
- Issue CoE Button
- CoE Template Display
- Patient Information (Pre-filled)
- Assessment Findings (Pre-filled)
- Program Eligibility Display
- Benefit Selection
- Assistance Amount Entry
- Validity Period Setting
- Digital Signature Capture
- Certificate Preview
- Print Options
- Certificate Number Display
- Certificate Tracking Log
- Patient Receipt Confirmation

---

## 69. MSW - Capture PhilHealth Annex A & B Signatures

### User Flow
Patient Requires PhilHealth Benefits → Open Social Work Module → Select Patient → Click "PhilHealth Forms" → Select Annex A (Informed Consent) → Load Annex A Form → Review Consent Terms with Patient → Patient Reads and Agrees → Capture Patient Digital Signature → Record Signature Date/Time → Save Annex A → Select Annex B (Member Empowerment) → Load Annex B Form → Explain Member Rights → Patient Acknowledges → Capture Patient Digital Signature → Record Signature Date/Time → Save Annex B → Both Forms Attached to Encounter → Available for eClaims

### Wireframe Pages
- Social Work Module
- Patient Selection
- PhilHealth Forms Menu
- Annex A Form Display
- Consent Terms Reading Section
- Patient Agreement Confirmation
- Digital Signature Capture Pad (Annex A)
- Signature Timestamp
- Annex A Save Confirmation
- Annex B Form Display
- Member Rights Explanation
- Acknowledgment Section
- Digital Signature Capture Pad (Annex B)
- Annex B Save Confirmation
- Both Forms linked to Encounter
- eClaims Ready Indicator

---

## 70. MSW - Malasakit Center Coordination

### User Flow
Open EMR → Login → Access Malasakit Module → Patient Referred to Malasakit → Open Patient Record → Document Financial Need → Check Available Agency Assistance (PCSO, PAGCOR, DSWD, etc.) → Submit Request to Agency → Track Request Status → Receive Agency Response → Document Assistance Provided → Record Amount and Source → Update Patient Billing → Track Multiple Agency Requests → Generate Assistance Summary → Complete Malasakit Coordination → Close Case When Assistance Complete

### Wireframe Pages
- Malasakit Module Dashboard
- Patient Referral Queue
- Patient Record View
- Financial Need Documentation
- Agency Selection (Multi-agency)
- Request Submission Form
- Request Status Tracker
- Agency Response Recording
- Assistance Documentation
- Amount and Source Entry
- Billing Update Integration
- Multi-agency Tracking View
- Assistance Summary Generator
- Case Status Updates
- Case Closure

---

## 71. HIM Coder - Manage Chart Deficiencies

### User Flow
Open EMR → Login → Access HIM Dashboard → View Deficiency Queue → Filter by Type (Unsigned Notes, Missing Documentation, Incomplete Coding) → Sort by Age/Priority → Select Chart → View Deficiency Details → Identify Responsible Provider → Send Deficiency Notification → Set Due Date for Completion → Track Provider Response → (When Documentation Complete) Review Completion → Clear Deficiency → Remove from Queue → Generate Deficiency Reports → Track Provider Compliance Rates

### Wireframe Pages
- HIM Dashboard
- Deficiency Queue
- Filter Options (Type, Age, Provider)
- Sort Options
- Chart Selection
- Deficiency Details View
- Responsible Provider Display
- Send Notification Modal
- Due Date Setting
- Response Tracking Timeline
- Completion Review
- Clear Deficiency Confirmation
- Queue Update
- Deficiency Reports Generator
- Provider Compliance Dashboard

---

## 72. HIM Coder - Assign ICD-10 Codes

### User Flow
Open EMR → Login → Access Coding Queue → View Discharged Charts Pending Coding → Select Chart → Review Clinical Documentation (History, Notes, Op Record, Discharge Summary) → Identify Principal Diagnosis → Search ICD-10 Code → Select Most Accurate Code → Add Secondary Diagnoses → Code Complications/Comorbidities → Add Procedure Codes → Verify Coding Completeness → Apply DRG Grouper → Review DRG Assignment → Sign Coding → Chart Moves to Billing → Update Coding Statistics

### Wireframe Pages
- Coding Queue Dashboard
- Pending Charts List
- Chart Selection
- Clinical Documentation Viewer (Multi-tab)
- Principal Diagnosis Identification
- ICD-10 Search Interface
- Code Selection Modal
- Secondary Diagnoses Entry
- Complications/Comorbidities Section
- Procedure Code Entry
- Coding Completeness Checklist
- DRG Grouper Application
- DRG Assignment Review
- Coding Sign-off
- Billing Queue Update
- Coding Statistics Dashboard

---

## 73. HIM Coder - Ensure Top 10 Morbidity/Mortality Accuracy

### User Flow
Open EMR → Login → Access Quality Dashboard → View Top 10 Morbidity Cases → Filter by Diagnosis → Review Each Chart for Coding Accuracy → Compare Documentation vs. Assigned Code → (If Discrepancy) Query Provider for Clarification → Document Query Response → Update Code if Needed → View Top 10 Mortality Cases → Apply Same Review Process → Track Accuracy Rate → Generate Accuracy Report → Submit for AHSR Reporting → Maintain 100% Accuracy Target

### Wireframe Pages
- Quality Dashboard
- Top 10 Morbidity List
- Diagnosis Filter
- Chart Review Interface
- Documentation vs. Code Comparison
- Provider Query Form
- Query Response Documentation
- Code Update Modal
- Top 10 Mortality List
- Same Review Interface
- Accuracy Rate Tracker
- Accuracy Report Generator
- AHSR Submission Ready Indicator
- Accuracy Target Dashboard

---

## 74. HIM Coder - Verify CF4 Data Completeness

### User Flow
Open EMR → Login → Access CF4 Verification Queue → View CF4s Pending Verification → Select CF4 → Review Each Section → Check Chief Complaint Present → Check Brief History Complete → Check Course in Ward Documented → Check Vital Signs Recorded → Check Management Plan Present → Check ICD-10 Principal Diagnosis → Check ICD-10 Secondary Diagnoses → Check RVS Procedure Codes → Identify Missing Data → Query for Missing Information → (When Complete) Approve CF4 → Mark Ready for eClaims

### Wireframe Pages
- CF4 Verification Queue
- Pending CF4s List
- CF4 Selection
- Section-by-Section Review
- Chief Complaint Check
- Brief History Check
- Course in Ward Check
- Vital Signs Check
- Management Plan Check
- Principal Diagnosis Verification
- Secondary Diagnoses Verification
- Procedure Codes Verification
- Missing Data Alert
- Query Form
- Approval Confirmation
- eClaims Ready Status

---

## 75. HIM Coder - Track Healthcare-Associated Infections

### User Flow
Open EMR → Login → Access Infection Surveillance → View HAI Reports → Filter by Infection Type (VAP, BSI, CAUTI, SSI) → Filter by Date Range → Review Individual Cases → Verify Infection Criteria Met → Confirm Device Association → Record Organism Data → Document Interventions → Update Case Status → Generate Surveillance Report → Calculate Infection Rates → Submit for AHSR → Track Trends Over Time → Identify Outbreak Patterns

### Wireframe Pages
- Infection Surveillance Dashboard
- HAI Reports Queue
- Infection Type Filter
- Date Range Filter
- Individual Case Review
- Criteria Verification Checklist
- Device Association Documentation
- Organism Entry
- Intervention Documentation
- Case Status Update
- Surveillance Report Generator
- Infection Rate Calculator
- AHSR Submission
- Trend Analysis Charts
- Outbreak Pattern Detection

---

## 76. Statutory Officer - Monitor PIDSR Category 1 Diseases

### User Flow
Open EMR → Login → Access PIDSR Dashboard → View Auto-flagged Category 1 Cases → See Immediate Alert Banner → Review Flagged Case Details → Verify Diagnosis Accuracy → (If True Positive) Proceed with Reporting → Open PIDSR Notification Form → Auto-populate Patient Demographics → Enter Clinical Details → Enter Laboratory Results → Submit Immediate Notification → Document Transmission Time → Track DOH Acknowledgment → (If False Positive) Dismiss With Reason → Update Alert Queue → Generate Category 1 Report

### Wireframe Pages
- PIDSR Dashboard
- Category 1 Alerts (High-priority display)
- Immediate Alert Banner
- Case Details Modal
- Diagnosis Verification
- True Positive Confirmation
- PIDSR Form (Pre-filled)
- Clinical Details Entry
- Lab Results Entry
- Submission Confirmation
- Transmission Time Log
- DOH Acknowledgment Tracker
- False Positive Dismissal
- Alert Queue Update
- Category 1 Report Generator

---

## 77. Statutory Officer - Weekly Category 2 Reporting

### User Flow
Open EMR → Login → Access PIDSR Dashboard → Click "Weekly Report" → Select Reporting Week → System Aggregates Category 2 Cases → Review Cases by Disease Type → Verify Case Classifications → (If Adjustments Needed) Edit Case Data → Generate Weekly Summary → Review Disease Totals → Export to PIDSR Format → Submit to Regional Epidemiology Unit → Document Submission → Receive Acknowledgment → Archive Report → Track Historical Reports

### Wireframe Pages
- PIDSR Dashboard
- Weekly Report Section
- Reporting Week Selection
- Aggregated Cases Display
- Disease Type Breakdown
- Case Classification Review
- Case Edit Modal
- Weekly Summary Generator
- Disease Totals Display
- Export Options (PIDSR format)
- Submission Confirmation
- Submission Documentation
- Acknowledgment Receipt
- Report Archive
- Historical Reports View

---

## 78. Statutory Officer - Generate AHSR Data

### User Flow
Open EMR → Login → Access AHSR Module → Select Reporting Year → System Aggregates Annual Data → View Bed Occupancy Rate (BOR) → View Patient Days Statistics → View Death Rate Statistics (Gross/Net) → View Top 10 Morbidities (ICD-10 coded) → View Top 10 Mortalities (ICD-10 coded) → View HAI Surveillance Data → View Surgical Statistics → View Delivery Statistics → Review All Indicators → Generate AHSR Document → Export in DOH Format → Prepare for LTO Submission

### Wireframe Pages
- AHSR Module Dashboard
- Reporting Year Selection
- Data Aggregation Progress
- BOR Statistics Display
- Patient Days Summary
- Death Rate Calculator (Gross/Net)
- Top 10 Morbidities Table
- Top 10 Mortalities Table
- HAI Surveillance Summary
- Surgical Statistics
- Delivery Statistics
- All Indicators Overview
- AHSR Document Generator
- DOH Format Export
- LTO Submission Prep

---

## 79. Statutory Officer - AHSR Validation and Export

### User Flow
Generate AHSR Data → Review All Sections → Run Validation Checks → Check BOR Calculation Accuracy → Check Death Rate Formulas → Check ICD-10 Code Accuracy → Check Data Completeness → (If Errors) View Error Details → Correct Data Sources → Regenerate → (If Valid) Approve AHSR → Select Export Format (Excel, PDF) → Generate Final Report → Download File → Upload to DOH Portal → Document Submission → Receive Confirmation → Archive Submission Record

### Wireframe Pages
- AHSR Data Review
- Section-by-Section Validation
- BOR Calculation Check
- Death Rate Formula Verification
- ICD-10 Accuracy Check
- Completeness Status
- Error Details Modal
- Data Correction Interface
- Regenerate Button
- Validation Success
- Export Format Selection
- Final Report Preview
- Download Confirmation
- DOH Portal Upload
- Submission Documentation
- Confirmation Receipt
- Archive Entry

---

## 80. System - Syndromic Surveillance Auto-Detection

### User Flow
Clinician Documents Diagnosis → System Analyzes Clinical Note → Check for Syndromic Keywords → Check ICD-10 Code Against Notifiable List → (If Match Found) Flag Case → Add to Surveillance Queue → Classify Category (1 or 2) → Alert Statutory Reporting Officer → Officer Reviews Flagged Case → (If True Positive) Proceed with Reporting → (If False Positive) Dismiss with Reason → Improve Detection Algorithm → Track Detection Accuracy → Generate Surveillance Analytics

### Wireframe Pages
- (Background Process)
- Keyword Detection Engine
- ICD-10 Matching Engine
- Case Flagging Trigger
- Surveillance Queue Addition
- Category Classification
- Statutory Officer Alert
- Flagged Cases Review Queue
- True Positive Workflow
- False Positive Dismissal
- Algorithm Feedback Loop
- Detection Accuracy Dashboard
- Surveillance Analytics Report

---

## 81. Clinician - Initiate Telemedicine Encounter

### User Flow
Open EMR → Login → Access Telemedicine Module → Search/Select Patient → Click "Start Teleconsult" → Verify Patient Consent for Virtual Visit → Select Visit Type → System Creates Encounter → Generate Video Platform Link → Send Link to Patient (SMS/Email) → Patient Joins Video Call → Clinician Joins Call → Conduct Virtual Consultation → Document Clinical Findings → Create e-Prescription (If needed) → Generate Clinical Abstract → End Call → Complete Documentation → Sign Encounter → Send Patient Summary

### Wireframe Pages
- Telemedicine Module Dashboard
- Patient Search/Selection
- Start Teleconsult Button
- Consent Verification Modal
- Visit Type Selection
- Encounter Creation Confirmation
- Video Link Generation (Zoom/Teams)
- Patient Notification (SMS/Email sent)
- Video Call Integration
- Clinical Documentation (During call)
- e-Prescription Modal
- Clinical Abstract Generator
- Call End Confirmation
- Documentation Completion
- Digital Signature Modal
- Patient Summary Delivery

---

## 82. Clinician - Generate Teleconsult Clinical Abstract

### User Flow
Complete Telemedicine Encounter → Click "Generate Abstract" → System Compiles Visit Summary → Include Chief Complaint → Include History of Present Illness → Include Assessment/Diagnosis → Include Management Plan → Include Medications Prescribed → Include Follow-up Instructions → Format as Patient-Friendly Document → Preview Abstract → Edit if Needed → Sign Abstract → Save to Patient Record → (Options) Print / Email to Patient → Patient Receives Downloadable Summary

### Wireframe Pages
- Telemedicine Encounter Summary
- Generate Abstract Button
- Compilation Progress
- Abstract Template (Pre-filled)
- Chief Complaint Section
- HPI Section
- Assessment/Diagnosis Section
- Management Plan Section
- Prescription Summary
- Follow-up Instructions
- Patient-Friendly Format
- Abstract Preview
- Edit Mode
- Digital Signature Modal
- Save Confirmation
- Delivery Options
- Patient Portal Abstract View

---

## 83. Clinician - Telemedicine e-Prescription

### User Flow
During or After Teleconsult → Click "e-Prescription" → Search Medication → Select Drug (Generic first) → Enter Dose, Route, Frequency → (If Controlled) S-2 Validation → Review Order → Sign Order → System Auto-appends PRC/PTR → Generate Prescription Document → Apply Digital Signature → (Options) Send to Pharmacy / Email to Patient / Generate QR Code → Patient Receives Prescription → Patient Presents at Pharmacy → Pharmacy Verifies Digital Signature → Medication Dispensed

### Wireframe Pages
- Teleconsult Documentation
- e-Prescription Button
- Medication Search
- Drug Selection (Generic-first)
- Dose/Route/Frequency Entry
- S-2 Validation (If needed)
- Order Review
- Digital Signature Modal
- PRC/PTR Auto-append
- Prescription Document Preview
- Digital Signature Application
- Delivery Options Modal
- Patient Receipt Confirmation
- Pharmacy Verification View

---

## 84. Patient/Proxy - Access Medical Records

### User Flow
Open Patient Portal → Login with Credentials → Access "My Health Records" → View Available Records → Select Record Type (Lab Results, Imaging, Notes, Prescriptions) → View Released Documents → Download PDF Versions → View Encounter Summaries → Access Daily Care Summaries → View Medications List → View Allergy Information → (If Need More Records) Submit Release Request → Track Request Status → Receive Notification When Released

### Wireframe Pages
- Patient Portal Login
- My Health Records Dashboard
- Record Type Selection
- Available Records List
- Document Viewer
- Download Options (PDF)
- Encounter Summary View
- Daily Care Summary
- Medications List
- Allergy Information Display
- Release Request Form
- Request Status Tracker
- Release Notification

---

## 85. Patient/Proxy - View Daily Care Summary

### User Flow
Open Patient Portal → Login → Access "Today's Summary" → View Static Daily Report → See Vital Signs from Today → See Medications Given → See Procedures Performed → See Test Results Released → See Upcoming Scheduled Items → (Summary Generated Once Daily) → (Prevents Real-time Database Load) → Download Summary PDF → Review Historical Summaries → Access Past Daily Reports

### Wireframe Pages
- Patient Portal Login
- Today's Summary Dashboard
- Today's Vital Signs Display
- Medications Given List
- Procedures Summary
- Test Results Section
- Upcoming Schedule
- Last Updated Timestamp
- PDF Download Option
- Historical Summaries Archive
- Date Selection for Past Reports

---

## 86. Patient/Proxy - Manage Consent Preferences

### User Flow
Open Patient Portal → Login → Access "Privacy Settings" → View Current Consent Status → See Data Sharing Authorizations → Review Research Consent → Modify Sharing Preferences → (Options) Grant / Revoke Specific Access → Update Contact Preferences → Save Changes → Receive Confirmation → Changes Reflected Immediately → EMR Honors Updated Preferences → Audit Trail Created

### Wireframe Pages
- Patient Portal Login
- Privacy Settings Page
- Current Consent Status Display
- Data Sharing Authorizations List
- Research Consent Section
- Preference Modification Toggles
- Grant/Revoke Access Options
- Contact Preferences (Email, SMS, Phone)
- Save Changes Button
- Confirmation Modal
- Updated Status Display
- Audit Record Created

---

## 87. System Admin - Location and Bed Master Data

### User Flow
Open EMR → Login → Access Admin Dashboard → Navigate to "Master Data" → Select "Locations" → View Location Hierarchy (Hospital → Building → Floor → Unit → Room → Bed) → Click "Add Location" → Select Location Level → Enter Location Details → Set Capacity → Set Service Type → (If Bed) Set Bed Type (Regular, ICU, Isolation) → Save Location → Location Available in ADT → (To Edit) Select Existing Location → Modify Details → Save Changes → (To Deactivate) Mark Inactive

### Wireframe Pages
- Admin Dashboard
- Master Data Menu
- Locations Management Page
- Location Hierarchy Tree View
- Add Location Modal
- Location Level Selection
- Location Details Form
- Capacity Setting
- Service Type Selection
- Bed Type Selection
- Save Confirmation
- ADT Integration Verification
- Edit Location Modal
- Deactivation Confirmation

---

## 88. System Admin - Clinical Template Configuration

### User Flow
Open EMR → Login → Access Admin Dashboard → Navigate to "Clinical Content" → Select "Templates" → View Existing Templates → Click "Create Template" → Enter Template Name → Select Template Type (Note, Form, Order Set) → Build Template Structure → Add Sections → Add Fields (Text, Dropdown, Checkbox) → Set Required Fields → Add Auto-population Rules → Preview Template → Save Template → (To Modify) Edit Existing Template → Test Changes → Publish to Users

### Wireframe Pages
- Admin Dashboard
- Clinical Content Menu
- Templates Management Page
- Existing Templates List
- Create Template Modal
- Template Name Entry
- Template Type Selection
- Template Builder Interface
- Section Management
- Field Addition (Drag-drop)
- Field Type Selection
- Required Field Toggle
- Auto-population Rules
- Template Preview
- Save/Publish Confirmation
- Edit Template View
- Testing Mode

---

## 89. System Admin - Formulary and Drug Master

### User Flow
Open EMR → Login → Access Admin Dashboard → Navigate to "Formulary" → View Drug Database → Click "Add Drug" → Enter Generic Name → Add Brand Names (Subordinate) → Enter Strength/Form → Enter Route Options → Set Formulary Status (On/Off) → Add Restrictions/Protocols → Map to Generic Class → Add Allergy Cross-refs → Add Interactions → (If Controlled) Mark Schedule → Save Drug Entry → (For Updates) Search Drug → Edit Details → Save Changes → Changes Reflect in CPOE

### Wireframe Pages
- Admin Dashboard
- Formulary Management Page
- Drug Database Browser
- Add Drug Modal
- Generic Name Entry (Primary)
- Brand Names Section (Secondary)
- Strength/Form Entry
- Route Options
- Formulary Status Toggle
- Restrictions/Protocols Entry
- Generic Class Mapping
- Allergy Cross-references
- Interaction Setup
- Controlled Substance Schedule
- Save Confirmation
- Edit Drug Modal
- CPOE Integration

---

## 90. System Admin - Triage Scale Configuration

### User Flow
Open EMR → Login → Access Admin Dashboard → Navigate to "ED Settings" → Select "Triage Configuration" → View Available Scales (ESI, ATS, CTAS) → Select Default Scale → Configure Scale Levels (1-5) → Set Level Definitions → Configure Color Codes → Set Re-triage Intervals → Configure Alert Thresholds → Map to Disposition Options → Save Configuration → Test in ED Module → Deploy to Triage Stations

### Wireframe Pages
- Admin Dashboard
- ED Settings Menu
- Triage Configuration Page
- Available Scales Selection
- Default Scale Setting
- Level Configuration (1-5)
- Level Definition Editor
- Color Code Assignment
- Re-triage Interval Settings
- Alert Threshold Configuration
- Disposition Mapping
- Save Configuration
- Testing Interface
- Deployment Confirmation

---

## 91. System Admin - Terminology Code Set Management

### User Flow
Open EMR → Login → Access Admin Dashboard → Navigate to "Terminology" → View Code Sets (ICD-10, LOINC, RxNorm, RVS) → Select Code Set → View Current Version → Check for Updates → Download Update Package → Preview Changes (New Codes, Deprecated Codes) → Schedule Update Window → Apply Update → Verify Integration → Update Local Mappings → Test in Clinical Modules → Publish Updated Code Set

### Wireframe Pages
- Admin Dashboard
- Terminology Management Page
- Code Set List (ICD-10, LOINC, RxNorm, RVS)
- Code Set Details View
- Current Version Display
- Update Check Interface
- Download Progress
- Changes Preview (Diff view)
- Update Scheduling
- Apply Update Progress
- Integration Verification
- Local Mapping Updates
- Clinical Module Testing
- Publish Confirmation

---

## 92. Clinician - Offline Mode Documentation

### User Flow
(Internet Outage Occurs) → System Detects Offline Status → Display Offline Mode Banner → Access Cached Patient Summaries → View Essential Patient Data (Demographics, Allergies, Meds) → Open Limited Documentation Form → Enter Critical Clinical Notes → Save Locally → (When Connection Restored) → System Detects Online Status → Auto-sync Initiated → Upload Offline Documentation → Resolve Any Conflicts → Merge with Central Record → Clear Local Cache → Confirm Sync Complete

### Wireframe Pages
- Offline Mode Banner (Prominent indicator)
- Cached Patient List
- Patient Summary View (Limited data)
- Demographics Display
- Allergies Display
- Current Medications Display
- Limited Documentation Form
- Local Save Confirmation
- Connection Restored Notification
- Auto-sync Progress
- Offline Data Upload
- Conflict Resolution Interface
- Merge Confirmation
- Sync Complete Notification

---

## 93. System - Automatic Data Synchronization

### User Flow
(Connection Restored After Outage) → System Detects Connectivity → Queue Offline Records for Sync → Authenticate to Central Server → Compare Timestamps → (If No Conflicts) Direct Upload → Merge with Central Records → (If Conflicts Exist) Flag for Review → Present Conflict Resolution UI → User Resolves Conflicts → Upload Resolved Data → Confirm Successful Sync → Update Local Cache → Clear Pending Queue → Log Sync Activity → Ready for Normal Operation

### Wireframe Pages
- Connection Detection
- Sync Queue Display
- Authentication Handoff
- Timestamp Comparison
- Direct Upload Progress
- Merge Confirmation
- Conflict Detection Alert
- Conflict Resolution UI (Side-by-side)
- Resolution Options
- Resolved Data Upload
- Sync Success Confirmation
- Cache Update Status
- Sync Activity Log
- Normal Operation Indicator

---

## 94. System Admin - FHIR Integration Configuration

### User Flow
Open EMR → Login → Access Admin Dashboard → Navigate to "Integrations" → Select "FHIR Settings" → Configure NHDR Endpoint → Enter API Credentials → Test Connection → Map Local Resources to FHIR R4 → Configure Patient Resource → Configure Encounter Resource → Configure Observation Resources → Configure DiagnosticReport → Configure Medication Resources → Validate Mappings → Enable Data Exchange → Monitor Integration Health → Track Transaction Logs

### Wireframe Pages
- Admin Dashboard
- Integrations Menu
- FHIR Settings Page
- NHDR Endpoint Configuration
- API Credentials Entry
- Connection Test
- Resource Mapping Interface
- Patient Resource Mapping
- Encounter Mapping
- Observation Mapping
- DiagnosticReport Mapping
- Medication Mapping
- Mapping Validation
- Enable Exchange Toggle
- Integration Health Dashboard
- Transaction Log Viewer

---

## 95. System Admin - ERP API Integration

### User Flow
Open EMR → Login → Access Admin Dashboard → Navigate to "Integrations" → Select "ERP Settings" → Configure ERP Endpoint (Supply Chain, HR, Finance) → Enter Authentication Details → Map EMR Clinical Consumption → Link to ERP Inventory Deduction → Test Single Transaction → Verify Two-way Communication → Configure Error Handling → Set Retry Policies → Enable Integration → Monitor Transaction Volume → Track Failed Transactions → Resolve Integration Errors

### Wireframe Pages
- Admin Dashboard
- Integrations Menu
- ERP Settings Page
- ERP Endpoint Configuration
- Authentication Setup
- Clinical Consumption Mapping
- Inventory Deduction Link
- Test Transaction Interface
- Communication Verification
- Error Handling Configuration
- Retry Policy Settings
- Enable Integration Toggle
- Transaction Volume Dashboard
- Failed Transactions Queue
- Error Resolution Interface

---

## 96. Auditor/Privacy Officer - View Audit Logs

### User Flow
Open EMR → Login → Access Audit Dashboard → View Recent Activity Stream → Filter by User → Filter by Action Type (View, Edit, Delete, Print) → Filter by Date Range → Filter by Patient → Filter by Module → Search Specific Activity → View Activity Details → See Before/After Values → Export Audit Report → (If Suspicious Activity) Flag for Investigation → Generate Compliance Report → Document Findings

### Wireframe Pages
- Audit Dashboard
- Activity Stream (Real-time feed)
- User Filter
- Action Type Filter
- Date Range Filter
- Patient Filter
- Module Filter
- Search Bar
- Activity Details Modal
- Before/After Comparison
- Export Options (CSV, PDF)
- Flag for Investigation
- Compliance Report Generator
- Findings Documentation

---

## 97. Auditor/Privacy Officer - Review Break-Glass Access

### User Flow
Open EMR → Login → Access Audit Dashboard → Navigate to "Break-Glass Logs" → View All Emergency Access Events → Review Access Justification → Verify Patient-Provider Relationship → Check Clinical Necessity → View Records Accessed → Review Access Duration → Determine Appropriateness → (If Appropriate) Document Approval → (If Inappropriate) Flag for Investigation → Contact User for Explanation → Document Finding → Escalate if Needed → Generate Break-Glass Report

### Wireframe Pages
- Audit Dashboard
- Break-Glass Logs Section
- Emergency Access Events List
- Justification Review
- Relationship Verification
- Clinical Necessity Check
- Records Accessed Display
- Access Duration Timeline
- Appropriateness Assessment
- Approval Documentation
- Investigation Flag
- User Contact Log
- Finding Documentation
- Escalation Workflow
- Break-Glass Report Generator

---

## 98. Break-Glass Clinician - Emergency Chart Access

### User Flow
(Emergency Situation) → Access Patient Chart Without Normal Permissions → System Detects Unauthorized Access Attempt → Display Break-Glass Warning → Acknowledge Emergency Override → Enter Access Justification (Required) → Select Reason Category → Describe Clinical Necessity → Confirm Understanding of Audit → Access Granted → High-priority Audit Log Created → Privacy Officer Auto-notified → Access Time-limited → Must Re-justify for Extended Access → Complete Emergency Care → Document Care Provided → Access Ends

### Wireframe Pages
- Patient Search
- Access Denied Modal
- Break-Glass Warning
- Emergency Override Option
- Justification Entry Form
- Reason Category Selection
- Clinical Necessity Description
- Audit Acknowledgment Checkbox
- Access Granted Confirmation
- Audit Log Trigger
- Privacy Officer Notification
- Time Limit Warning
- Re-justify Prompt (If extended)
- Care Documentation
- Access End Confirmation

---

## Appendix: User Flow Summary by Module

| Module | Key User Flows |
|--------|---------------|
| **Authentication** | Login, MFA, Password Reset, License Validation |
| **ADT** | Registration, Admission, Transfer, Discharge, Birth/Death Certificates, BOR |
| **Emergency** | Triage, Trauma Alias, Pre-encounter, Chart Merge, OECB Tagging |
| **Clinical Docs** | Note Creation, Templates, Signing, Amendments, Consent, FPE |
| **CPOE** | Medication Orders, Generics, e-Prescription, S-2 Validation, Lab/Imaging Orders |
| **Maternal/Neonatal** | NBS Screening, NBS Logbook, FMDRF/FNDRF |
| **Nursing** | MAR, TAR, PRN, Vitals, I/O, Handoff, HAI Tagging, NEWS |
| **Problems/Allergies** | Problem List, Allergy Documentation, Alert Review |
| **Laboratory** | Result Entry, Validation, Viewing, Transfusion Verification |
| **Radiology** | Report Attachment, Critical Findings, PACS Access |
| **OR/Surgical** | Operation Record, Anesthesia Record, RVS Coding, Scheduling |
| **Pharmacy** | Order Verification, Dosing Review, Formulary Notes |
| **Nutrition** | Assessment, Meal Plans, FHIR NutritionOrders |
| **Scheduling** | Templates, Booking, Check-In, Patient View |
| **Billing/RCM** | Charge Capture, Invoicing, Payments, CF4/CF5, eSOA, CEWS |
| **Social Work** | Financial Assessment, CoE, Annex Forms, Malasakit |
| **HIM Coding** | Deficiencies, ICD-10 Coding, CF4 Verification, HAI Tracking |
| **Statutory Reporting** | PIDSR Cat 1/2, AHSR Generation, Syndromic Surveillance |
| **Telemedicine** | Virtual Encounters, Clinical Abstract, e-Prescription |
| **Patient Portal** | Records Access, Daily Summaries, Consent Management |
| **Admin/Config** | Master Data, Templates, Formulary, Terminology, Triage |
| **Offline/Sync** | Offline Documentation, Auto-sync, Conflict Resolution |
| **Interoperability** | FHIR Config, ERP Integration |
| **Audit/Privacy** | Audit Logs, Break-Glass Review, Compliance |
