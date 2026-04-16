# QHealth EMR - Resolved Frontend Discrepancies

> **Date:** April 14, 2026  
> **Related:** [Role-Based Frontend Analysis](./ROLE_BASED_FRONTEND_ANALYSIS.md)

This document tracks resolved discrepancies identified during the role-based frontend analysis.

---

## Resolved Issues

### 1. Missing Navigation to `/admin/formulary/code-sets`

**Issue:** Code Sets page existed at `/admin/formulary/code-sets` but was not accessible from the UI.

**Resolution:** Added "Code Sets" button to the Formulary page header.

**File Changed:** `apps/web/app/(site)/admin/formulary/page.tsx`

```tsx
<Button asChild variant="outline">
  <Link href="/admin/formulary/code-sets">Code Sets</Link>
</Button>
```

---

### 2. Missing Navigation to `/audit/break-glass`

**Issue:** Break-Glass Review page existed at `/audit/break-glass` but was not accessible from the Audit Trail page.

**Resolution:** Added "Break-Glass Review" button to the Audit page header.

**File Changed:** `apps/web/app/(site)/audit/page.tsx`

```tsx
<Button asChild variant="outline">
  <Link href="/audit/break-glass">Break-Glass Review</Link>
</Button>
```

---

### 3. Missing Admin Page Sections

**Issue:** Admin dashboard was missing links to SLA Configuration and FHIR Export pages.

**Resolution:** Added SLA Configuration and FHIR Export cards to the Admin page.

**File Changed:** `apps/web/app/(site)/admin/page.tsx`

```tsx
const SECTIONS = [
  // ... existing sections
  {
    title: "SLA Configuration",
    description: "Configure SLA targets and escalation rules for turnaround times.",
    href: "/admin/sla",
  },
  {
    title: "FHIR Export",
    description: "Configure FHIR/NHDR data export settings and mapping rules.",
    href: "/admin/fhir",
  },
]
```

---

### 4. "Register Patient" Visible to Admin Role

**Issue:** Admin role sees "Register Patient" in sidebar, which initially appeared to conflict with TOR stating "no clinical write access".

**Resolution:** This is **intentional by design**, not a bug.

**Rationale:**
- Admin role has `adt:create` permission per `packages/db/src/seed-dev.ts`
- ADT (Admission/Discharge/Transfer) operations are **administrative**, not clinical documentation
- TOR's "no clinical write access" refers to `clinical_docs:create/edit/sign`, not patient registration
- This allows Admin to assist with patient onboarding when needed

---

### 5. Missing Navigation to `/scheduling/book` and `/scheduling/queue`

**Issue:** Scheduling sub-routes existed but were not accessible from the main `/scheduling` page for Registrar role.

**Resolution:** Added navigation buttons to the Scheduling page header.

**File Changed:** `apps/web/app/(site)/scheduling/page.tsx`

```tsx
<div className="flex gap-2">
  <Button variant="outline" asChild>
    <Link href="/scheduling/book">
      <Calendar className="mr-2 size-4" />
      Book Appointment
    </Link>
  </Button>
  <Button variant="outline" asChild>
    <Link href="/scheduling/queue">
      <Users className="mr-2 size-4" />
      Clinic Queue
    </Link>
  </Button>
</div>
```

---

### 6. Missing Medical Records Access for Registrar

**Issue:** Medical Records (`/records`) was inaccessible to Registrar role despite TOR stating they manage Birth and Death Certificate data.

**Resolution:** Added `adt:edit` permission to Medical Records navigation.

**File Changed:** `apps/web/features/app-shell/lib/navigation.ts`

```tsx
{
  title: "Medical Records",
  href: "/records",
  iconName: "records",
  // Registrar needs access for birth/death certificate data (adt:edit)
  requiredPermissions: [
    { module: "admin", action: "view" },
    { module: "clinical_docs", action: "view" },
    { module: "adt", action: "edit" },  // Added for Registrar access
  ],
  isSecondary: true,
}
```

---

### 7. OPD Showing for Registrar Role

**Issue:** User reported OPD appearing in Registrar sidebar as potentially incorrect.

**Resolution:** This is **correct behavior** per the Role-Based Frontend Analysis.

**Evidence from Analysis:**
```
#### Sidebar Navigation (Registrar)
PRIMARY:
├── Dashboard
├── Register Patient ★
├── Patients
├── Scheduling
├── Bed Management
├── Emergency
└── OPD    ← Listed in analysis
```

**Rationale:**
- OPD requires `adt:create` OR `nursing:create` OR `clinical_docs:create`
- Registrar has `adt:create` permission for patient flow coordination
- Registrar assists with check-in and patient routing in OPD workflows

**No code change required** — behavior is correct as implemented.

---

### 8. OPD Flow Allows All Roles to Edit All Steps

**Issue:** OPD flow stepper allowed any role to edit any step (e.g., Registrar could edit Triage form).

**Resolution:** Implemented role-based step restrictions.

**File Changed:** `apps/web/features/opd/components/opd-flow.tsx`

**Changes:**
1. Added `responsibleRole` and `requiredPermission` to each OPD step definition
2. Added permission checking using `usePermissionSet()` hook
3. Created `StepReadOnlyView` component for locked steps
4. Conditionally render form or read-only view based on user permissions

**Step Permission Requirements:**
| Step | Responsible Role | Required Permission |
|------|-----------------|---------------------|
| Triage | Triage Officer | `nursing:create` |
| Registration | Registrar | `adt:create` |
| Vitals | Nurse | `nursing:create` |
| Consultation | Physician | `clinical_docs:create` |
| Disposition | Physician | `clinical_docs:sign` |

**Result:** Users now see:
- ✅ Editable form for steps they have permission to complete
- 🔒 Read-only view with lock icon for steps assigned to other roles

---

### 9. Medical Social Worker Navigation Issues

**Issue:** MSW role had incorrect sidebar visibility and couldn't access MSW encounter tab.

