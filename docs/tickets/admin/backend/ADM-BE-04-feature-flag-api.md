# [ADM-BE-04] Feature Flag API

**Role:** Admin
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P1
**Story Refs:** Story 1.3 — Feature Flag and Module Configuration
**Flow Refs:** Flow A3

## Description

Provide a feature-flag service with environment scopes (Staging / Production) and per-module configuration values.

## Endpoints (oRPC)

- `admin.featureFlags.list` — grouped by module category from TOR §2.
- `admin.featureFlags.get`.
- `admin.featureFlags.set` — body: `{ flag, scope, value, reason }`.
- `admin.featureFlags.history` — diff log per flag.
- `admin.featureFlags.evaluate` — runtime endpoint used by other modules to read effective values for a given facility / scope.

## Acceptance Criteria

- [ ] Each `set` is wrapped in a transaction that writes the new value and an audit row in `feature_flag_history`.
- [ ] `evaluate` returns the resolved value with a documented precedence: facility-override > production > staging > default.
- [ ] An in-process cache (TTL 30s) reduces DB hits for `evaluate`; invalidated on `set`.
- [ ] Toggling the `Telemedicine` flag also propagates dependency rules (e.g., requires `auth.prc-enforced=true`); dependency rules are encoded in `master_data_items` per Story 20.2 to avoid hardcoding.
- [ ] Unit tests cover scope precedence, dependency propagation, and audit emission.
- [ ] All write endpoints require `admin.feature-flags.write` permission (ADM-BE-02 guard).

## Dependencies

- ADM-BE-01, ADM-BE-02.

## References

- USER_FLOWS.md §A3.
- USER_STORIES.md §1 Story 1.3.
- TOR §2 — Module catalogue.
