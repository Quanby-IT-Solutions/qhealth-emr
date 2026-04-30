# [AUD-BE-01] Auditor Domain — Module Architecture & Schema

**Role:** Auditor
**Layer:** Backend
**Category:** Planning & Architecture
**Priority:** P0
**Story Refs:** Story 1.6 — Audit Trail Review
**Flow Refs:** Flow A6

## Description

Plan the audit subsystem. The audit log is shared infrastructure — every other module (admin, billing, MSW, HIM, surveillance, plus all out-of-scope clinical roles) writes to it. The Auditor module owns the read-side query API and the break-glass review endpoints.

## Modules to Scaffold

```
apps/backend/src/modules/v1/auditor/
├── audit-log/             (Story 1.6 read API)
└── break-glass-review/    (Story 1.6 review actions)

apps/backend/src/common/audit/
├── audit.module.ts        (shared write API consumed by all modules)
└── audit.service.ts
```

## Schema Tables

| Table | Purpose | Source |
|-------|---------|--------|
| `audit_events` | id, ts, user_id, role, action_type, resource_type, resource_id, severity, ip, user_agent, outcome, payload_jsonb, content_hash | Story 1.6 |
| `audit_event_changes` | event_id, field_path, before_value, after_value | Story 1.6 |
| `break_glass_events` | event_id, clinician_id, patient_id, justification, access_window_start, access_window_end | Story 1.5 (TOR), Story 1.6 |
| `break_glass_reviews` | bg_event_id, reviewer_id, action (Approve / Flag / Note), reason, decided_at | Story 1.6 |
| `audit_exports` | exporter_id, range, content_hash, exported_at | Flow A6 export |

## Acceptance Criteria

- [ ] Auditor module folders exist with NestJS scaffolding.
- [ ] Shared `common/audit/` module exists with a write API used by every other module's services.
- [ ] All tables declared with appropriate indexes (especially on `ts`, `user_id`, `resource_type`, `resource_id`).
- [ ] Audit rows are append-only at the schema level (no UPDATE permission for application user; document the policy).
- [ ] Migrations apply cleanly.
- [ ] `pnpm lint && pnpm typecheck` clean.

## Dependencies

- ADM-BE-01.

## References

- USER_FLOWS.md §A5, §A6.
- USER_STORIES.md §1 Stories 1.5, 1.6.
- TOR §1, §4.2 — DPA, comprehensive audit trails.
