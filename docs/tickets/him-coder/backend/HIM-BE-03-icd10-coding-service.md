# [HIM-BE-03] ICD-10 Coding Service

**Role:** HIM Coder
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 15.2 — ICD-10 Coding
**Flow Refs:** Flow O2

## Description

Persist primary and secondary ICD-10 assignments per encounter; enforce versioning and signing; provide validation against AHSR Top-10 rules. Upstream consumers: CF4 (BIL-BE-04), CF5 (BIL-BE-05), AHSR (SUR-BE-03).

## Endpoints (oRPC)

- `him.coding.list` — by encounter.
- `him.coding.upsert` — replace primary + secondary set; validation runs first.
- `him.coding.sign` — locks the current version for billing.
- `him.coding.amend` — creates a new version (only after sign).
- `him.coding.validate` — returns warnings (AHSR Top-10 alignment, deprecated codes, missing source).

## Functional Requirements

- Each row references its source diagnosis (note id, problem-list id, or explanatory note).
- Sign is transactional: writes the signed version, updates encounter status, emits `coding.signed` event.
- Amend creates a new version row; the prior version is preserved with `replaced_at` timestamp.
- Validation uses ADM-BE-08 (terminology) to detect deprecated codes.

## Acceptance Criteria

- [ ] Sign requires at least one Primary code.
- [ ] Validation flags deprecated codes and offers replacements; signing is blocked on deprecated codes.
- [ ] Amend writes a new version preserving history.
- [ ] Endpoints require `him.coding.read|write` permissions.
- [ ] `coding.signed` event is consumed by BIL-BE-04 to enable CF4 generation.
- [ ] Unit tests cover sign, amend, validation, deprecated detection.

## Dependencies

- HIM-BE-01, ADM-BE-08.

## References

- USER_FLOWS.md §O2.
- USER_STORIES.md §15 Story 15.2.
- TOR §1, §3.
