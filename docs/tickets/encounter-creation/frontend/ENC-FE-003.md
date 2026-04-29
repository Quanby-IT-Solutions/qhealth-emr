# ENC-FE-003 — Encounter List Page

**Status:** Open
**Type:** Frontend
**Priority:** Medium
**Depends on:** ENC-BE-001 (create endpoint must exist for data to show)

---

## Summary

Implement an encounter list page that shows all active encounters for a patient, sortable by date. Accessible from the patient profile.

---

## Scope

### Page Location

`apps/web/app/(site)/patients/[patientId]/encounters/page.tsx`

### Columns

| Column | Source |
|--------|--------|
| Encounter ID | `id` (truncated or formatted) |
| Type | `encounterType` → "OPD" / "ER" / "IPD" badge |
| Date | `admissionDatetime` (formatted: "Apr 29, 2026 10:30 AM") |
| Status | `status` → badge (`active`, `discharged`, `closed`, `cancelled`) |
| Attending | `attendingStaffName` or `clinicianStaffName` |
| Chief Complaint | `chiefComplaint` (truncated to 60 chars) |
| Queue # | `queueNumber` (OPD only, else "—") |

### Sorting

- Default: `admissionDatetime` descending (newest first)
- Allow toggling sort direction on Date column
- No other sortable columns required in v1

### Filtering

- Status filter: `All | Active | Discharged | Closed`
- Default: `Active` (shows only `status = 'active'`)

### Pagination

- 10 rows per page
- Use `useEncounterListQuery()` pagination params

### Row Action

- Click row → navigate to encounter detail page (existing)

---

## Technical Context

### Existing Files

- Hook: `apps/web/features/encounters/api/encounters.hooks.ts` → `useEncounterListQuery()`
- Contract list schema: `packages/contracts/src/modules/v1/encounters/encounters.schema.ts` → `EncounterListItemSchema`
- Existing encounter detail page: check `apps/web/app/(site)/` for patient routes

### EncounterListItem Fields

```typescript
// From EncounterListItemSchema:
id, encounterType, status, chiefComplaint, admissionDatetime,
attendingStaffName, clinicianStaffName, wardName, bedNumber, queueNumber
```

### Query Hook Usage

```typescript
const { data, isLoading } = useEncounterListQuery({
  patientId,
  status: filter,  // undefined | 'active' | 'discharged' | 'closed'
  page: currentPage,
  limit: 10,
  sortBy: 'admissionDatetime',
  sortOrder: sortDirection, // 'asc' | 'desc'
})
```

### Type Badge Colors

| Type | Badge Variant |
|------|--------------|
| OPD  | `secondary` (blue) |
| ER   | `destructive` (red) |
| IPD  | `default` (gray) |

### Status Badge Colors

| Status | Badge Variant |
|--------|--------------|
| active | `default` (green outline) |
| discharged | `secondary` |
| closed | `outline` |
| cancelled | `destructive` |

---

## Acceptance Criteria

- [ ] Page renders at `/patients/[patientId]/encounters`
- [ ] Default view shows `active` encounters only
- [ ] Status filter changes displayed rows
- [ ] Clicking date column header toggles asc/desc sort
- [ ] Pagination controls work (prev/next, page count)
- [ ] Empty state shown when no encounters match filter
- [ ] Loading skeleton shown while data fetches
- [ ] Clicking a row navigates to encounter detail
- [ ] Encounter type and status render as color-coded badges
- [ ] Queue number shows for OPD, "—" for ER/IPD
