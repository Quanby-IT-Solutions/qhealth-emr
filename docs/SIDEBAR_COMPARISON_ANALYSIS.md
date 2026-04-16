# Sidebar Navigation Comparison Analysis

> **Generated:** April 14, 2026  
> **Purpose:** Verify sidebar navigation alignment with TOR requirements

This document compares each role's **actual** sidebar visibility (computed from `navigation.ts` + `seed-dev.ts` permissions) against **expected** visibility (from `ROLE_BASED_FRONTEND_ANALYSIS.md`).

---

## Legend

- ✅ = Correct (shows as expected)
- ❌ = Missing (should show but doesn't)
- ⚠️ = Extra (shows but shouldn't)
- 🔧 = Needs fix

---

## Role-by-Role Analysis

### 1. Administrator

**Permissions:** `adt:*`, `clinical_docs:*`, `orders:*`, `nursing:*`, `billing:*`, `formulary:*`, `reporting:*`, `audit:*`, `admin:*`, `opd:view`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Register Patient | ✓ | ✓ (admin:view bypass) | ✅ |
| Patients | ✓ | ✓ (admin:view bypass) | ✅ |
| Scheduling | ✓ | ✓ (admin:view) | ✅ |
| Bed Management | ✓ | ✓ (adt:edit) | ✅ |
| Emergency | ✓ | ✓ (adt:create) | ✅ |
| Surgical Services | ✓ | ✓ (admin:view) | ✅ |
| OPD | ✓ | ✓ (opd:view) | ✅ |
| Laboratory | ✓ | ✓ (admin:view) | ✅ |
| Radiology | ✓ | ✓ (admin:view) | ✅ |
| Pharmacy | ✓ | ✓ (orders:verify) | ✅ |
| Telemedicine | ✓ | ✓ (admin:view bypass) | ✅ |
| Billing | ✓ | ✓ (admin:view bypass) | ✅ |
| **SECONDARY** | | | |
| Medical Records | ✓ | ✓ (admin:view bypass) | ✅ |
| HIM Dashboard | ✓ | ✓ (admin:view bypass) | ✅ |
| NBS Logbook | ✓ | ✓ (admin:view) | ✅ |
| SLA Dashboard | ✓ | ✓ (admin:view bypass) | ✅ |
| FHIR Export | ✓ | ✓ (admin:view) | ✅ |
| SLA Configuration | ✓ | ✓ (admin:view) | ✅ |
| Social Work (MSW) | ✓ | ✓ (admin:view bypass) | ✅ |
| Nutrition | ✓ | ✓ (admin:view) | ✅ |
| Blood Bank | ✓ | ✓ (admin:view) | ✅ |
| Formulary | ✓ | ✓ (formulary:view) | ✅ |
| Reporting | ✓ | ✓ (reporting:view) | ✅ |
| Clinical Docs | ✓ | ✓ (admin:view bypass) | ✅ |
| Audit Trail | ✓ | ✓ (audit:view) | ✅ |
| Administration | ✓ | ✓ (admin:view) | ✅ |

**Status:** ✅ All correct. Admin now bypasses standard exclude rules unless an item explicitly excludes `admin:view` (used to keep the secondary Patients duplicate hidden).

---

### 2. Registrar

**Permissions:** `adt:view/create/edit`, `opd:view`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Register Patient | ✓ | ✓ (adt:create, no clinical_docs:sign) | ✅ |
| Patients | ✓ | ✓ (adt:view) | ✅ |
| Scheduling | ✓ | ✓ (adt:edit) | ✅ |
| Bed Management | ✓ | ✓ (adt:edit) | ✅ |
| Emergency | ✓ | ✓ (adt:create) | ✅ |
| OPD | ✓ | ✓ (opd:view) | ✅ |
| **SECONDARY** | | | |
| Medical Records | ✓ | ✓ (adt:edit, no excludes) | ✅ |

**Status:** ✅ All correct

---

### 3. Medical Social Worker (MSW)

**Permissions:** `adt:view`, `billing:view`, `clinical_docs:view`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Patients | ✓ | ✓ (adt:view) | ✅ |
| Billing | ✓ | ✓ (billing:view, no clinical_docs:create) | ✅ |
| **SECONDARY** | | | |
| Social Work (MSW) | ✓ | ✓ (billing:view, no excludes) | ✅ |

**Status:** ✅ All correct

---

### 4. Triage Officer

**Permissions:** `adt:view/create`, `nursing:view/create`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Register Patient | ✓ | ✓ (adt:create, no clinical_docs:sign) | ✅ |
| Patients | ✓ | ✓ (adt:view) | ✅ |
| Emergency | ✓ | ✓ (adt:create, nursing:create) | ✅ |

**Status:** ✅ All correct

---

### 5. Physician

**Permissions:** `adt:view/create`, `clinical_docs:view/create/edit/sign`, `orders:view/create/edit/sign`, `nursing:view`, `billing:view`, `formulary:view`, `reporting:view/create`, `opd:view`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Patients | ✓ | ✓ (adt:view, no reporting:edit) | ✅ |
| Emergency | ✓ | ✓ (adt:create) | ✅ |
| OPD | ✓ | ✓ (opd:view) | ✅ |
| Telemedicine | ✓ | ✓ (clinical_docs:sign, no surgical:view, no nursing:create) | ✅ |
| **SECONDARY** | | | |
| Formulary | ✓ | ✓ (formulary:view) | ✅ |
| Reporting | ✓ | ✓ (reporting:view) | ✅ |

**Status:** ✅ All correct (after recent fixes)

---

### 6. Surgeon

**Permissions:** `adt:view`, `clinical_docs:view/create/edit/sign`, `orders:view/create/sign`, `surgical:view`, `formulary:view`, `opd:view`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Patients | ✓ | ✓ (adt:view) | ✅ |
| Surgical Services | ✓ | ✓ (surgical:view) | ✅ |
| OPD | ✓ | ✓ (opd:view) | ✅ |
| **SECONDARY** | | | |
| Formulary | ✓ | ✓ (formulary:view) | ✅ |

**Excluded correctly:** Telemedicine (excluded by surgical:view)

**Status:** ✅ All correct

---

### 7. Anesthesiologist

**Permissions:** `adt:view`, `clinical_docs:view/create/edit/sign`, `orders:view/create`, `surgical:view`, `formulary:view`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Patients | ✓ | ✓ (adt:view) | ✅ |
| Surgical Services | ✓ | ✓ (surgical:view) | ✅ |
| **SECONDARY** | | | |
| Formulary | ✓ | ✓ (formulary:view) | ✅ |

**Excluded correctly:** OPD (no opd:view), Telemedicine (surgical:view)

**Status:** ✅ All correct

---

### 8. Nurse / Midwife

**Permissions:** `adt:view/edit`, `clinical_docs:view/create/edit`, `orders:view`, `nursing:view/create/edit/sign`, `formulary:view`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Patients | ✓ | ✓ (adt:view) | ✅ |
| Bed Management | ✓ | ✓ (adt:edit) | ✅ |
| Emergency | ✓ | ✓ (nursing:create) | ✅ |
| **SECONDARY** | | | |
| NBS Logbook | ✓ | ✓ (nursing:edit) | ✅ |
| Nutrition | ✓ | ✓ (nursing:edit) | ✅ |
| Formulary | ✓ | ✓ (formulary:view) | ✅ |

**Excluded correctly:** Scheduling (nursing:create), Telemedicine (nursing:create)

**Status:** ✅ All correct

---

### 9. Clinical Dietitian

**Permissions:** `adt:view`, `nutrition:view/edit`, `clinical_docs:view`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Patients | ✓ | ✓ (adt:view) | ✅ |
| **SECONDARY** | | | |
| Nutrition | ✓ | ✓ (nutrition:view) | ✅ |

**Status:** ✅ All correct

---

### 10. Pharmacist

**Permissions:** `orders:view/edit/verify`, `formulary:view/create/edit`, `clinical_docs:view`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Pharmacy | ✓ | ✓ (orders:verify) | ✅ |
| **SECONDARY** | | | |
| Patients (secondary) | ✓ | ✓ (orders:verify) | ✅ |
| OPD Dispensing | ✓ | ✓ (orders:verify) | ✅ |
| Formulary | ✓ | ✓ (formulary:view) | ✅ |

**Excluded correctly:** Patients (primary - orders:verify), Billing (no billing:view)

**Status:** ✅ All correct

---

### 11. Lab Technologist

**Permissions:** `adt:view`, `orders:view/edit`, `laboratory:view/edit`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Laboratory | ✓ | ✓ (laboratory:view) | ✅ |
| **SECONDARY** | | | |
| Patients (secondary) | ✓ | ✓ (laboratory:view) | ✅ |
| Blood Bank | ✓ | ✓ (laboratory:view) | ✅ |

**Excluded correctly:** Patients (primary - laboratory:view)

**Status:** ✅ All correct

---

### 12. Radiologist

**Permissions:** `adt:view`, `radiology:view/edit`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Radiology | ✓ | ✓ (radiology:view) | ✅ |
| **SECONDARY** | | | |
| Patients (secondary) | ✓ | ✓ (radiology:view) | ✅ |

**Excluded correctly:** Patients (primary - radiology:view)

**Status:** ✅ All correct

---

### 13. Scheduler

**Permissions:** `adt:view/create`, `scheduling:view/create/edit`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Register Patient | ✓ | ✓ (adt:create, no clinical_docs:sign) | ✅ |
| Patients | ✓ | ✓ (adt:view) | ✅ |
| Scheduling | ✓ | ✓ (scheduling:view) | ✅ |

**Excluded correctly:** Bed Management (scheduling:view), Emergency (scheduling:view)

**Status:** ✅ All correct

---

### 14. Billing Officer

**Permissions:** `adt:view`, `billing:view/create/edit/export`, `clinical_docs:view`, `reporting:view/export`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Patients | ✓ | ✓ (adt:view) | ✅ |
| Billing | ✓ | ✓ (billing:view, no clinical_docs:create) | ✅ |
| **SECONDARY** | | | |
| Reporting | ✓ | ✓ (reporting:view) | ✅ |
| Clinical Docs | ✓ | ✓ (clinical_docs:view, no excludes hit) | ✅ |

**Status:** ✅ All correct

---

### 15. HIM Coder

**Permissions:** `adt:view`, `clinical_docs:view/create/edit`, `reporting:view`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Patients | ✓ | ✓ (adt:view) | ✅ |
| **SECONDARY** | | | |
| Medical Records | ✓ | ✓ (clinical_docs:edit, no sign/nursing:create) | ✅ |
| HIM Dashboard | ✓ | ✓ (clinical_docs:edit, no sign/nursing:create) | ✅ |
| Reporting | ✓ | ✓ (reporting:view) | ✅ |
| Clinical Docs | ✓ | ✓ (clinical_docs:edit, no sign or nursing) | ✅ |

**Status:** ✅ All correct

---

### 16. PIDSR Officer

**Permissions:** `clinical_docs:view`, `reporting:view/create/edit/verify/export`, `audit:view/export`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| **SECONDARY** | | | |
| SLA Dashboard | ✓ | ✓ (reporting:view, no clinical_docs:create/billing:view) | ✅ |
| Reporting | ✓ | ✓ (reporting:view) | ✅ |
| Audit Trail | ✓ | ✓ (audit:view) | ✅ |
| Clinical Docs | ✓ | ✓ (clinical_docs:view, no excludes hit) | ✅ |

**Excluded correctly:** Patients (primary - reporting:edit)

**Status:** ✅ All correct

---

### 17. Auditor / Privacy Officer

**Permissions:** `adt:view`, `audit:view/export`, `reporting:view`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Patients | ✓ | ✓ (adt:view) | ✅ |
| **SECONDARY** | | | |
| SLA Dashboard | ✓ | ✓ (reporting:view, no clinical_docs:create/billing:view) | ✅ |
| Reporting | ✓ | ✓ (reporting:view) | ✅ |
| Audit Trail | ✓ | ✓ (audit:view) | ✅ |

**Status:** ✅ All correct

---

### 18. Blood Bank Technician

**Permissions:** `adt:view`, `orders:view/edit`, `laboratory:view`

| Nav Item | Expected | Actual | Status |
|----------|----------|--------|--------|
| **PRIMARY** | | | |
| Dashboard | ✓ | ✓ | ✅ |
| Laboratory | ✓ | ✓ (laboratory:view) | ✅ |
| **SECONDARY** | | | |
| Patients (secondary) | ✓ | ✓ (laboratory:view) | ✅ |
| Blood Bank | ✓ | ✓ (laboratory:view) | ✅ |

**Excluded correctly:** Patients (primary - laboratory:view)

**Status:** ✅ All correct

---

## Summary

| Role | Status | Issues |
|------|--------|--------|
| Administrator | ✅ | None |
| Registrar | ✅ | None |
| Medical Social Worker | ✅ | None |
| Triage Officer | ✅ | None |
| Physician | ✅ | Fixed - now shows Patients & Telemedicine |
| Surgeon | ✅ | None |
| Anesthesiologist | ✅ | None |
| Nurse | ✅ | None |
| Clinical Dietitian | ✅ | None |
| Pharmacist | ✅ | None |
| Lab Technologist | ✅ | None |
| Radiologist | ✅ | None |
| Scheduler | ✅ | None |
| Billing Officer | ✅ | None |
| HIM Coder | ✅ | None |
| PIDSR Officer | ✅ | None |
| Auditor | ✅ | None |
| Blood Bank Technician | ✅ | None |

---

## Recommended Fixes

No remaining sidebar fixes are required for TOR alignment based on the current `navigation.ts` and `seed-dev.ts` configuration.

### 1. Administrator Role Fix (Priority: High)

Implemented. The filter now gives admins a bypass for standard exclusions while still allowing explicit `admin:view` exclusions for deliberate de-duplication.

**Solution:** Add `admin:view` bypass to the filter logic:

```typescript
export function filterNavItems(
	items: NavItemConfig[],
	permissions: Permission[]
): NavItemConfig[] {
	const permSet = new Set(permissions.map(p => `${p.module}:${p.action}`))
	const isAdmin = permSet.has("admin:view")

	return items.filter(item => {
		// Admin bypass - admins see everything
		if (isAdmin) return true

		// Check excludes first (takes precedence over includes)
		if (item.excludePermissions?.some(p => permSet.has(`${p.module}:${p.action}`))) {
			return false
		}

		if (item.requiredPermissions.length === 0) return true
		return item.requiredPermissions.some(p => permSet.has(`${p.module}:${p.action}`))
	})
}
```

### 2. Blood Bank Technician Fix (Priority: Low)

Implemented. `laboratory:view` is now included for Blood Bank Technician in `seed-dev.ts` so the role receives Laboratory and Blood Bank navigation as required by the TOR.

```typescript
"Blood Bank Technician": [
	["adt", ["view"]],
	["orders", ["view", "edit"]],
	["laboratory", ["view"]], // Add this for Blood Bank nav access
],
```

---

## Conclusion

All reviewed roles now have sidebar access aligned with the TOR, with the Patients duplication intentionally removed for admin by keeping it only in the primary section.
