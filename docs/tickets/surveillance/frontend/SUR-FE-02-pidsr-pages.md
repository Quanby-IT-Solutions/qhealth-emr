# [SUR-FE-02] Surveillance — PIDSR Alert Inbox & Submission Pages

**Role:** Surveillance
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 16.1 — PIDSR Notifiable Disease Detection
**Flow Refs:** Flow P1 (USER_FLOWS.md §P1)

## Description

Build the **PIDSR Alert Inbox** and **PIDSR Submission Page** from Flow P1. View system-flagged cases (syndromic keywords + ICD-10 matches), confirm or dismiss, and submit Cat-1 within 24h or Cat-2 weekly.

## Pages to Build

| Page | Route |
|------|-------|
| PIDSR Alert Inbox | `/surveillance/pidsr` |
| PIDSR Submission Page | `/surveillance/pidsr/[caseId]` |
| PIDSR Batch Submission Page | `/surveillance/pidsr/batch` |

## Functional Requirements (per Flow P1)

- Inbox columns: Case, Patient, Detection Source (Syndromic / ICD-10 / Both), Category (1 immediate / 2 weekly), Acuity, Time Remaining (countdown), Status.
- Filters: Category, Status (New, Confirmed, Dismissed, Submitted), Date Range, Disease.
- Submission Page: case summary, chart link drawer, CTA `Confirm` (transmits to DOH portal), CTA `Dismiss` (require reason).
- Batch Submission Page: select multiple Cat-2 cases for the weekly batch and transmit together.

## Acceptance Criteria

- [ ] Cat-1 cases display a destructive countdown chip when <6 hours remain to the 24h deadline.
- [ ] Detection source chip explains which keyword/code triggered the alert.
- [ ] Dismiss requires a reason and records it on the case.
- [ ] Submission shows a progress indicator while transmitting and a result banner (success / failure).
- [ ] Batch page enforces all selected cases are Cat-2.
- [ ] Transmission failure offers a retry CTA.
- [ ] Empty / loading / error states; URL-synced filters.

## Dependencies

- SUR-FE-01, ADM-FE-02.
- SUR-BE-02 (PIDSR detection + submission service) for live wiring.

## References

- USER_FLOWS.md §P1.
- USER_STORIES.md §16 Story 16.1.
- TOR §3 — PIDSR integration; Cat-1 immediate / Cat-2 weekly.
