# [REG-FE-01] Registrar Frontend — Architecture & Route Map

**Role:** Registrar
**Layer:** Frontend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Story 2.6, Story 2.9
**Flow Refs:** Flow B6, Flow B7

## Description

Plan the route map, feature folders, and integration approach for Registrar discharge + gate-pass pages and Housekeeping confirmation pages. Decide reuse vs replace for the existing `DischargePanel`.

## Feature Folders

```
apps/web/features/
├── registrar/                     (NEW)
│   ├── api/                       (hooks: clearances, gate-pass, discharge)
│   ├── components/                (ClearanceChecklistCard, DeathClassificationBanner, …)
│   └── lib/                       (LOS formatting, classification helpers)
└── housekeeping/                  (NEW)
    ├── api/                       (mark-cleaned, queue, status-history hooks)
    ├── components/                (CleaningQueueList, MarkCleanedButton, BedStatusTimeline)
    └── lib/
```

## Route Map

| Route | Page | Notes |
|-------|------|-------|
| `/registrar/encounters/[encounterId]/discharge` | Discharge Processing Page | Extends existing flow at `apps/web/features/encounters/components/discharge-panel.tsx`. |
| `/registrar/encounters/[encounterId]/gate-pass` | Gate Pass Release Page | QR + printable receipt. |
| `/registrar/beds` | Bed Status Page | Filterable list + per-bed timeline drawer. |
| `/housekeeping/queue` | Housekeeping Confirmation Page | Mobile-first list of dirty beds. |
| `/housekeeping/beds/[bedId]` | Bed Detail (mobile) | Mark-cleaned action + recent history. |

## Reuse Decision — Discharge Panel

- The existing `discharge-panel.tsx` already handles May-Go-Home signing, disposition, and death-report alerting.
- **Extend** that component (do not replace) by composing in a new `<ClearanceChecklistCard />`, `<LengthOfStayDisplay />`, and `<DeathClassificationBanner />` from `features/registrar/components/`.
- Move the existing checklist's role-aware sign-off buttons (pharmacy/nurse/billing) into the new card so role-gated buttons live in one place.

## Navigation Updates

- Add Registrar nav group with "Discharge Queue", "Beds" entries.
- Add Housekeeping nav group with "Cleaning Queue" entry.
- Gate Pass page is reached via CTA on the Discharge Processing Page (no top-level nav entry).

## Acceptance Criteria

- [ ] Feature folders created with `api/`, `components/`, `lib/` subfolders.
- [ ] App routes scaffolded under `apps/web/app/(site)/registrar/` and `apps/web/app/(site)/housekeeping/` (page.tsx skeletons return a placeholder header).
- [ ] Nav groups appear for users with `registrar` or `housekeeping` role (gated via existing RBAC nav helper).
- [ ] Reuse decision documented in a one-paragraph note at the top of `features/registrar/README` (if README exists in similar features) or inline JSDoc on the new wrapper component.
- [ ] No business logic implemented — only routing skeletons and folder structure.

## Dependencies

- None (independent of backend work).

## References

- USER_FLOWS.md §B6, §B7
- USER_STORIES.md §2.6, §2.9
- Existing: `apps/web/features/encounters/components/discharge-panel.tsx`
