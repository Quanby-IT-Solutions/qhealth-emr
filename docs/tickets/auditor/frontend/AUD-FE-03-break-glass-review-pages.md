# [AUD-FE-03] Auditor — Break-Glass Review Pages

**Role:** Auditor
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 1.6 — Audit Trail Review (break-glass branch)
**Flow Refs:** Flow A6 — section "For break-glass" (USER_FLOWS.md §A6) and Flow A5 (USER_FLOWS.md §A5) for context

## Description

Build the **Break-Glass Audit Report Page** from Flow A6 and the related actions: `Approve`, `Flag for Investigation`, `Add Note`, plus an export pathway for DPA compliance files.

## Pages to Build

| Page | Route |
|------|-------|
| Break-Glass Inbox | `/auditor/break-glass` |
| Break-Glass Audit Report | `/auditor/break-glass/[eventId]` |
| Add Note Drawer | overlay |
| Investigation Flag Drawer | overlay |

## Functional Requirements (per Flow A6 break-glass branch)

- Inbox columns: Timestamp, Clinician, Patient, Justification Reason, Access Window (start / end), Reviewer Action (Pending / Approved / Flagged), Severity.
- Pending events surface a destructive bell badge until reviewed.
- Report Page: full event detail (justification text, accessed resources timeline, IP, session id), reviewer actions (`Approve`, `Flag for Investigation`, `Add Note`), and a related-events section linking same-clinician break-glass history.
- Export DPA-compliance report (PDF) for a date range.

## Acceptance Criteria

- [ ] Pending events older than the configured review SLA (default 24h) show a destructive aging chip.
- [ ] `Approve`, `Flag`, and `Add Note` actions all require the auditor to enter a reason.
- [ ] All review actions write a row that is visible in the audit log itself (auditor actions are auditable).
- [ ] Report Page lists every resource accessed during the break-glass session with timestamps.
- [ ] Same-clinician history is collapsible and shows count + last 5 events with quick links.
- [ ] PDF export is signed (content hash) and stored for download.
- [ ] Read-only banner remains visible.

## Dependencies

- AUD-FE-01, AUD-FE-02, ADM-FE-02.
- AUD-BE-03 (break-glass review service) for live wiring.

## References

- USER_FLOWS.md §A5, §A6.
- USER_STORIES.md §1 Story 1.6.
- TOR §1 — Break-Glass Clinician (specialized audit log) and Auditor / Privacy Officer.
- TOR §4.2 — DPA compliance.
