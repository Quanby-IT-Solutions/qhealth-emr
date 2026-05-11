# [REG-FE-06] Housekeeping Confirmation Page

**Role:** Registrar (consumes Housekeeping role)
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 2.9
**Flow Refs:** Flow B7 steps 4–7

## Description

Build the mobile-first Housekeeping Confirmation Page that lists beds in `dirty_for_cleaning` and lets housekeeping staff tap "Mark Cleaned" to transition each bed back to `available`.

## Page Routes

| Route | Page |
|-------|------|
| `/housekeeping/queue` | Cleaning queue list (default housekeeping landing). |
| `/housekeeping/beds/[bedId]` | Bed detail with mark-cleaned CTA and recent transition history. |

## Functional Requirements

- Queue list: card per bed showing ward, bed label, time-since-dirtied, dirtied-by-encounter (only if user has `beds.view`).
- Sort ascending by `dirtiedAt` so the oldest dirty bed is on top.
- Each card has a primary `Mark Cleaned` button (`MarkCleanedButton` from REG-FE-02) with a confirm dialog: "Confirm bed BED-101 is cleaned and ready?".
- On confirmation, fire `useMarkBedCleanedMutation`. Optimistic UI removes the bed from the list immediately; on error, restore and toast.
- Detail page mirrors the card UI plus the recent status timeline.
- Subscribe to the `housekeeping` notifications topic (REG-BE-06) to live-add newly dirtied beds to the top of the list.

## Mobile / Touch Rules

- Tap targets ≥ 44×44.
- Sticky bottom CTA on the detail page.
- Pull-to-refresh on the list view (best-effort; use existing TanStack Query refetch on focus as fallback).

## Acceptance Criteria

- [ ] Only users with `housekeeping` role can reach these routes (RBAC nav + page-level guard).
- [ ] Queue list updates live when a new bed dirties (verified by triggering a backend discharge in a second tab).
- [ ] Mark-cleaned action removes the bed optimistically and shows a success toast.
- [ ] On API error, the bed reappears and a destructive toast is shown.
- [ ] Detail page timeline renders with proper ordering and accessible labels.
- [ ] Lighthouse mobile a11y score ≥ 95 for `/housekeeping/queue`.

## Dependencies

- REG-FE-01, REG-FE-02
- REG-BE-05 (`mark-cleaned`, `cleaning-queue`)
- REG-BE-06 (notifications topic)
- REG-FE-07 (hooks)

## References

- USER_FLOWS.md §B7 steps 4–7
- USER_STORIES.md §2.9
