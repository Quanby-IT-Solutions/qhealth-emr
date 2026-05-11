# [REG-FE-02] Registrar Frontend — Design Patterns & Shared Components

**Role:** Registrar
**Layer:** Frontend
**Category:** Frontend Design & UI/UX
**Priority:** P0
**Story Refs:** Story 2.6, Story 2.9
**Flow Refs:** Flow B6, Flow B7

## Description

Define the reusable component patterns, Shadcn primitives, responsive rules, print stylesheet, and accessibility baseline used across the Registrar and Housekeeping pages.

## Components to Define

| Component | Location | Purpose |
|-----------|----------|---------|
| `ClearanceChecklistCard` | `features/registrar/components/` | Shows three rows (pharmacy / nurse / billing) with status badge + role-gated sign-off button. |
| `LengthOfStayDisplay` | `features/registrar/components/` | Reads `admissionDatetime` + current time (or `dischargeDatetime` if discharged) and renders `Nd Nh Nm`. |
| `DeathClassificationBanner` | `features/registrar/components/` | Renders Gross / Net banner with tooltip explaining the ≤48h rule. Only visible when disposition is `deceased`. |
| `GatePassQRCard` | `features/registrar/components/` | Renders QR via `<img src="/api/v1/gate-passes/:id/qr.png">` with print-safe sizing. |
| `BedStatusTimeline` | `features/housekeeping/components/` | Vertical timeline of bed status transitions. |
| `MarkCleanedButton` | `features/housekeeping/components/` | Large CTA with confirm dialog, optimistic update, toast. |

## Shadcn Primitives To Use

- `Card`, `Badge`, `Button`, `Alert`, `Separator`, `Dialog`, `Tooltip`, `Skeleton`.
- Reuse the existing `Alert` patterns from `discharge-panel.tsx` for consistency.

## Responsive Rules

- Discharge Processing Page: desktop-first (registrar workstations); collapses to single column ≤ md.
- Housekeeping pages: mobile-first. Minimum tap target 44×44. Sticky bottom CTA for `Mark Cleaned`.
- Gate Pass Release Page: must print correctly on A5 thermal-receipt and A4. Use a dedicated print stylesheet (`@media print`) that hides nav + chrome and centers the QR.

## Accessibility

- All status badges include text, not just color.
- QR card includes a fallback `aria-label` describing the encounter and instructions for staff.
- Dialogs trap focus and restore on close.
- Color-contrast ≥ 4.5:1 for clearance status badges.

## Loading / Empty / Error States

- Every component must render Skeleton during query loading.
- Empty states for cleaning queue: friendly "All beds clean — nothing to do" panel.
- Error states show a `<Alert variant="destructive">` with retry button.

## Acceptance Criteria

- [ ] Each component listed exists as a stub file under its target folder with prop types defined.
- [ ] Storybook (if present in repo) or a `__demo__` route shows each component in default + loading + empty + error states.
- [ ] Print preview of the Gate Pass page renders without nav/footer, QR visible.
- [ ] Mobile breakpoint for `MarkCleanedButton` shows a fixed-bottom 56px-tall CTA.
- [ ] Axe-core lint clean on the new components.
- [ ] All status text uses translated strings via the existing i18n setup (if one exists; otherwise plain strings).

## Dependencies

- REG-FE-01 (folders + routes scaffolded).

## References

- USER_FLOWS.md §B6, §B7
- USER_STORIES.md §2.6, §2.9
- Tailwind size-* rule (`apps/web/CLAUDE.md` / project rules)