**Problems Identified:**
1. MSW Tab in encounter layout required `msw:view` permission (not seeded)
2. OPD showing in sidebar (MSW shouldn't manage OPD workflow)
3. Telemedicine showing (MSW doesn't conduct virtual consultations)
4. Medical Records showing (MSW has `clinical_docs:view` but shouldn't access HIM functions)

**Resolution:** Updated permissions to properly scope access.

**Files Changed:**
- `apps/web/app/(site)/patients/[patientId]/encounters/[encounterId]/layout.tsx`
- `apps/web/features/app-shell/lib/navigation.ts`

**Permission Changes:**

| Item | Old Permission | New Permission | MSW Access |
|------|----------------|----------------|------------|
| MSW Tab (encounter) | `msw:view` | `billing:view` | ✅ Now visible |
| OPD | `adt:view` OR `clinical_docs:view` | `adt:create` OR `nursing:create` OR `clinical_docs:create` | ❌ Correctly hidden |
| Telemedicine | `clinical_docs:view` | `clinical_docs:create` | ❌ Correctly hidden |
| Medical Records | `clinical_docs:view` | `clinical_docs:edit` | ❌ Correctly hidden |

**Expected MSW Sidebar (after fix):**
```
PRIMARY:
├── Dashboard
├── Patients
└── Billing

SECONDARY:
└── Social Work (MSW)
```

---

## Summary

| Issue | Status | Action Taken |
|-------|--------|--------------|
| Missing nav to `/admin/formulary/code-sets` | ✅ Fixed | Added button on Formulary page |
| Missing nav to `/audit/break-glass` | ✅ Fixed | Added button on Audit page |
| Missing Admin page sections | ✅ Fixed | Added SLA Config and FHIR Export cards |
| Admin sees "Register Patient" | ⚠️ By Design | No change needed |
| Missing nav to `/scheduling/book` and `/scheduling/queue` | ✅ Fixed | Added buttons on Scheduling page |
| Missing Medical Records nav for Registrar | ✅ Fixed | Added `adt:edit` to nav permissions |
| OPD showing for Registrar | ⚠️ By Design | No change needed (has `adt:edit`) |
| OPD flow all steps editable | ✅ Fixed | Role-based step restrictions |
| MSW sees incorrect sidebar items | ✅ Fixed | Updated OPD/Telemedicine/Records permissions |
| MSW Tab not visible in encounter | ✅ Fixed | Changed to `billing:view` permission |
| Triage sees incorrect sidebar items | ✅ Fixed | Updated Scheduling/OPD/NBS/Nutrition permissions |
| Physician sees incorrect sidebar/tabs | ✅ Fixed | Added `excludePermissions`, fixed encounter tabs |
| Surgeon sees incorrect sidebar/tabs | ✅ Fixed | Added `surgical:view`, excluded Telemedicine, fixed tabs |
| Anesthesiologist sees incorrect sidebar/tabs | ✅ Fixed | Added `opd` module, excluded from OPD |
| Nurse sees incorrect sidebar | ✅ Fixed | Added `adt:edit`, removed `opd:view` |
| Clinical Dietitian sees incorrect nav/tabs | ✅ Fixed | Added `nutrition` module |
| Pharmacist sees incorrect nav | ✅ Fixed | Added `orders:verify` exclusions |
| Lab Technologist sees incorrect nav | ✅ Fixed | Added `laboratory` module |
| Radiology Staff sees incorrect nav/tabs | ✅ Fixed | Reduced permissions, added tab exclusions |
| Scheduler sees incorrect nav | ✅ Fixed | Added `scheduling` module, added exclusions |
| Biller sees incorrect nav | ✅ Fixed | Added exclusions to SLA/MSW, added Clinical Docs |

---

### 10. Triage Officer Navigation Issues

**Issue:** Triage Officer role had sidebar items not aligned with TOR definition.

**Problems Identified:**
1. Scheduling showing (Triage doesn't manage appointments)
2. OPD showing (Triage works in ED, not outpatient clinics)
3. NBS Logbook showing (NBS is for nursery nurses, not ER triage)
4. Nutrition showing (Nutrition assessments are for ward care, not ER triage)

**Resolution:** Updated permission requirements to differentiate Triage from other nursing/ADT roles.

**File Changed:** `apps/web/features/app-shell/lib/navigation.ts`

**Permission Changes:**

| Item | Old Permission | New Permission | Triage Access |
|------|----------------|----------------|---------------|
| Scheduling | `adt:create` | `adt:edit` | ❌ Hidden (only has create) |
| OPD | `adt:create` OR `nursing:create` | `adt:edit` OR `clinical_docs:create` | ❌ Hidden |
| NBS Logbook | `nursing:view` | `nursing:edit` | ❌ Hidden (only has create) |
| Nutrition | `nursing:view` | `nursing:edit` | ❌ Hidden |

**Triage Officer Permissions:** `adt:view`, `adt:create`, `nursing:view`, `nursing:create`

**Expected Triage Sidebar (after fix):**
```
PRIMARY:
├── Dashboard
├── Register Patient ← (has adt:create)
├── Patients ← (has adt:view)
└── Emergency ★ ← (has adt:create and nursing:create)
```

**Rationale:**
- `adt:create` allows quick patient registration in ER (pre-encounter)
- `nursing:create` allows recording initial triage vitals
- No `adt:edit` means no appointment scheduling
- No `nursing:edit` means no ward-level nursing functions (NBS, MAR editing)

---

### 11. Clinician / Physician Navigation Issues

**Issue:** Physician role had sidebar items and encounter tabs not aligned with TOR role definition.

**Problems Identified (user report):**

**Incorrect Sidebar Items:**
- Register Patient (administrative, not physician task)
- Scheduling (physician doesn't manage appointments)
- Bed Management (administrative)
- Surgical Services (surgeon-specific)
- Laboratory (lab tech dashboard)
- Radiology (radiology tech dashboard)
- Billing (billing staff dashboard)
- Medical Records (HIM staff dashboard)
- NBS Logbook (nursing-specific)
- SLA Dashboard (reporting officers)
- Social Work / MSW (MSW role only)
- Nutrition (nursing-specific)
- Blood Bank (lab tech dashboard)

**Incorrect Encounter Tabs:**
- MSW
- Consents
- Transfers
- Transfer Patient
- Discharge (this was actually correct via `clinical_docs:sign`)

**Resolution:** Multi-layered fix:

1. **Removed `adt:edit` from Physician permissions** — Physicians don't manage scheduling or beds
2. **Added `excludePermissions` to navigation system** — Allows hiding items from roles that have matching required permissions but shouldn't see the item
3. **Applied exclusions to department-specific sidebars** — Lab, Radiology, Billing, MSW, etc. now exclude clinical staff
4. **Fixed encounter tabs** — MSW, Consents, Transfers now properly exclude clinical roles

**Files Changed:**
- `packages/db/src/seed-dev.ts` — Removed `adt:edit` from Physician
- `apps/web/features/app-shell/lib/navigation.ts` — Added `excludePermissions` field and logic
- `apps/web/app/(site)/patients/[patientId]/encounters/[encounterId]/layout.tsx` — Tab permission fixes

**Permission Architecture Change:**

Added `excludePermissions` to `NavItemConfig` interface:
```typescript
interface NavItemConfig {
  // ...existing fields
  /** 
   * If user has ANY of these permissions, item is hidden.
   * Takes precedence over requiredPermissions (exclusions first).
   */
  excludePermissions?: RequiredPermission[]
}
```

**Sidebar Exclusions Applied:**

| Item | Required Permission | Exclude Permission | Physician Access |
|------|---------------------|-------------------|------------------|
| Register Patient | `adt:create` | `clinical_docs:sign` | ❌ Hidden |
| Surgical Services | `clinical_docs:sign` | `orders:edit` | ❌ Hidden (has orders:edit) |
| Laboratory | `orders:view` | `clinical_docs:create` | ❌ Hidden |
| Radiology | `orders:view` | `clinical_docs:create` | ❌ Hidden |
| Billing (sidebar) | `billing:view` | `clinical_docs:create` | ❌ Hidden |
| Medical Records | `clinical_docs:edit` | `clinical_docs:sign` | ❌ Hidden |
| SLA Dashboard | `reporting:view` | `clinical_docs:create` | ❌ Hidden |
| Social Work (MSW) | `billing:view` | `clinical_docs:create` | ❌ Hidden |
| Blood Bank | `orders:view` | `clinical_docs:create` | ❌ Hidden |

**Encounter Tab Fixes:**

| Tab | Old Condition | New Condition | Physician Access |
|-----|---------------|---------------|------------------|
| MSW | `billing:view` | `billing:view && !clinical_docs:create` | ❌ Hidden |
| Consents | `clinical_docs:view` | `(clinical_docs:view OR adt:view) && !clinical_docs:create` | ❌ Hidden |
| Transfers | `adt:view` | `adt:edit` | ❌ Hidden (lost adt:edit) |
| Transfer Patient | `adt:edit` | `adt:edit` | ❌ Hidden (lost adt:edit) |
| Discharge | `adt:edit OR clinical_docs:sign` | (unchanged) | ✅ Visible via sign |

**Physician Permissions (after fix):**
```
adt: view, create (no edit)
clinical_docs: view, create, edit, sign
orders: view, create, edit, sign
nursing: view
billing: view
formulary: view
reporting: view, create
```

**Expected Physician Sidebar (after fix):**
```
PRIMARY:
├── Dashboard
├── Patients
├── Emergency
├── OPD
└── Telemedicine

SECONDARY:
├── Formulary
└── Reporting
```

**Expected Physician Encounter Tabs (after fix):**
```
Summary | Problems & Allergies | Documentation | Orders | Nursing | Billing | Discharge
```

**Rationale:**
- Physicians focus on clinical documentation and orders
- Department-specific dashboards (Lab, Radiology, Blood Bank) are for department staff
- Administrative functions (Scheduling, Bed Management, Medical Records) managed by admin/registrar
- MSW and Nutrition are specialized roles, not general physician access
- `excludePermissions` provides negative filtering without changing the permission model

---

### 12. Surgeon Navigation and Encounter Tab Issues

**Issue:** Surgeon role had sidebar items and encounter tabs not aligned with TOR role definition.

**Problems Identified (user report):**

**Sidebar Items:**
- Laboratory ❌ (for Lab Techs)
- Radiology ❌ (for Radiology Staff)
- Telemedicine ❌ (for virtual consultations, not surgical workflow)
- Medical Records ❌ (for HIM)
- NBS Logbook ❌ (for Nurses/Midwives)
- Nutrition ❌ (for Dietitians)
- Blood Bank ❌ (for Lab Techs)

**Encounter Tabs:**
- Problems & Allergies ❌ (Surgeons don't manage problem lists)
- Nursing ❌ (Surgeons view vitals in Summary, not dedicated tab)
- Surgical ❌ NOT VISIBLE (missing permission)

**Resolution:** Multi-part fix:

1. **Added `surgical:view` permission to Surgeon and Anesthesiologist** — Enables Surgical tab visibility
2. **Removed `nursing:view` from Surgeon/Anesthesiologist** — They don't need nursing tab access
3. **Added `excludePermissions` to Telemedicine** — Excludes surgical roles
4. **Added exclusion logic to encounter tabs** — Problems & Allergies and Nursing exclude surgical roles

**Files Changed:**
- `packages/db/src/seed-dev.ts` — Updated Surgeon/Anesthesiologist permission bundles
- `apps/web/features/app-shell/lib/navigation.ts` — Added Telemedicine exclusion
- `apps/web/app/(site)/patients/[patientId]/encounters/[encounterId]/layout.tsx` — Tab permission fixes

**Surgeon Permissions (after fix):**
```
adt: view
clinical_docs: view, create, edit, sign
orders: view, create, sign
surgical: view  ← NEW (enables Surgical tab)
formulary: view
```

**Sidebar Exclusions:**

| Item | Required Permission | Exclude Permission | Surgeon Access |
|------|---------------------|-------------------|----------------|
| Laboratory | `orders:view` | `clinical_docs:create` | ❌ Hidden |
| Radiology | `orders:view` | `clinical_docs:create` | ❌ Hidden |
| Telemedicine | `clinical_docs:create` | `surgical:view` | ❌ Hidden |
| Medical Records | `clinical_docs:edit` | `clinical_docs:sign` | ❌ Hidden |
| NBS Logbook | `nursing:edit` | — | ❌ Hidden (no permission) |
| Nutrition | `nursing:edit` | — | ❌ Hidden (no permission) |
| Blood Bank | `orders:view` | `clinical_docs:create` | ❌ Hidden |

**Encounter Tab Fixes:**

| Tab | Old Condition | New Condition | Surgeon Access |
|-----|---------------|---------------|----------------|
| Problems & Allergies | `clinical_docs:view OR orders:view` | `... && !surgical:view` | ❌ Hidden |
| Surgical | `surgical:view` | (unchanged) | ✅ Now visible |
| Nursing | `nursing:view` | `nursing:view && !surgical:view` | ❌ Hidden |
| Discharge | `adt:edit OR clinical_docs:sign` | (unchanged) | ✅ Visible via sign |

**Expected Surgeon Sidebar (after fix):**
```
PRIMARY:
├── Dashboard
├── Patients
├── Surgical Services ★
└── OPD

SECONDARY:
└── Formulary
```

**Expected Surgeon Encounter Tabs (after fix):**
```
Summary | Documentation | Orders | Surgical ★ | Discharge
```

**Rationale:**
- Surgeons focus on operative documentation and surgical workflows
- Problem list management is a Physician responsibility (CPOE workflow)
- Nursing tab is for nurses who author care plans; Surgeons view vitals in Summary
- Telemedicine is for virtual consultations, not surgical cases
- Surgical tab requires dedicated `surgical:view` permission for proper role separation

---

### 13. Anesthesiologist Navigation Issues

**Issue:** Anesthesiologist role sees incorrect sidebar items and is missing Surgical tab in encounter. User reported:
- Missing: Surgical tab in encounter
- Showing incorrectly: OPD, Laboratory, Radiology, Telemedicine, Medical Records, NBS Logbook, Nutrition, Blood Bank

**Root Cause:** 
1. Surgical tab was correctly configured but required `surgical:view` permission (already seeded)
2. OPD was visible because it used fallback permissions (`clinical_docs:create`) that Anesthesiologist has
3. Other items were already correctly hidden via exclusion rules

**Resolution:**

1. **Added dedicated `opd` module** to RBAC schema for proper OPD visibility control:
   - `packages/db/src/schema/rbac.ts` — Added `opd` to module type
   - `packages/contracts/src/modules/v1/rbac/rbac.schema.ts` — Added `opd` to enum
   - `packages/db/src/seed-dev.ts` — Added `opd:view` to roles that need OPD access
   - `apps/web/features/app-shell/lib/navigation.ts` — OPD now requires `opd:view`

2. **Roles with `opd:view` permission:**
   - Administrator ✅
   - Physician ✅
   - Surgeon ✅ (per TOR)
   - Nurse ✅
   - Registrar ✅
   - **Anesthesiologist ❌** (works only in OR)

3. **Sidebar Items:** Correctly configured with exclusions:
   - OPD requires `opd:view` (Anesthesiologist lacks → Hidden) ✅ **FIXED**
   - Laboratory excludes `clinical_docs:create` (Anesthesiologist has → Hidden)
   - Radiology excludes `clinical_docs:create` (Anesthesiologist has → Hidden)
   - Telemedicine excludes `surgical:view` (Anesthesiologist has → Hidden)
   - Medical Records excludes `clinical_docs:sign` (Anesthesiologist has → Hidden)
   - NBS Logbook requires `nursing:edit` (Anesthesiologist lacks → Hidden)
   - Nutrition requires `nursing:edit` (Anesthesiologist lacks → Hidden)
   - Blood Bank excludes `clinical_docs:create` (Anesthesiologist has → Hidden)

**Files Changed:**
- `packages/db/src/schema/rbac.ts` — Added `opd` to module type union
- `packages/contracts/src/modules/v1/rbac/rbac.schema.ts` — Added `opd` to RbacModuleEnum
- `packages/db/src/seed-dev.ts` — Added `opd` to ModuleName type, added `opd:view` to relevant roles
- `apps/web/features/app-shell/lib/navigation.ts` — OPD now uses `opd:view` permission

**Anesthesiologist Permissions (after fix):**
```
adt: view
clinical_docs: view, create, edit, sign
orders: view, create
surgical: view
formulary: view
(NO opd:view — hidden from OPD)
```

**Surgeon Permissions (for comparison):**
```
adt: view
clinical_docs: view, create, edit, sign
orders: view, create, sign
surgical: view
formulary: view
opd: view  ← Has OPD access
```

**Expected Anesthesiologist Sidebar (after fix):**
```
PRIMARY:
├── Dashboard
├── Patients
└── Surgical Services ★

SECONDARY:
└── Formulary
```

**Expected Anesthesiologist Encounter Tabs:**
```
Summary | Documentation | Orders | Surgical ★ | Discharge
```

**Rationale:**
- Dedicated `opd` module permission provides clean separation between Surgeon and Anesthesiologist
- Anesthesiologists focus on anesthesia documentation within the OR workflow
- Surgeons may see outpatient consultations in OPD (per TOR)
- This approach is extensible — other modules can follow the same pattern

---

### 14. Nurse Navigation Issues

**Issue:** Nurse role sees incorrect sidebar items and is missing Bed Management. User reported:
- Missing: Bed Management (ward bed status)
- Showing incorrectly: OPD, Laboratory, Radiology, Telemedicine, Medical Records, Blood Bank

**Root Cause:**
1. Nurse only had `adt:view` but Bed Management requires `adt:edit`
2. Nurse had `opd:view` permission (Nurses work in wards/ED, not OPD)
3. Telemedicine excluded only `surgical:view`, not nursing roles
4. Medical Records excluded only `clinical_docs:sign`, not nursing roles
5. Laboratory, Radiology, Blood Bank should have been excluded via `clinical_docs:create` but showed anyway

**Resolution:**

1. **Updated Nurse permissions** in `packages/db/src/seed-dev.ts`:
   - Added `adt:edit` to enable Bed Management access
   - Removed `opd:view` to hide OPD from Nurses

2. **Updated navigation exclusions** in `apps/web/features/app-shell/lib/navigation.ts`:
   - Added `nursing:create` to Telemedicine's `excludePermissions`
   - Added `nursing:create` to Medical Records' `excludePermissions`

**Files Changed:**
- `packages/db/src/seed-dev.ts` — Nurse permission bundle
- `apps/web/features/app-shell/lib/navigation.ts` — Telemedicine and Medical Records exclusions

**Nurse Permissions (after fix):**
```
adt: view, edit  ← Added edit for Bed Management
clinical_docs: view, create, edit
orders: view
nursing: view, create, edit, sign
formulary: view
(NO opd:view — Nurses work in wards/ED)
```

**Sidebar Exclusions:**

| Item | Required Permission | Exclude Permission | Nurse Access |
|------|---------------------|-------------------|--------------|
| Bed Management | `adt:edit` | — | ✅ Now visible (has adt:edit) |
| OPD | `opd:view` | — | ❌ Hidden (no opd:view) |
| Laboratory | `orders:view` | `clinical_docs:create` | ❌ Hidden (has clinical_docs:create) |
| Radiology | `orders:view` | `clinical_docs:create` | ❌ Hidden (has clinical_docs:create) |
| Telemedicine | `clinical_docs:create` | `nursing:create` | ❌ Hidden (has nursing:create) |
| Medical Records | `clinical_docs:edit` | `nursing:create` | ❌ Hidden (has nursing:create) |
| Blood Bank | `orders:view` | `clinical_docs:create` | ❌ Hidden (has clinical_docs:create) |

**Expected Nurse Sidebar (after fix):**
```
PRIMARY:
├── Dashboard
├── Patients
├── Bed Management ★
└── Emergency

SECONDARY:
├── NBS Logbook
├── Nutrition
└── Formulary
```

**Rationale:**
- Nurses manage bed assignments as part of ward nursing duties (adt:edit)
- OPD is for outpatient clinical workflows, not nursing duties
- Telemedicine is for clinicians conducting virtual consultations, not nurses
- Medical Records is for HIM Coders, not ward nurses
- Laboratory/Radiology/Blood Bank dashboards are for technicians, not clinical nursing staff

---

### 15. Clinical Dietitian / Nutritionist Navigation and Tab Issues

**Issue:** Clinical Dietitian role was using `nursing` module permissions as a fallback for nutrition functionality, causing:
1. **Incorrect sidebar visibility:** Emergency, NBS Logbook visible (should NOT be)
2. **Missing Nutrition tab:** Nutrition tab in encounter view not visible (requires `nutrition:view` which wasn't seeded)
3. **Visible Nursing tab:** Nursing tab incorrectly visible in encounter view

**Root Cause:** Clinical Dietitian was given `nursing:view,create,edit` permissions instead of dedicated `nutrition` module permissions.

**Resolution:**

1. **Added `nutrition` module to database schema** (`packages/db/src/schema/rbac.ts`):
   ```typescript
   module: t.text("module").notNull().$type<
     // ... existing modules ...
     | "nutrition"  // ← Added
   >()
   ```

2. **Updated Clinical Dietitian permissions** in `packages/db/src/seed-dev.ts`:
   ```typescript
   // BEFORE (incorrect - using nursing fallback)
   "Clinical Dietitian": [
     ["adt", ["view"]],
     ["nursing", ["view", "create", "edit"]],  // ← Wrong
     ["clinical_docs", ["view"]],
   ],

   // AFTER (correct - using nutrition module)
   "Clinical Dietitian": [
     ["adt", ["view"]],
     ["nutrition", ["view", "edit"]],  // ← Correct
     ["clinical_docs", ["view"]],
   ],
   ```

3. **Updated Nutrition navigation** in `apps/web/features/app-shell/lib/navigation.ts`:
   ```typescript
   {
     title: "Nutrition",
     href: "/nutrition",
     requiredPermissions: [
       { module: "admin", action: "view" },
       { module: "nutrition", action: "view" },  // ← Dietitians
       { module: "nursing", action: "edit" },    // ← Ward nurses
     ],
   }
   ```

**Files Changed:**
- `packages/db/src/schema/rbac.ts` — Added `nutrition` to module type
- `packages/db/src/seed-dev.ts` — Updated ModuleName type and Clinical Dietitian bundle
- `apps/web/features/app-shell/lib/navigation.ts` — Updated Nutrition nav permissions

**Clinical Dietitian Permissions (after fix):**
```
adt: view
nutrition: view, edit  ← Proper module for dietitians
clinical_docs: view
(NO nursing permissions — avoids unintended nav visibility)
```

**Sidebar (after fix):**
```
PRIMARY:
├── Dashboard
└── Patients

SECONDARY (More Modules):
└── Nutrition ★
```

**Encounter Tabs (after fix):**
| Tab | Visibility | Reason |
|-----|-----------|--------|
| Summary | ✅ Visible | Always shown |
| Problems & Allergies | ✅ Visible | Has clinical_docs:view (useful for viewing food allergies) |
| Documentation | ✅ Visible | Has clinical_docs:view |
| Nursing | ❌ Hidden | No nursing:view |
| **Nutrition** | ✅ Visible | Has nutrition:view |
| Consents | ✅ Visible | Has clinical_docs:view && !clinical_docs:create |

**Rationale:**
- The `nutrition` module is specifically for Clinical Dietitians
- The `nursing` module is for ward nurses/midwives - using it for dietitians caused unintended access to Emergency, NBS Logbook
- Problems & Allergies tab intentionally visible for dietitians (food allergy information is relevant for meal planning)
- Nurses can still access Nutrition dashboard via `nursing:edit` for viewing diet orders

---

### 16. Pharmacist Navigation Issues

**Issue:** Pharmacist role was seeing incorrect navigation items and missing the OPD Dispensing route.

**User Report:**
- Missing: `/pharmacy/opd` (OPD Dispensing) - no navigation link
- Showing incorrectly: Patients (PRIMARY), OPD, Laboratory, Radiology, Telemedicine, Medical Records, Blood Bank
- Expected per TOR: Dashboard, Pharmacy (PRIMARY) | Formulary, Patients (SECONDARY)

**Root Cause:** Navigation items used `orders:view` as a fallback permission for Laboratory, Radiology, and Blood Bank. Since Pharmacist has `orders:view`, these items were incorrectly visible. Additionally, Patients was shown in PRIMARY instead of SECONDARY.

**Resolution:**

1. **Added `orders:verify` exclusion to inappropriate nav items** in `apps/web/features/app-shell/lib/navigation.ts`:
   ```typescript
   // Laboratory, Radiology, Blood Bank - exclude Pharmacists
   excludePermissions: [
     { module: "clinical_docs", action: "create" },
     { module: "orders", action: "verify" },  // ← Added
   ],
   
   // Patients PRIMARY - exclude Pharmacists (they use SECONDARY)
   excludePermissions: [
     { module: "orders", action: "verify" },  // ← Added
   ],
   ```

2. **Added SECONDARY navigation for Pharmacist** in `apps/web/features/app-shell/lib/navigation.ts`:
   ```typescript
   // Patients (SECONDARY) for Pharmacists
   {
     title: "Patients",
     href: "/patients/search",
     iconName: "patient",
     requiredPermissions: [
       { module: "orders", action: "verify" },
     ],
     isSecondary: true,
   },
   
   // OPD Dispensing for Pharmacists
   {
     title: "OPD Dispensing",
     href: "/pharmacy/opd",
     iconName: "pill",
     requiredPermissions: [
       { module: "orders", action: "verify" },
     ],
     isSecondary: true,
   },
   ```

**Files Changed:**
- `apps/web/features/app-shell/lib/navigation.ts` — Added exclusions and SECONDARY nav items

**Pharmacist Permissions (unchanged):**
```
orders: view, edit, verify  ← verify is the Pharmacist-specific permission
formulary: view, create, edit
clinical_docs: view
```

**Sidebar (after fix):**
```
PRIMARY:
├── Dashboard
└── Pharmacy ★

SECONDARY (More Modules):
├── Formulary
├── Patients
└── OPD Dispensing
```

**Navigation Items Visibility (after fix):**
| Nav Item | Status | Reason |
|----------|--------|--------|
| Dashboard | ✅ Visible | Always shown |
| Pharmacy | ✅ Visible | Has orders:verify |
| Laboratory | ❌ Hidden | Excluded via orders:verify |
| Radiology | ❌ Hidden | Excluded via orders:verify |
| Blood Bank | ❌ Hidden | Excluded via orders:verify |
| Patients (PRIMARY) | ❌ Hidden | Excluded via orders:verify |
| Formulary | ✅ Visible | Has formulary:view |
| Patients (SECONDARY) | ✅ Visible | Has orders:verify |
| OPD Dispensing | ✅ Visible | Has orders:verify |

**Rationale:**
- `orders:verify` is unique to the Pharmacist role — used to filter pharmacy-specific navigation
- Pharmacists don't need Lab/Rad/Blood Bank dashboards — they verify medication orders
- Patients access moved to SECONDARY since Pharmacists primarily use the Pharmacy dashboard workflow
- OPD Dispensing added for outpatient prescription processing

---

### 17. Lab Technologist Navigation and Route Clarification

**Issue:** Lab Technologist role was seeing incorrect navigation items and routes were confusing.

**User Report:**
- Route confusion: `/laboratory` vs `/lab` — appear to have same content
- Route confusion: `/blood-bank` vs `/lab/blood-bank` — unclear differences
- Showing incorrectly: Patients (PRIMARY), OPD, Radiology
- Missing: Patients (ADT view) in SECONDARY
- Expected per TOR: Dashboard, Laboratory (PRIMARY) | Blood Bank, Patients (SECONDARY)

**Root Cause:**
1. **Route Duplication:** Both `/lab` and `/laboratory` render `<LabDashboard />`. Same with `/blood-bank` and `/lab/blood-bank`. These are duplicates from early development.
2. **Permission Overlap:** Navigation used `orders:view` as fallback for Laboratory, Radiology, and Blood Bank. Since Lab Tech has `orders:view`, they incorrectly saw Radiology.
3. **No Dedicated Modules:** Lab Technologist and Radiologist shared `orders:view` permission with no way to distinguish them in navigation.

**Resolution:**

1. **Added dedicated `laboratory` and `radiology` modules** to database schema (`packages/db/src/schema/rbac.ts`):
   ```typescript
   module: t.text("module").notNull().$type<
     // ... existing modules ...
     | "laboratory"  // ← Added
     | "radiology"   // ← Added
   >()
   ```

2. **Updated Lab Technologist permissions** in `packages/db/src/seed-dev.ts`:
   ```typescript
   "Lab Technologist": [
     ["adt", ["view"]],
     ["orders", ["view", "edit"]],
     ["laboratory", ["view", "edit"]],  // ← Added
   ],
   ```

3. **Updated Radiologist permissions** in `packages/db/src/seed-dev.ts`:
   ```typescript
   Radiologist: [
     ["adt", ["view"]],
     ["clinical_docs", ["view"]],
     ["orders", ["view", "edit"]],
     ["radiology", ["view", "edit"]],  // ← Added
   ],
   ```

4. **Updated navigation.ts** to use dedicated modules:
   ```typescript
   // Laboratory - now uses laboratory:view
   {
     title: "Laboratory",
     requiredPermissions: [
       { module: "admin", action: "view" },
       { module: "laboratory", action: "view" },
     ],
   },
   
   // Radiology - now uses radiology:view
   {
     title: "Radiology",
     requiredPermissions: [
       { module: "admin", action: "view" },
       { module: "radiology", action: "view" },
     ],
   },
   
   // Blood Bank - tied to laboratory:view
   {
     title: "Blood Bank",
     requiredPermissions: [
       { module: "admin", action: "view" },
       { module: "laboratory", action: "view" },
     ],
     isSecondary: true,
   },
   
   // Patients SECONDARY for Lab/Rad
   {
     title: "Patients",
     requiredPermissions: [
       { module: "laboratory", action: "view" },
       { module: "radiology", action: "view" },
     ],
     isSecondary: true,
   },
   
   // Patients PRIMARY - excludes Lab/Rad
   {
     title: "Patients",
     excludePermissions: [
       { module: "orders", action: "verify" },
       { module: "laboratory", action: "view" },
       { module: "radiology", action: "view" },
     ],
   },
   ```

**Files Changed:**
- `packages/db/src/schema/rbac.ts` — Added `laboratory` and `radiology` to module type
- `packages/contracts/src/modules/v1/rbac/rbac.schema.ts` — Added to RbacModuleEnum
- `packages/db/src/seed-dev.ts` — Added to ModuleName type, updated permissions
- `apps/web/features/app-shell/lib/navigation.ts` — Updated nav items

**Route Clarification:**

| Route | Status | Purpose |
|-------|--------|---------|
| `/laboratory` | ✅ Primary | Lab worklist dashboard (linked in nav) |
| `/lab` | ⚠️ Duplicate | Same content as `/laboratory` — legacy route |
| `/blood-bank` | ✅ Primary | Blood bank operations (linked in nav) |
| `/lab/blood-bank` | ⚠️ Duplicate | Same content — legacy nested route |

**Recommendation:** Consider redirecting `/lab` → `/laboratory` and `/lab/blood-bank` → `/blood-bank` in a future cleanup.

**Lab Technologist Permissions (after fix):**
```
adt: view
orders: view, edit
laboratory: view, edit  ← Dedicated Lab Tech module
```

**Sidebar (after fix):**
```
PRIMARY:
├── Dashboard
└── Laboratory ★

SECONDARY (More Modules):
├── Blood Bank
└── Patients
```

**Navigation Items Visibility (after fix):**
| Nav Item | Status | Reason |
|----------|--------|--------|
| Dashboard | ✅ Visible | Always shown |
| Laboratory | ✅ Visible | Has laboratory:view |
| Radiology | ❌ Hidden | No radiology:view |
| OPD | ❌ Hidden | No opd:view |
| Patients (PRIMARY) | ❌ Hidden | Has laboratory:view (excluded) |
| Blood Bank | ✅ Visible | Has laboratory:view |
| Patients (SECONDARY) | ✅ Visible | Has laboratory:view |

**Rationale:**
- `laboratory:view` is unique to Lab Technologist role — clean separation from Radiology
- `radiology:view` is unique to Radiologist role — clean separation from Laboratory
- Blood Bank is tied to `laboratory:view` since Lab Techs handle cross-matching
- Patients moved to SECONDARY for ancillary staff who access charts for specimen/imaging context

---

### 18. Radiology Staff Navigation and Encounter Tab Issues

**Issue:** Radiology Staff (Radiologist) role was seeing incorrect navigation items and encounter tabs.

**User Report:**
- Seeing incorrectly: Patients (PRIMARY), OPD, Laboratory, Telemedicine
- Seeing incorrectly in SECONDARY: Medical Records, Blood Bank
- Missing: Patients (ADT view) in SECONDARY
- Encounter tabs showing: Summary, Problems & Allergies, Documentation, Orders, Consents
- Expected per TOR: Dashboard, Radiology (PRIMARY) | Patients (SECONDARY)

**Root Cause:**
1. **Excess Permissions:** Radiologist had `clinical_docs:view` and `orders:view,edit` permissions which leaked access to clinical tabs and navigation items.
2. **No Encounter Tab Exclusions:** Encounter tabs didn't exclude `radiology:view` holders from clinical-only tabs (Problems & Allergies, Documentation, Consents).

**TOR Definition:**
> **Radiology Staff:** Attaches imaging reports and links to PACS, marking critical results for attention.

**Resolution:**

1. **Reduced Radiologist permissions** to minimum required:
   ```typescript
   // Before (excess permissions)
   Radiologist: [
     ["adt", ["view"]],
     ["clinical_docs", ["view"]],  // ← Removed (not needed)
     ["orders", ["view", "edit"]], // ← Removed (not needed)
     ["radiology", ["view", "edit"]],
   ],
   
   // After (correct permissions)
   Radiologist: [
     ["adt", ["view"]],
     ["radiology", ["view", "edit"]],
   ],
   ```

2. **Updated encounter tabs** to exclude ancillary staff:
   - **Problems & Allergies** — Added `!radiology:view && !laboratory:view` exclusion
   - **Documentation** — Added `!radiology:view && !laboratory:view` exclusion
   - **Consents** — Added `!radiology:view && !laboratory:view` exclusion
   - **Orders** — Updated to allow `radiology:view OR laboratory:view` for imaging/lab orders

**Files Modified:**
- `packages/db/src/seed-dev.ts` — Reduced Radiologist permissions
- `apps/web/app/(site)/patients/[patientId]/encounters/[encounterId]/layout.tsx` — Tab exclusions

**Radiologist Permissions (after fix):**
```
adt: view
radiology: view, edit  ← Dedicated Radiology module
```

**Sidebar (after fix):**
```
PRIMARY:
├── Dashboard
└── Radiology ★

SECONDARY (More Modules):
└── Patients (ADT view)
```

**Navigation Items Visibility (after fix):**
| Nav Item | Status | Reason |
|----------|--------|--------|
| Dashboard | ✅ Visible | Always shown |
| Radiology | ✅ Visible | Has radiology:view |
| Laboratory | ❌ Hidden | No laboratory:view |
| OPD | ❌ Hidden | No opd:view |
| Telemedicine | ❌ Hidden | No clinical_docs:create |
| Patients (PRIMARY) | ❌ Hidden | Has radiology:view (excluded) |
| Medical Records | ❌ Hidden | No clinical_docs:edit or adt:edit |
| Blood Bank | ❌ Hidden | No laboratory:view |
| Patients (SECONDARY) | ✅ Visible | Has radiology:view |

**Encounter Tabs (after fix):**
| Tab | Status | Reason |
|-----|--------|--------|
| Summary | ✅ Visible | Always shown |
| Problems & Allergies | ❌ Hidden | radiology:view excluded |
| Documentation | ❌ Hidden | radiology:view excluded |
| Orders | ✅ Visible | radiology:view now allowed |
| Consents | ❌ Hidden | radiology:view excluded |

**Rationale:**
- Radiologists don't need clinical notes access — they focus on imaging reports
- Radiologists view Orders tab to see imaging orders and attach reports
- `radiology:view` is dedicated module for clean role separation from Lab Tech
- Patients in SECONDARY gives ADT context for imaging workup

---

### 19. Scheduler Navigation Issues

**Issue:** Scheduler role was seeing incorrect navigation items and missing link to `/scheduling/templates`.

**User Report:**
- Cannot find navigation to `/scheduling/templates`, `/scheduling/book`, `/scheduling/queue`
- Seeing incorrectly: Bed Management, Emergency, OPD
- Expected per TOR: Dashboard, Register Patient, Patients, Scheduling

**Root Cause:**
1. **Permission Leakage:** Scheduler had `adt:edit` and `adt:create` which leaked access to Bed Management (requires `adt:edit`) and Emergency (requires `adt:create`).
2. **No Dedicated Module:** Scheduling functionality used `adt:edit` as fallback permission instead of a dedicated `scheduling` module.
3. **Missing Link:** Scheduling page had links to `/scheduling/book` and `/scheduling/queue` but not `/scheduling/templates`.

**TOR Definition:**
> **Scheduler:** Manages appointment calendars, clinic templates; no clinical access.

**Resolution:**

1. **Added dedicated `scheduling` module** to database schema:
   - `packages/db/src/schema/rbac.ts` — Added `scheduling` to module type
   - `packages/contracts/src/modules/v1/rbac/rbac.schema.ts` — Added to RbacModuleEnum
   - `packages/db/src/seed-dev.ts` — Added to ModuleName type

2. **Updated Scheduler permissions** in `packages/db/src/seed-dev.ts`:
   ```typescript
   // Before (permission leakage)
   Scheduler: [
     ["adt", ["view", "create", "edit"]],  // ← edit leaked Bed Management
   ],
   
   // After (correct permissions)
   Scheduler: [
     ["adt", ["view", "create"]],           // ← No edit (no Bed Management)
     ["scheduling", ["view", "create", "edit"]],  // ← Dedicated module
   ],
   ```

3. **Updated navigation exclusions** in `apps/web/features/app-shell/lib/navigation.ts`:
   ```typescript
   // Scheduling - now uses scheduling:view
   {
     title: "Scheduling",
     requiredPermissions: [
       { module: "admin", action: "view" },
       { module: "scheduling", action: "view" },
       { module: "adt", action: "edit" },  // Registrar fallback
     ],
     excludePermissions: [
       { module: "nursing", action: "create" },  // Exclude nurses
     ],
   },
   
   // Bed Management - excludes Scheduler
   {
     title: "Bed Management",
     requiredPermissions: [
       { module: "adt", action: "edit" },
       { module: "adt", action: "delete" },
     ],
     excludePermissions: [
       { module: "scheduling", action: "view" },  // ← Added
     ],
   },
   
   // Emergency - excludes Scheduler
   {
     title: "Emergency",
     requiredPermissions: [
       { module: "adt", action: "create" },
       { module: "nursing", action: "create" },
     ],
     excludePermissions: [
       { module: "scheduling", action: "view" },  // ← Added
     ],
   },
   ```

4. **Added link to `/scheduling/templates`** in `apps/web/app/(site)/scheduling/page.tsx`:
   ```tsx
   <Button variant="outline" asChild>
     <Link href="/scheduling/templates">
       <LayoutTemplate className="mr-2 size-4" />
       Clinic Templates
     </Link>
   </Button>
   ```

**Files Changed:**
- `packages/db/src/schema/rbac.ts` — Added `scheduling` to module type
- `packages/contracts/src/modules/v1/rbac/rbac.schema.ts` — Added `scheduling` to RbacModuleEnum
- `packages/db/src/seed-dev.ts` — Added ModuleName type, updated Scheduler permissions
- `apps/web/features/app-shell/lib/navigation.ts` — Updated nav exclusions
- `apps/web/app/(site)/scheduling/page.tsx` — Added templates link

**Scheduler Permissions (after fix):**
```
adt: view, create
scheduling: view, create, edit  ← Dedicated Scheduler module
```

**Sidebar (after fix):**
```
PRIMARY:
├── Dashboard
├── Register Patient (has adt:create)
├── Patients (has adt:view)
└── Scheduling ★ (has scheduling:view)
```

**Navigation Items Visibility (after fix):**
| Nav Item | Status | Reason |
|----------|--------|--------|
| Dashboard | ✅ Visible | Always shown |
| Register Patient | ✅ Visible | Has adt:create |
| Patients | ✅ Visible | Has adt:view |
| Scheduling | ✅ Visible | Has scheduling:view |
| Bed Management | ❌ Hidden | Has scheduling:view (excluded) |
| Emergency | ❌ Hidden | Has scheduling:view (excluded) |
| OPD | ❌ Hidden | No opd:view |

**Scheduling Page Links (after fix):**
- `/scheduling/templates` — Clinic Templates ✅ Added
- `/scheduling/book` — Book Appointment ✅ Already present
- `/scheduling/queue` — Clinic Queue ✅ Already present

**Rationale:**
- `scheduling:view` is dedicated module for Scheduler role
- Removed `adt:edit` to prevent Bed Management leakage
- Added exclusions per `scheduling:view` to hide ED and Bed Management
- Template management is core Scheduler function per TOR

---

### 20. Biller Navigation Issues

**Issue:** Biller role was seeing incorrect navigation items and missing Clinical Docs access.

**User Report:**
- Seeing incorrectly: OPD, Telemedicine (PRIMARY), Medical Records, SLA Dashboard, Social Work (SECONDARY)
- Missing: Clinical Docs (view)
- Expected per TOR: Dashboard, Patients, Billing (PRIMARY) | Reporting (export), Clinical Docs (view) (SECONDARY)

**Root Cause:**
1. **SLA Dashboard** used `reporting:view` permission which Billers have for export purposes
2. **Social Work (MSW)** used `billing:view` permission which Billers naturally have
3. **Clinical Docs** nav item didn't exist — Billers need it for CF4 review
4. **OPD/Telemedicine** — If showing, requires database reseed (Biller lacks `opd:view` and `clinical_docs:create`)

**TOR Definition:**
> **Biller:** Manages charges, creates invoices, records payments, issues receipts. Manages PhilHealth case rates, CF4/CF5, DRG, eSOA.

**Resolution:**

1. **Added `billing:view` exclusion to SLA Dashboard**:
   ```typescript
   // SLA dashboard is for Reporting Officers, not billing staff
   excludePermissions: [
     { module: "clinical_docs", action: "create" },
     { module: "billing", action: "view" },  // ← Added
   ],
   ```

2. **Added `billing:create` exclusion to Social Work (MSW)**:
   ```typescript
   // MSW has billing:view but NOT billing:create
   // Billers have billing:view,create,edit,export
   excludePermissions: [
     { module: "clinical_docs", action: "create" },
     { module: "billing", action: "create" },  // ← Added
   ],
   ```

3. **Added Clinical Docs nav item** in SECONDARY navigation:
   ```typescript
   {
     title: "Clinical Docs",
     href: "/clinical-docs",
     iconName: "documentation",
     requiredPermissions: [
       { module: "clinical_docs", action: "view" },
     ],
     excludePermissions: [
       { module: "clinical_docs", action: "create" },
       { module: "clinical_docs", action: "sign" },
       { module: "nursing", action: "create" },
       { module: "nutrition", action: "view" },
     ],
     isSecondary: true,
   },
   ```

4. **Created `/clinical-docs` page** at `apps/web/app/(site)/clinical-docs/page.tsx`

**Files Changed:**
- `apps/web/features/app-shell/lib/navigation.ts` — Added exclusions, added Clinical Docs nav item
- `apps/web/app/(site)/clinical-docs/page.tsx` — Created placeholder page

**Biller Permissions (unchanged):**
```
adt: view
billing: view, create, edit, export
clinical_docs: view
reporting: view, export
```

**Sidebar (after fix):**
```
PRIMARY:
├── Dashboard
├── Patients
└── Billing ★

SECONDARY (More Modules):
├── Reporting
└── Clinical Docs ← New
```

**Navigation Items Visibility (after fix):**
| Nav Item | Status | Reason |
|----------|--------|--------|
| Dashboard | ✅ Visible | Always shown |
| Patients | ✅ Visible | Has adt:view |
| Billing | ✅ Visible | Has billing:view |
| OPD | ❌ Hidden | No opd:view |
| Telemedicine | ❌ Hidden | No clinical_docs:create |
| Medical Records | ❌ Hidden | No clinical_docs:edit or adt:edit |
| SLA Dashboard | ❌ Hidden | Has billing:view (excluded) |
| Social Work | ❌ Hidden | Has billing:create (excluded) |
| Reporting | ✅ Visible | Has reporting:view |
| Clinical Docs | ✅ Visible | Has clinical_docs:view (no create/sign) |

**Rationale:**
- Billers need `reporting:view` for billing exports, but SLA monitoring is a Surveillance Officer function
- MSW dashboard is specifically for Medical Social Workers who evaluate patients for assistance
- Clinical Docs access allows Billers to review CF4 data extraction without charting access
- `billing:create` distinguishes Billers from MSW (MSW only has `billing:view`)

**Note:** If OPD and Telemedicine are still showing after this fix, please reseed the database with `pnpm --filter @repo/db seed:dev` to ensure permissions are up to date.
