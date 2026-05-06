# Manual Test Plan - Physician, Surgeon, Anesthesiologist

## Scope

This checklist is based on:

- `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
- `docs/USER_STORIES.md`
- `docs/USER_FLOWS.md`

Covered role stories:

- Physician: `1.5`, `3.2`, `4.1`, `4.2`, `4.3`, `4.5`, `5.1` to `5.5`, `6.4`, `6.5`, `14.1`, `14.2`, `18.1`
- Surgeon: `9.1`, `9.3`
- Anesthesiologist: `9.2`

This plan is mapped to the current UI, not only the docs. Some labels differ slightly from the story text.

## Current UI Map

- Patient chart tabs: `Summary`, `Problems & Allergies`, `Documentation`, `Orders`, `e-Prescription`, `Surgical`, `Death Report`, `Discharge`
- Emergency workflow: `/ed`
- Surgical workflow: `/surgical`
- Telemedicine workflow: `/telemedicine`

Important doc-to-UI mappings:

- Story `4.3` FPE is created from `Documentation` -> `New Note` -> `FPE / Konsulta`
- Story `4.2` "Amend" currently appears as `Add Addendum`
- Story `5.1` medication ordering currently ends with `Create Order`; prescription signing happens in `e-Prescription`
- Stories `6.4` and `6.5` are enforced from `Discharge` or ED `Disposition` using a death report blocker modal
- Surgical charting inside an encounter requires a case already created in `Surgical Services`

## Suggested Test Accounts

Use the seeded dev accounts if available:

- Physician: `doctor@qhealth.local`
- Surgeon: `surgeon@qhealth.local`
- Anesthesiologist: `anesthesiologist@qhealth.local`
- Pharmacist: `pharmacist@qhealth.local`
- Nurse: `nurse@qhealth.local`
- Registrar: `registrar@qhealth.local`
- Scheduler: `scheduler@qhealth.local`
- Triage Officer: `triage@qhealth.local`
- Auditor: `auditor@qhealth.local`

Default dev password in the current app: `Password123`

## Recommended Test Data

Prepare or locate these before starting:

1. One OPD encounter for a regular adult patient
2. One ER encounter for OECB disposition testing
3. One inpatient encounter with an attached surgical case
4. One patient with at least one active allergy
5. One case where the logged-in physician should not normally have chart access
6. One reproductive-age female expired encounter for FMDRF
7. One neonatal expired encounter for FNDRF
8. One telemedicine appointment
9. One high-alert medication candidate such as insulin, heparin, or concentrated KCl
10. One controlled-substance test order for S-2 behavior

## Reusable UI Review Checklist

Apply this on every story while testing:

1. Is the feature reachable from the expected module or patient chart tab without confusion?
2. Is patient or surgical case context always visible while working?
3. Are required fields obvious before submission?
4. Are success, error, and locked states visually clear?
5. Does the screen return you to the correct list, timeline, or tab after save/sign?
6. Is the primary action button clear and placed consistently?
7. On mobile or narrow width, does the page still remain usable without clipped actions?

## Physician Tests

### PH-01 - Story 1.5 Break-Glass Emergency Access

Role: Physician

Preconditions:

- Use a patient or encounter outside the physician's normal scope

Steps:

1. Log in as Physician.
2. Open the restricted patient or encounter.
3. Confirm the chart is blocked and shows `Break-Glass Required`.
4. Click `Request Break-Glass`.
5. Confirm the break-glass form opens as a dialog on the same patient or encounter route, not as a separate page.
6. Select `Reason Category`.
7. Enter `Clinical Justification` with at least 10 characters.
8. Pick an `Access Duration`.
9. Tick the acknowledgement checkbox.
10. Click `Request Emergency Access`.
11. Confirm the dialog closes and you remain on the same patient or encounter route.
12. Refresh the page once.

Expected:

- Request button stays disabled until reason, justification, and acknowledgement are complete.
- Access is granted after submission.
- Submission does not redirect you back to the patient search page.
- The chart shows `Break-Glass Active` or an active emergency override state.
- A countdown or expiry indicator is visible.
- Access remains temporary, not permanent.

Extra check:

1. Log in as Auditor.
2. Verify the event appears in break-glass review or audit logs.

### PH-02 - Story 3.2 ER Disposition with OECB Tagging

Role: Physician

Preconditions:

- Use an ER encounter
- At least one clinical note is already signed, otherwise disposition is blocked

Steps:

1. Log in as Physician.
2. Open `Emergency`.
3. Select an active ER patient.
4. Open the `ED Disposition` dialog.
5. Test `Admit`.
6. Confirm ward and bed selectors appear.
7. Re-open the same dialog and test `Discharge` or `Transfer`.
8. Review the `OECB Eligibility Checklist`.
9. Tick all criteria needed to make the patient OECB-eligible.
10. Click `Confirm Disposition`.
11. Open the encounter summary after the action.

Expected:

- Disposition cannot proceed when there is no signed note.
- `Admit` shows ward and bed selection.
- `Discharge` and `Transfer` show OECB criteria.
- When eligible, OECB is visually tagged in the ED flow.
- The encounter summary displays `OECB Eligible: Yes`.
- For discharge, discharge instructions should appear afterward.

### PH-03 - Story 4.1 SOAP Note Authoring

Role: Physician

Steps:

1. Open a patient encounter.
2. Go to `Documentation`.
3. Click `New Note`.
4. Pick a template with SOAP sections.
5. Enter content in `Subjective`, `Objective`, `Assessment`, and `Plan`.
6. Use `Insert vitals into Objective`.
7. Use `Insert allergies into Subjective`.
8. Use `Insert labs into Objective`.
9. Click `Save Draft`.
10. Return to the notes timeline.

Expected:

- `New Note` opens the template selector.
- Draft save is blocked if `Assessment` or `Plan` is empty.
- Chart context panel shows vitals, allergies, and recent labs.
- Insert buttons place context into the expected sections.
- The note appears in the timeline with `Draft` status.

### PH-04 - Story 4.2 Note Signing and Addendum

Role: Physician

Preconditions:

- A draft note already exists

Steps:

1. Open the draft note from the timeline.
2. Click `Sign Note`.
3. Complete the signing flow.
4. Re-open the same note.
5. Confirm status is now `Signed`.
6. Verify editing the original content is no longer available.
7. Click `Add Addendum`.
8. Enter amendment reason and addendum text.
9. Save the addendum.
10. Click `Sign Addendum`.
11. Open the `History` tab.

Expected:

- Signed notes show a visible `Signed` badge.
- Signed note content is locked.
- Addendum is appended without changing original signed text.
- Note history shows the signed note plus its addendum trail.

### PH-05 - Story 4.3 PhilHealth FPE Capture

Role: Physician

Steps:

1. Open a Konsulta-eligible encounter.
2. Go to `Documentation`.
3. Click `New Note`.
4. Select `FPE / Konsulta`.
5. Fill the structured sections, especially vital signs and required screening fields.
6. Click `Save Draft`.
7. Click `Review & Submit`.
8. Review the read-only FPE summary.
9. Click `Submit & Archive FPE`.

Expected:

- FPE opens as a structured flow, not plain free-text editing.
- `Review & Submit` remains unavailable until a draft exists.
- Required FPE data is validated.
- Success state shows that the FPE was archived.
- The result is visible back in the clinical note timeline.

### PH-06 - Story 4.5 Problem List and Allergy Management

Role: Physician

Steps:

1. Open a patient encounter.
2. Go to `Problems & Allergies`.
3. In `Problem List`, click `Add Problem`.
4. Add one active problem with diagnosis text and code if available.
5. Save it.
6. Edit the same problem.
7. Resolve the problem.
8. Reactivate it.
9. In `Allergies`, click `Add Allergy`.
10. Add an allergy with type, reaction, and severity.
11. Save it.
12. Edit the allergy.
13. Deactivate the allergy.

Expected:

- Problem list supports `Active` and `Resolved` tabs.
- Counts update after add, resolve, and reactivate.
- Allergy list shows severity badges and filter by allergen type.
- Allergy actions are visible only when the user can write.

### PH-07 - Story 5.1 Medication Order with Generics Enforcement

Role: Physician

Steps:

1. Open a patient encounter.
2. Go to `Orders` -> `Medications`.
3. Click `New Medication Order`.
4. Confirm `Generic Name` is the primary required field.
5. Type or search a generic drug name.
6. Verify the `Brand Name` field only becomes available after entering the generic.
7. Click `Run Drug Safety Check`.
8. Fill dose, dose unit, dose form, route, frequency, and duration.
9. If inpatient or emergency, fill `First Dose At`.
10. Click `Create Order`.
11. Return to the medication orders list.

Expected:

- Generic-first behavior is enforced visually and functionally.
- Safety check is required before order creation.
- The order appears in the medication list after creation.
- In inpatient or ER encounters, missing `First Dose At` should block completion.

### PH-08 - Story 5.2 FDA-Compliant e-Prescription

Role: Physician

Preconditions:

- At least one medication order has already reached the ready-to-prescribe state
- If no medication appears in `Ready to Prescribe`, use a Pharmacist account to verify one first

Steps:

1. Open the same patient encounter.
2. Go to `e-Prescription`.
3. Review the prescriber license block.
4. Confirm `PRC` and `PTR` badges are visible.
5. Click `Generate Rx` for one ready medication.
6. In `Draft Prescriptions`, click sign on the draft, or use `Sign All`.
7. Confirm it moves to `Signed Prescriptions`.
8. Click `Print / Send`.
9. Review print, portal, email, and QR options.

Expected:

- PRC and PTR are clearly displayed on the page.
- Prescription generation is blocked when PRC or PTR is expired.
- Signed prescriptions unlock `Print / Send`.
- Prescription preview contains prescriber credentials.

### PH-09 - Story 5.3 Controlled Drug Prescribing with S-2

Role: Physician

Preconditions:

- Use a physician account with active S-2, or also test with expired or missing S-2 for the negative case

Steps:

1. Open `New Medication Order`.
2. Enter a medication and tick `Controlled Substance (PDEA S-2 required)`.
3. Verify the S-2 license state is shown.
4. For an invalid or expired S-2 account, confirm the UI warns and blocks compliant completion.
5. For a valid S-2 account, set a duration longer than 30 days.
6. Click `Preview Tranches`.
7. Review each tranche row.
8. Confirm `No Refill` wording is present.
9. Confirm the next eligible dispense date is shown.
10. Submit the order.
11. Review the medication order list and prescription output.

Expected:

- S-2 validation is visible before controlled-substance ordering.
- Missing or expired S-2 status is clearly shown.
- Long durations split into 30-day tranches.
- `No Refill` appears in tranche instructions.
- Tranche structure is reflected in the order list or generated prescriptions.

### PH-10 - Story 5.4 Allergy and High-Alert Decision Support

Role: Physician

Preconditions:

- Use one patient with an active allergy
- Use one high-alert drug if available
- Have a helper clinician or pharmacist account for dual verification

Steps:

1. Open `New Medication Order`.
2. Select a medication that should trigger an allergy or CDS alert.
3. Run `Run Drug Safety Check`.
4. Review the alert banners.
5. If a soft-block override is allowed, click `Override`.
6. Enter `Override reason`.
7. Click `Confirm Override`.
8. For a high-alert drug, continue until the dual verification requirement appears.
9. Complete the `High-Alert Medication - Dual Verification` step with a second clinician.
10. Submit the order.

Expected:

- Relevant CDS or allergy banners appear after the safety check.
- Override requires a reason when override is allowed.
- High-alert medication cannot proceed without dual verification.
- The UI clearly distinguishes blocking alerts from overridable alerts.

### PH-11 - Story 5.5 Lab and Imaging Order Entry

Role: Physician

Steps:

1. Open a patient encounter.
2. Go to `Orders`.
3. Open `New Lab Order`.
4. Enter the test name, urgency, and indication.
5. Submit the lab order.
6. Open `New Imaging Order`.
7. Enter the imaging request, urgency, and indication.
8. Submit the imaging order.
9. Test `Order Set` if available.
10. Verify both items appear in their respective tabs.

Expected:

- Separate lab and imaging dialogs are available.
- Orders show up in the encounter after submission.
- Order Set creation or bundled ordering is reachable from the same area.

Extra check:

1. Log in as Lab Tech or Radiologist.
2. Confirm the order appears in the downstream worklist.

### PH-12 - Story 6.4 Maternal Death Reporting Trigger

Role: Physician

Preconditions:

- Female patient aged 10 to 49
- Encounter must be moved to a deceased disposition path

Steps:

1. Open the encounter.
2. Go to `Discharge`, or use the ED disposition path if testing from ER.
3. Set disposition to `Deceased`.
4. Click `Confirm Discharge` or equivalent.
5. Confirm the `Death Reporting Required` modal appears.
6. Click `Complete` for `FMDRF`.
7. Fill all required FMDRF fields.
8. Click `Submit FMDRF`.
9. Return to the discharge flow.
10. Complete discharge again.

Expected:

- Discharge is blocked until FMDRF is submitted.
- FMDRF route opens from the modal or `Death Report` tab.
- Success state confirms submission.
- After completion, discharge can proceed.

### PH-13 - Story 6.5 Neonatal Death Reporting Trigger

Role: Physician

Preconditions:

- Neonatal patient at or below 28 days old

Steps:

1. Open the neonatal encounter.
2. Go to `Discharge`, or ED disposition if applicable.
3. Set disposition to `Deceased`.
4. Attempt to complete discharge.
5. Confirm the `Death Reporting Required` modal appears.
6. Click `Complete` for `FNDRF`.
7. Fill all required FNDRF fields.
8. Click `Submit FNDRF`.
9. Return to discharge and complete it again.

Expected:

- Discharge is blocked until FNDRF is submitted.
- FNDRF page is reachable from the modal and the encounter `Death Report` tab.
- Submission success is visible.

### PH-14 - Story 14.1 Virtual Encounter Logging

Role: Physician

Steps:

1. Open `Telemedicine`.
2. In `Scheduler`, create a virtual appointment.
3. Confirm the app auto-advances to `Clinical Note`.
4. Before selecting an appointment, verify the guard message tells you to book first.
5. Go to `Video Call`.
6. Confirm the video link panel loads.
7. Use `Join ... Call` or `Copy Link`.
8. Return to `Clinical Note`.
9. Enter chief complaint, optional vitals, SOAP notes, diagnosis, and ICD-10 code.
10. Click `Save Clinical Note`.

Expected:

- Telemedicine has clear tabs: `Scheduler`, `Clinical Note`, `Video Call`, `Abstract`, `E-Prescription`.
- Booking an appointment creates the starting point for the encounter.
- Video workflow supports joining and sharing the call link.
- Saving the clinical note completes the encounter step and advances the workflow.

### PH-15 - Story 14.2 Tele-Encounter Abstract and e-Rx

Role: Physician

Preconditions:

- A telemedicine encounter already exists

Steps:

1. In `Telemedicine`, open the `Abstract` tab.
2. Click `Generate Abstract` or `Generate Abstract from Encounter`.
3. Review the generated abstract.
4. Click `Sign Abstract`.
5. Confirm the app advances to `E-Prescription`.
6. Generate a telemedicine prescription.
7. Review sharing actions for the prescription.

Expected:

- Abstract is generated from the tele-encounter data.
- Signed abstract clearly changes state from draft to signed.
- After signing, prescription workflow becomes the next obvious step.
- Prescription sharing is available without leaving the telemedicine workspace.

### PH-16 - Story 18.1 Offline Patient Summary Access

Role: Physician

Steps:

1. Open a patient encounter while online.
2. Let the chart fully load.
3. Disable the browser network connection or use offline mode.
4. Confirm the encounter banner shows `Cached`.
5. Open `Summary`.
6. Confirm basic encounter data is still visible.
7. Re-open the same patient chart from the same browser session if possible.
8. Re-enable connectivity.
9. Confirm the offline badge disappears after reconnect.

Expected:

- The UI detects offline state and shows `Cached`.
- Cached encounter summary remains readable.
- Reconnect refreshes data automatically.

Pay close attention:

- The current UI clearly shows the cached indicator, but you should verify whether the offline summary exposes the latest vitals in an obvious way. That is a high-risk area against the TOR wording.

## Surgeon Tests

### SG-01 - Story 9.1 Operative Record Charting

Role: Surgeon

Preconditions:

- A surgical case already exists and is linked to the encounter

Steps:

1. Log in as Surgeon.
2. Open `Surgical Services` and select a case, or open the patient chart `Surgical` tab.
3. Confirm tabs exist for `Pre-Op Checklist`, `Operation Record`, `Anesthesia Record`, and `RVS Codes`.
4. Open `Operation Record`.
5. Enter `Pre-operative Diagnosis`.
6. Enter `Procedure Performed`, one procedure per line.
7. Enter `Procedure Narrative`, `Operative Technique`, findings, specimens, and complications as needed.
8. Enter `Incision Time` and `Closure Time`.
9. Review the `Surgical Team` section and assign missing personnel.
10. Save the draft.
11. Click `Sign Operation Record`.

Expected:

- Draft and signed states are clearly visible.
- Signing is blocked until required fields are completed.
- After signing, the record becomes locked.
- Surgical team fields include surgeon, assistants, scrub nurse, circulating nurse, and anesthesiologist.

### SG-02 - Story 9.3 RVS Code Capture

Role: Surgeon

Preconditions:

- The operative record has already been signed

Steps:

1. Open the same case.
2. Go to `RVS Codes`.
3. Confirm the warning about signing disappears after the operation record is signed.
4. Select a procedure from the list.
5. Search for an RVS code.
6. Add one `Primary` code.
7. Add one `Adjunct` code if appropriate.
8. Review the `Assigned Codes` table.
9. If your permissions allow, move the codes through status updates.
10. Confirm each procedure has a primary code.

Expected:

- Unsigned operative records keep RVS actions locked.
- The UI clearly shows how many procedures still lack a primary code.
- Assigned codes list shows procedure, code, description, type, status, modifier, and units.
- Final readiness should indicate that all procedures have a primary code.

## Anesthesiologist Tests

### AN-01 - Story 9.2 Anesthesia Record Charting

Role: Anesthesiologist

Preconditions:

- A surgical case already exists

Steps:

1. Log in as Anesthesiologist.
2. Open `Surgical Services` and select a case, or use the encounter `Surgical` tab.
3. Open `Anesthesia Record`.
4. Fill anesthesia type and ASA class.
5. Fill the `Airway Management` section, including airway device and grade.
6. Test `Difficult airway documented`.
7. Add at least one induction agent.
8. Add at least one maintenance agent.
9. Add at least one intraoperative medication.
10. In `Intraoperative Vitals Flowsheet`, click `Add Entry`.
11. Enter time, BP, HR, SpO2, EtCO2, and temperature.
12. Fill post-anesthesia details.
13. Click `Save Draft`.
14. Click `Sign Anesthesia Record`.
15. Confirm the sign-and-lock confirmation appears.
16. Re-open the record after signing.

Expected:

- The anesthesia record supports airway, agents, meds, vitals, and post-anesthesia sections.
- Vitals can be manually added row by row.
- Signing locks the anesthesia record.
- Signed state is obvious and prevents further edits.

Pay close attention:

- The current UI clearly supports manual vitals entry. Verify whether monitor auto-capture exists in your environment, because it is not obvious from the current screen behavior alone.

## End-to-End Navigation Checks

Run these after the role stories above:

1. Physician patient chart should show `Problems & Allergies`, `Documentation`, `Orders`, `e-Prescription`, `Death Report`, and `Discharge`.
2. Surgeon patient chart should show `Surgical` and should not depend on Nursing tabs for core OR work.
3. Anesthesiologist should land naturally in `Surgical Services` and be able to complete anesthesia records without unrelated navigation noise.
4. Switching between encounter tabs should preserve the same patient or case context.
5. Returning from modal workflows should place you back in the correct list, chart, or tab.

## High-Risk Areas to Watch

These are the places I would watch most carefully while you test:

1. Offline summary visibility of last vitals in Story `18.1`
2. Controlled-substance tranching and `No Refill` wording in Story `5.3`
3. High-alert dual verification actually blocking order completion in Story `5.4`
4. Death-report enforcement before final discharge in Stories `6.4` and `6.5`
5. RVS readiness after signed operative records in Story `9.3`
6. Whether anesthesia monitor auto-capture exists beyond manual `Add Entry`

## Suggested Result Log Format

Use this when you execute each case:

- Test ID:
- Story:
- Role:
- Passed or Failed:
- Screenshot or Route:
- Notes on UI:
- Notes on Navigation:
- Bug or Gap:
